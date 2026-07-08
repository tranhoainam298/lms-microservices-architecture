const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';

export async function forwardLogin(payload) {
  let response;

  try {
    response = await fetch(`${userServiceUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    const error = new Error('User Service is unavailable.');
    error.status = 502;
    error.code = 'USER_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }

  const body = await response.json();
  return { status: response.status, body };
}
