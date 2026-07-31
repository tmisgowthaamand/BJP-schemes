const logger = require('../config/logger');

// 404 handler for unmatched routes.
const notFound = (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl
  });
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    correlationId: req.requestId
  });
};

// Centralized error handler. Logs the full error (with stack) server-side and
// returns a generic message + correlation id to the client — internal details
// are never leaked to the caller.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  logger.error(err.message || 'Unhandled error', {
    status,
    method: req.method,
    url: req.originalUrl,
    stack: err.stack
  });

  if (res.headersSent) return next(err);

  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Something went wrong. Please try again later.' : err.message,
    correlationId: req.requestId
  });
};

module.exports = { notFound, errorHandler };
