'use strict';

const logger = require('../utils/logger');

/**
 * 404 handler — placed after all routes
 */
const notFound = (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Endpoint not found.' });
  }
  // For non-API 404s just send the SPA (already handled above, but safety net)
  res.status(404).json({ success: false, message: 'Not found.' });
};

/**
 * Global error handler — Express calls this with 4 args
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status  = err.status || err.statusCode || 500;
  const PROD    = process.env.NODE_ENV === 'production';

  // Don't log 4xx as errors — they're client mistakes
  if (status >= 500) {
    logger.error(`${req.method} ${req.path} → ${status}:`, err.message, err.stack);
  }

  const body = {
    success: false,
    message: (PROD && status === 500) ? 'An unexpected error occurred.' : (err.message || 'An error occurred.'),
  };

  if (!PROD && err.stack) body.stack = err.stack;

  res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
