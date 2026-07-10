const examServiceUrl = process.env.EXAM_SERVICE_URL || 'http://localhost:5003';

export async function forwardExamRequest(req) {
  const path = req.originalUrl;
  const method = req.method;
  
  const headers = {
    Accept: 'application/json',
    Authorization: req.headers.authorization,
    ...(req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] } : {})
  };
  
  const options = {
    method,
    headers,
  };
  
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(req.body);
  }

  let response;
  try {
    response = await fetch(`${examServiceUrl}${path}`, options);
  } catch {
    return { status: 502, body: { code: 'EXAM_SERVICE_UNAVAILABLE', message: 'Exam Service is unavailable.' } };
  }
  
  const body = await response.text();
  let jsonBody;
  try {
    jsonBody = JSON.parse(body);
  } catch (e) {
    jsonBody = body;
  }
  
  return {
    status: response.status,
    body: jsonBody
  };
}
