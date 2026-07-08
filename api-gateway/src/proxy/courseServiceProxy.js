const courseServiceUrl = process.env.COURSE_SERVICE_URL || 'http://localhost:3002';

export async function forwardCreateDraft(payload, authorization) {
  let response;

  try {
    response = await fetch(`${courseServiceUrl}/courses/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }

  const body = await response.json();
  return { status: response.status, body };
}
