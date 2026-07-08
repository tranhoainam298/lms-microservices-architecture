export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    code: 'COURSE_SERVICE_ERROR',
    message: 'The Course Service could not process the request.'
  });
}
