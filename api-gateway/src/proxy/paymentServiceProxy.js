const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004';

export async function forwardPaymentRequest(req) {
  const headers = {
    Accept: 'application/json',
    ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
    ...(req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] } : {})
  };
  const options = { method: req.method, headers };

  if (!['GET', 'HEAD'].includes(req.method)) {
    options.body = JSON.stringify(req.body ?? {});
  }

  let response;
  try {
    response = await fetch(`${paymentServiceUrl}${req.originalUrl}`, options);
  } catch {
    return {
      status: 502,
      body: { code: 'PAYMENT_SERVICE_UNAVAILABLE', message: 'Payment Service is unavailable.' }
    };
  }

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, body };
}
