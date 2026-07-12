import http from 'node:http';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.PORT) || 8080;

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = async (req) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, { status: 'ok', system: 'external-payment-gateway-mock' });
    }
    if (req.method === 'POST' && req.url === '/payments/create') {
      const body = await readBody(req);
      if (!body.paymentId || !body.courseId || !Number.isFinite(Number(body.amount))) {
        return sendJson(res, 400, { code: 'INVALID_MOCK_PAYMENT', message: 'Mock payment data is invalid.' });
      }
      const providerTransactionId = `MOCK-${randomUUID()}`;
      return sendJson(res, 201, {
        status: 'pending',
        provider: body.provider,
        providerTransactionId,
        paymentUrl: `mock-payment://complete/${providerTransactionId}`
      });
    }
    if (req.method === 'POST' && req.url === '/payments/complete') {
      const body = await readBody(req);
      if (typeof body.providerTransactionId !== 'string' || !body.providerTransactionId.startsWith('MOCK-')) {
        return sendJson(res, 404, { code: 'MOCK_PAYMENT_NOT_FOUND', message: 'The mock payment was not found.' });
      }
      return sendJson(res, 200, { status: 'success', providerTransactionId: body.providerTransactionId });
    }
    return sendJson(res, 404, { code: 'NOT_FOUND', message: 'Mock payment endpoint not found.' });
  } catch {
    return sendJson(res, 400, { code: 'INVALID_JSON', message: 'The mock payment payload is invalid.' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`External payment gateway mock listening on port ${port}`);
});
