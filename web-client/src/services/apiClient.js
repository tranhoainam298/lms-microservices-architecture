import { apiUrl } from '../config/api';

export class ApiError extends Error {
  constructor(message, { status, code, body } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export function buildQuery(values = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(key, String(value).trim());
    }
  });
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export async function apiRequest(path, { accessToken, body, headers, ...options } = {}) {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(headers || {})
      },
      ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('The application could not connect. Please try again.', { code: 'NETWORK_ERROR' });
  }

  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(responseBody.message || 'The requested information could not be loaded.', {
      status: response.status,
      code: responseBody.code,
      body: responseBody
    });
  }
  return responseBody;
}
