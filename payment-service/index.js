import express from 'express';
import amqp from 'amqplib';
import mysql from 'mysql2/promise';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}
if (!process.env.INTERNAL_SERVICE_SECRET) {
  console.error('FATAL ERROR: INTERNAL_SERVICE_SECRET is not defined.');
  process.exit(1);
}

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004;
const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost:5672';
const COURSE_SERVICE_URL = process.env.COURSE_SERVICE_URL || 'http://localhost:5002';
const EXCHANGE_NAME = 'lms_events';
const ZALOPAY_CREATE_URL = process.env.ZALOPAY_CREATE_URL || 'https://sb-openapi.zalopay.vn/v2/create';
const ZALOPAY_QUERY_URL = process.env.ZALOPAY_QUERY_URL || 'https://sb-openapi.zalopay.vn/v2/query';
const ZALOPAY_REDIRECT_URL = process.env.ZALOPAY_REDIRECT_URL || 'http://localhost:8080/payment-return';
const ZALOPAY_CALLBACK_URL = process.env.ZALOPAY_CALLBACK_URL || 'http://localhost:8080/api/payments/callback/zalopay';
const COURSE_PRICE_TO_VND_RATE = Number(process.env.COURSE_PRICE_TO_VND_RATE || 25000);

let channel;
let pool;

async function init() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3309,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'lms_payment_db',
  });
  await pool.query('SELECT 1');
  console.log('Connected to Payment DB');

  try {
    const connection = await amqp.connect(AMQP_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    console.log('Connected to RabbitMQ (Payment Service)');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error.message);
    channel = null;
  }
}

function parsePositiveInteger(value) {
  const text = String(value);
  const parsed = Number(text);
  return /^[1-9]\d*$/.test(text) && Number.isSafeInteger(parsed) ? parsed : null;
}

function authenticateStudent(req, res, next) {
  const authorization = req.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authorization token is required.' });
  }
  try {
    const token = authorization.slice(7);
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Malformed token');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (header.alg !== 'HS256') throw new Error('Unsupported algorithm');
    const expectedSignature = createHmac('sha256', process.env.JWT_SECRET)
      .update(`${parts[0]}.${parts[1]}`)
      .digest();
    const actualSignature = Buffer.from(parts[2], 'base64url');
    if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) {
      throw new Error('Invalid signature');
    }
    if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new Error('Expired token');
    }
    const studentId = parsePositiveInteger(payload.id ?? payload.sub);
    const role = String(payload.role || '').trim().toLowerCase();
    if (!studentId || !role) throw new Error('Missing claims');
    if (role !== 'student') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only students can purchase courses.' });
    }
    req.user = { id: studentId, role };
    next();
  } catch {
    return res.status(401).json({ code: 'INVALID_TOKEN', message: 'The access token is invalid or expired.' });
  }
}

async function readJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return {}; }
}

function getZaloPayConfig() {
  const values = {
    appId: process.env.ZALOPAY_APP_ID,
    key1: process.env.ZALOPAY_KEY1,
    key2: process.env.ZALOPAY_KEY2
  };
  const missing = Object.entries(values)
    .filter(([, value]) => !value || String(value).startsWith('your_sandbox_'))
    .map(([name]) => `ZALOPAY_${name === 'appId' ? 'APP_ID' : name.toUpperCase()}`);
  if (missing.length > 0) {
    const error = new Error('ZaloPay Sandbox is not configured.');
    error.status = 503;
    error.code = 'ZALOPAY_NOT_CONFIGURED';
    throw error;
  }
  if ((process.env.ZALOPAY_ENV || 'sandbox').toLowerCase() !== 'sandbox') {
    const error = new Error('Only ZaloPay Sandbox is allowed.');
    error.status = 503;
    error.code = 'ZALOPAY_ENV_INVALID';
    throw error;
  }
  for (const endpoint of [ZALOPAY_CREATE_URL, ZALOPAY_QUERY_URL]) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.hostname !== 'sb-openapi.zalopay.vn') {
      const error = new Error('Only ZaloPay Sandbox endpoints are allowed.');
      error.status = 503;
      error.code = 'ZALOPAY_ENDPOINT_INVALID';
      throw error;
    }
  }
  return values;
}

function hmacSha256(data, key) {
  return createHmac('sha256', key).update(data).digest('hex');
}

