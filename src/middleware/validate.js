const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const grouped = {};
    errors.array().forEach(e => {
      if (!grouped[e.path]) grouped[e.path] = [];
      grouped[e.path].push(e.msg);
    });
    return error(res, 'Validation failed', 422, grouped);
  }
  next();
};

module.exports = validate;
