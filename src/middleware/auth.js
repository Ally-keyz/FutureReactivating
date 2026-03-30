const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const Admin = require('../models/Admin');
const { error } = require('../utils/response');

const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return error(res, 'Unauthenticated', 401);

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub)
      .select('-passwordHash -withdrawPinHash').lean();
    if (!user) return error(res, 'User not found', 401);
    req.user = user;
    next();
  } catch {
    return error(res, 'Invalid or expired token', 401);
  }
};

const protectAdmin = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return error(res, 'Unauthenticated', 401);

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    const admin = await Admin.findById(payload.sub).select('-passwordHash').lean();
    if (!admin) return error(res, 'Admin not found', 401);
    req.admin = admin;
    next();
  } catch {
    return error(res, 'Unauthorized', 401);
  }
};

module.exports = { protect, protectAdmin };
