function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function sendError(res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
  const response = {
    success: false,
    message,
    code,
  };
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }
  return res.status(statusCode).json(response);
}

module.exports = {
  sendSuccess,
  sendError,
};
