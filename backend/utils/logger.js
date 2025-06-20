// A very simple structured logger
export const logger = {
  log: (level, message, context = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };
    console.log(JSON.stringify(logEntry));
  },
  info: (message, context) => {
    logger.log('info', message, context);
  },
  warn: (message, context) => {
    logger.log('warn', message, context);
  },
  error: (message, context) => {
    logger.log('error', message, context);
  },
};