import { logger } from '../config/logger.js';
import { createErrorResponse } from '../utils/error.js';

export function errorHandler(err, req, res, _next) {
  logger.error({
    requestId: req.requestId,
    method: req.method,
    route: req.originalUrl,
    err: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  }, 'Unhandled request error');

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred.';

  return res.status(statusCode).json(createErrorResponse(code, message));
}
