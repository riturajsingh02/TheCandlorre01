/**
 * THE Candlorre — API RESPONSE FORMATTERS
 * Standardized JSON envelope for all backend responses.
 */

export function sendSuccess(res, data = null, message = null, statusCode = 200) {
  const response = {
    success: true
  };
  if (message) response.message = message;
  if (data !== null) {
    if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0) {
      Object.assign(response, data);
    } else {
      response.data = data;
    }
  }
  return res.status(statusCode).json(response);
}

export function sendError(res, message = 'Request failed', statusCode = 400, code = 'REQUEST_ERROR', details = null) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(details ? { details } : {})
  });
}