function createAppTransId(paymentId) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: '2-digit', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const getPart = (type) => parts.find(part => part.type === type)?.value;
  const datePrefix = `${getPart('year')}${getPart('month')}${getPart('day')}`;
  return `${datePrefix}_${paymentId}_${Date.now().toString(36)}_${randomBytes(2).toString('hex')}`;
}

function convertCoursePriceToVnd(coursePrice) {
  if (!Number.isFinite(COURSE_PRICE_TO_VND_RATE) || COURSE_PRICE_TO_VND_RATE <= 0) {
    const error = new Error('Course currency conversion is not configured.');
    error.status = 503;
    error.code = 'COURSE_PRICE_CONVERSION_INVALID';
    throw error;
  }
  const amount = Math.round(Number(coursePrice) * COURSE_PRICE_TO_VND_RATE);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    const error = new Error('The converted course price is invalid.');
    error.status = 502;
    error.code = 'COURSE_PRICE_INVALID';
    throw error;
  }
  return amount;
}

async function postZaloPayForm(url, params) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    const error = new Error('ZaloPay Sandbox is unavailable.');
    error.status = 502;
    error.code = 'ZALOPAY_UNAVAILABLE';
    throw error;
  }
  const body = await readJson(response);
  if (!response.ok) {
    const error = new Error('ZaloPay Sandbox rejected the request.');
    error.status = 502;
    error.code = 'ZALOPAY_REQUEST_FAILED';
    throw error;
  }
  return body;
}

async function getPurchasableCourse(courseId) {
  let response;
  try {
    response = await fetch(`${COURSE_SERVICE_URL}/courses/internal/purchasable/${courseId}`, {
      headers: { 'x-internal-service-secret': process.env.INTERNAL_SERVICE_SECRET }
    });
  } catch {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    throw error;
  }
  const body = await readJson(response);
  if (!response.ok) {
    const error = new Error(body.message || 'The course is not available for purchase.');
    error.status = response.status;
    error.code = body.code || 'COURSE_NOT_AVAILABLE';
    throw error;
  }
  return body.course;
}

