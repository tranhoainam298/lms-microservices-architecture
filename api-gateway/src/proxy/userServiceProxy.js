const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5001';

export async function forwardLogin(payload, clientIp, userAgent) {
  let response;
  const headers = {
    'Content-Type': 'application/json'
  };
  if (clientIp) {
    headers['X-Forwarded-For'] = clientIp;
  }
  if (userAgent) {
    headers['User-Agent'] = userAgent;
  }

  try {
    response = await fetch(`${userServiceUrl}/auth/login`, {
      method: 'POST',
      headers,
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

async function forwardUserRequest(path, { method = 'GET', authorizationHeader, payload } = {}) {
  let response;
  try {
    response = await fetch(`${userServiceUrl}${path}`, {
      method,
      headers: {
        'Accept': 'application/json',
        ...(payload !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      },
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {})
    });
  } catch (cause) {
    return { status: 502, body: { code: 'USER_SERVICE_UNAVAILABLE', message: 'User Service is unavailable.' } };
  }
  const body = await response.json();
  return { status: response.status, body };
}

export const forwardGetOwnProfile = authorizationHeader =>
  forwardUserRequest('/users/me', { authorizationHeader });

export const forwardUpdateOwnProfile = (payload, authorizationHeader) =>
  forwardUserRequest('/users/me', { method: 'PATCH', payload, authorizationHeader });

export const forwardChangeOwnPassword = (payload, authorizationHeader) =>
  forwardUserRequest('/users/me/password', { method: 'PATCH', payload, authorizationHeader });

export function forwardListUsers(query, authorizationHeader) {
  const params = new URLSearchParams();
  for (const key of ['page', 'pageSize', 'role', 'status', 'search']) {
    if (query[key] !== undefined) params.set(key, String(query[key]));
  }
  const suffix = params.size ? `?${params}` : '';
  return forwardUserRequest(`/users/admin/users${suffix}`, { authorizationHeader });
}

export const forwardUpdateUserStatus = (userId, payload, authorizationHeader) =>
  forwardUserRequest(`/users/admin/users/${userId}/status`, { method: 'PATCH', payload, authorizationHeader });

export const forwardUpdateUserRole = (userId, payload, authorizationHeader) =>
  forwardUserRequest(`/users/admin/users/${userId}/role`, { method: 'PATCH', payload, authorizationHeader });

export function forwardGetLoginActivity(query, authorizationHeader) {
  const params = new URLSearchParams();
  for (const key of ['page', 'pageSize', 'status', 'dateFrom', 'dateTo']) {
    if (query[key] !== undefined) params.set(key, String(query[key]));
  }
  const suffix = params.size ? `?${params}` : '';
  return forwardUserRequest(`/users/admin/reports/activity${suffix}`, { authorizationHeader });
}

