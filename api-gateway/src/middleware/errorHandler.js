export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = error.status || 500;
  res.status(status).json({
    code: error.code || 'API_GATEWAY_ERROR',
    message: status === 500 ? 'The API Gateway could not process the request.' : error.message
  });
}
