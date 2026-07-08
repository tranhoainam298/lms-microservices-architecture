export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    code: 'USER_SERVICE_ERROR',
    message: 'The User Service could not process the request.'
  });
}
