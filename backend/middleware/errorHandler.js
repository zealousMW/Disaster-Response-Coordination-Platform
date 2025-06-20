// src/middleware/errorHandler.js


import { logger } from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  logger.error(message, {
    status: statusCode,
    stack: err.stack,
    method: req.method,
  });

  res.status(
    
  ).json({
    error: {
      message: message,
      status: statusCode,
    },
  });
};