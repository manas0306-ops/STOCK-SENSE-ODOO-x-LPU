const { sendError } = require('../utils/response');

function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    let detail = 'Duplicate field value entered';
    if (err.detail && err.detail.includes('Key (email)=')) {
      detail = 'An account with this email address already exists';
    } else if (err.detail && err.detail.includes('Key (sku)=')) {
      detail = 'A product with this SKU already exists';
    } else if (err.detail && err.detail.includes('Key (reference_no)=')) {
      detail = 'A document with this reference number already exists';
    }
    return sendError(res, detail, 409, 'DUPLICATE_KEY_ERROR');
  }

  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    return sendError(res, 'Database check constraint failed: Invalid value or condition', 400, 'CHECK_CONSTRAINT_ERROR');
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return sendError(res, 'Referenced resource does not exist', 400, 'FOREIGN_KEY_VIOLATION');
  }

  // Custom AppError
  if (err.isOperational) {
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // Default fallback
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return sendError(res, message, 500, 'INTERNAL_SERVER_ERROR');
}

module.exports = errorHandler;
