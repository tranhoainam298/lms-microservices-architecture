const examServiceUrl = process.env.EXAM_SERVICE_URL || 'http://localhost:5003';

export async function forwardExamRequest(req) {
  const path = req.originalUrl; // Keep the original path like /quizzes/ping
  const method = req.method;
  
  const headers = { ...req.headers };
  // Remove host header to avoid conflicts
  delete headers.host;
  
  const options = {
    method,
    headers,
  };
  
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(req.body);
  }

  const response = await fetch(`${examServiceUrl}${path}`, options);
  
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
