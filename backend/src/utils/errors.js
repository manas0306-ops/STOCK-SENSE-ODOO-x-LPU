class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class InsufficientStockError extends AppError {
  constructor(available, requested, unit = 'Units') {
    super(
      `Insufficient stock. Available: ${available} ${unit}, Requested: ${requested} ${unit}`,
      400,
      'INSUFFICIENT_STOCK'
    );
    this.available = available;
    this.requested = requested;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 422, 'VALIDATION_ERROR');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

module.exports = {
  AppError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
};
