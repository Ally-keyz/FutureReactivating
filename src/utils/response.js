const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const error = (res, message = 'An error occurred', statusCode = 400, errors = {}) => {
  return res.status(statusCode).json({ success: false, message, errors });
};

module.exports = { success, error };
