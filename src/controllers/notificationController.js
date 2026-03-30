const Notification = require('../models/Notification');
const { success, error } = require('../utils/response');

exports.index = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.unread === '1') filter.isRead = false;

    const [items, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ]);

    return success(res, { items, unreadCount });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true });
    return success(res, null, 'Marked as read');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.readAll = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id }, { isRead: true });
    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.destroy = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    return success(res, null, 'Notification dismissed');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
