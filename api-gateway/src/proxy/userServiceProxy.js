const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5001';

export async function forwardLogin(payload) {
  let response;
  try {
    response = await fetch(`${userServiceUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    return { status: 502, body: { code: 'USER_SERVICE_UNAVAILABLE', message: 'User Service is unavailable.' } };
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardRegister(payload) {
  let response;
  try {
    response = await fetch(`${userServiceUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    return { status: 502, body: { code: 'USER_SERVICE_UNAVAILABLE', message: 'User Service is unavailable.' } };
  }
  const body = await response.json();
  return { status: response.status, body };
}

