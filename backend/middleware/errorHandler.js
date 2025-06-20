// src/middleware/errorHandler.js


import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  logger.error(message, {
    status: statusCode,
    stack: err.stack,
    method: req.method,
  });

  res.status(statusCode).json({
    error: {
      message: message,
      status: statusCode,
    },
  });
};