async function activateCourseAccess(studentId, courseId) {
  let response;
  try {
    response = await fetch(`${COURSE_SERVICE_URL}/courses/internal/enrollments/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-secret': process.env.INTERNAL_SERVICE_SECRET
      },
      body: JSON.stringify({ studentId, courseId })
    });
  } catch {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    throw error;
  }
  const body = await readJson(response);
  if (!response.ok) {
    const error = new Error(body.message || 'Course access could not be activated.');
    error.status = response.status >= 500 ? 502 : response.status;
    error.code = body.code || 'ENROLLMENT_ACTIVATION_FAILED';
    throw error;
  }
  return body.enrollment;
}

function normalizePayment(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    amount: Number(row.amount),
    currency: 'VND',
    status: row.status,
    provider: row.gateway,
    appTransId: row.gateway_transaction_id,
    createdAt: row.created_at
  };
}

async function finalizePaidPayment(transaction) {
  await pool.execute(`UPDATE transactions SET status = 'success' WHERE id = ?`, [transaction.id]);
  let enrollment;
  try {
    enrollment = await activateCourseAccess(transaction.student_id, transaction.course_id);
  } catch (error) {
    error.status = 502;
    error.code = 'PAYMENT_PAID_ENROLLMENT_PENDING';
    error.message = 'ZaloPay confirmed payment, but course access is pending. Check status again.';
    throw error;
  }
  const [rows] = await pool.execute(`SELECT * FROM transactions WHERE id = ? LIMIT 1`, [transaction.id]);
  return { payment: normalizePayment(rows[0]), enrollment };
}

function callbackMacIsValid(data, providedMac, key2) {
  const expectedMac = hmacSha256(data, key2);
  const provided = String(providedMac || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(provided)) return false;
  const expectedBuffer = Buffer.from(expectedMac, 'hex');
  const providedBuffer = Buffer.from(provided, 'hex');
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

app.post('/payments/checkout', authenticateStudent, async (req, res, next) => {
  try {
    const courseId = parsePositiveInteger(req.body?.courseId);
    if (!courseId) {
      return res.status(400).json({ code: 'INVALID_COURSE_ID', message: 'Course ID must be a positive integer.' });
    }
    const provider = String(req.body?.paymentMethod || 'zalopay').trim().toLowerCase();
    if (provider !== 'zalopay') {
      return res.status(400).json({ code: 'INVALID_PAYMENT_METHOD', message: 'Only ZaloPay Sandbox is available.' });
    }

    const zaloPay = getZaloPayConfig();
    const course = await getPurchasableCourse(courseId);
    const amount = convertCoursePriceToVnd(Number(course.price));
    const [insertResult] = await pool.execute(
      `INSERT INTO transactions (student_id, course_id, amount, status, gateway)
       VALUES (?, ?, ?, 'pending', ?)`,
      [req.user.id, courseId, amount, provider]
    );
    const appTransId = createAppTransId(insertResult.insertId);
    await pool.execute(`UPDATE transactions SET gateway_transaction_id = ? WHERE id = ?`, [appTransId, insertResult.insertId]);

    const appTime = Date.now();
    const embedData = JSON.stringify({
      redirecturl: ZALOPAY_REDIRECT_URL,
      courseId: String(courseId),
      paymentId: String(insertResult.insertId),
      studentId: String(req.user.id)
    });
    const item = JSON.stringify([{
      itemid: `course_${courseId}`,
      itemname: String(course.title).slice(0, 255),
      itemprice: amount,
      itemquantity: 1
    }]);
    const macRaw = [zaloPay.appId, appTransId, String(req.user.id), amount, appTime, embedData, item].join('|');
    const mac = hmacSha256(macRaw, zaloPay.key1);
    let providerBody;
    try {
      providerBody = await postZaloPayForm(ZALOPAY_CREATE_URL, {
        app_id: zaloPay.appId,
        app_trans_id: appTransId,
        app_user: String(req.user.id),
        app_time: String(appTime),
        amount: String(amount),
        item,
        description: `LMS course payment - ${String(course.title).slice(0, 180)}`,
        embed_data: embedData,
        callback_url: ZALOPAY_CALLBACK_URL,
        mac
      });
    } catch (error) {
      await pool.execute(`UPDATE transactions SET status = 'failed' WHERE id = ?`, [insertResult.insertId]);
      throw error;
    }
    if (Number(providerBody.return_code) !== 1 || !providerBody.order_url) {
      await pool.execute(`UPDATE transactions SET status = 'failed' WHERE id = ?`, [insertResult.insertId]);
      const error = new Error('ZaloPay Sandbox could not create the order.');
      error.status = 502;
      error.code = 'ZALOPAY_CREATE_FAILED';
      throw error;
    }

    return res.status(201).json({
      payment: {
        id: insertResult.insertId,
        courseId,
        amount,
        currency: 'VND',
        status: 'pending',
        provider,
        appTransId,
        orderUrl: providerBody.order_url
      }
    });
  } catch (error) { next(error); }
});

app.get('/payments/:paymentId', authenticateStudent, async (req, res, next) => {
  try {
    const paymentId = parsePositiveInteger(req.params.paymentId);
    if (!paymentId) return res.status(400).json({ code: 'INVALID_PAYMENT_ID', message: 'Payment ID must be a positive integer.' });
    const [rows] = await pool.execute(`SELECT * FROM transactions WHERE id = ? LIMIT 1`, [paymentId]);
    if (rows.length === 0) return res.status(404).json({ code: 'PAYMENT_NOT_FOUND', message: 'The payment was not found.' });
    if (rows[0].student_id !== req.user.id) return res.status(403).json({ code: 'FORBIDDEN', message: 'You cannot access this payment.' });
    return res.status(200).json({ payment: normalizePayment(rows[0]) });
  } catch (error) { next(error); }
});

app.get('/payments/check-status/:appTransId', authenticateStudent, async (req, res, next) => {
  try {
    const appTransId = String(req.params.appTransId || '');
    if (!/^\d{6}_[A-Za-z0-9_]{1,33}$/.test(appTransId)) {
      return res.status(400).json({ code: 'INVALID_APP_TRANS_ID', message: 'The ZaloPay transaction ID is invalid.' });
    }
    const [rows] = await pool.execute(
      `SELECT * FROM transactions WHERE gateway = 'zalopay' AND gateway_transaction_id = ? LIMIT 1`,
      [appTransId]
    );
    if (rows.length === 0) return res.status(404).json({ code: 'PAYMENT_NOT_FOUND', message: 'The payment was not found.' });
    const transaction = rows[0];
    if (transaction.student_id !== req.user.id) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'You cannot check this payment.' });
    }
    if (transaction.status === 'success') {
      const completed = await finalizePaidPayment(transaction);
      return res.status(200).json({ success: true, paid: true, ...completed });
    }
    if (transaction.status === 'failed') {
      return res.status(200).json({ success: false, paid: false, payment: normalizePayment(transaction) });
    }

    const zaloPay = getZaloPayConfig();
    const macRaw = `${zaloPay.appId}|${appTransId}|${zaloPay.key1}`;
    const providerBody = await postZaloPayForm(ZALOPAY_QUERY_URL, {
      app_id: zaloPay.appId,
      app_trans_id: appTransId,
      mac: hmacSha256(macRaw, zaloPay.key1)
    });
    const returnCode = Number(providerBody.return_code);
    if (returnCode === 1) {
      if (providerBody.amount !== undefined && Number(providerBody.amount) !== Number(transaction.amount)) {
        const error = new Error('ZaloPay payment amount does not match the stored transaction.');
        error.status = 502;
        error.code = 'ZALOPAY_AMOUNT_MISMATCH';
        throw error;
      }
      const completed = await finalizePaidPayment(transaction);
      return res.status(200).json({ success: true, paid: true, ...completed });
    }
    if (returnCode === 2) {
      await pool.execute(`UPDATE transactions SET status = 'failed' WHERE id = ?`, [transaction.id]);
      const [failedRows] = await pool.execute(`SELECT * FROM transactions WHERE id = ? LIMIT 1`, [transaction.id]);
      return res.status(200).json({ success: false, paid: false, payment: normalizePayment(failedRows[0]) });
    }
    return res.status(200).json({ success: true, paid: false, payment: normalizePayment(transaction) });
  } catch (error) { next(error); }
});

app.post('/payments/callback/zalopay', async (req, res) => {
  try {
    const data = typeof req.body?.data === 'string' ? req.body.data : '';
    const providedMac = String(req.body?.mac || '').toLowerCase();
    if (!data || !/^[a-f0-9]{64}$/.test(providedMac)) {
      return res.status(200).json({ return_code: -1, return_message: 'MAC invalid' });
    }
    const zaloPay = getZaloPayConfig();
    if (!callbackMacIsValid(data, providedMac, zaloPay.key2)) {
      return res.status(200).json({ return_code: -1, return_message: 'MAC invalid' });
    }
    const callbackData = JSON.parse(data);
    const embedData = typeof callbackData.embed_data === 'string'
      ? JSON.parse(callbackData.embed_data)
      : callbackData.embed_data;
    const paymentId = parsePositiveInteger(embedData?.paymentId);
    const studentId = parsePositiveInteger(embedData?.studentId);
    const courseId = parsePositiveInteger(embedData?.courseId);
    const appTransId = String(callbackData.app_trans_id || '');
    if (!paymentId || !studentId || !courseId || !appTransId) {
      return res.status(200).json({ return_code: 0, return_message: 'Server error' });
    }
    const [rows] = await pool.execute(`SELECT * FROM transactions WHERE id = ? LIMIT 1`, [paymentId]);
    const transaction = rows[0];
    if (!transaction
      || String(callbackData.app_id) !== String(zaloPay.appId)
      || transaction.student_id !== studentId
      || transaction.course_id !== courseId
      || transaction.gateway_transaction_id !== appTransId
      || Number(callbackData.amount) !== Number(transaction.amount)) {
      return res.status(200).json({ return_code: 0, return_message: 'Server error' });
    }
    await finalizePaidPayment(transaction);
    return res.status(200).json({ return_code: 1, return_message: 'Success' });
  } catch (error) {
    console.error('ZaloPay callback failed:', error.message);
    return res.status(200).json({ return_code: 0, return_message: 'Server error' });
  }
});

app.post('/payments/mock/complete', (req, res) => {
  res.status(410).json({
    code: 'ENDPOINT_DEPRECATED',
    message: 'Mock completion is disabled. Use ZaloPay Sandbox checkout and status polling.'
  });
});

app.post('/payments/webhook/zalopay', (req, res) => {
  res.status(410).json({ code: 'ENDPOINT_DEPRECATED', message: 'Use POST /payments/callback/zalopay.' });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status >= 500) console.error('Payment request failed:', error.message);
  res.status(status).json({
    code: error.code || 'PAYMENT_SERVICE_ERROR',
    message: status === 500 ? 'The payment request could not be processed.' : error.message
  });
});

init()
  .then(() => app.listen(PORT, () => console.log(`Payment Service is running on port ${PORT}`)))
  .catch((error) => {
    console.error('Payment Service startup failed:', error.message);
    process.exit(1);
  });
