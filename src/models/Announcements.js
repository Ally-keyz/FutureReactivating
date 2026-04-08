const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    body: {
      type: String,
      required: [true, 'Body is required'],
      trim: true,
      maxlength: [2000, 'Body cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'promo', 'maintenance'],
      default: 'info',
    },
    emoji: {
      type: String,
      default: '📢',
      maxlength: 10,
    },
    // When the announcement becomes visible to users (default: now)
    startsAt: {
      type: Date,
      default: Date.now,
    },
    // When the announcement automatically disappears
    expiresAt: {
      type: Date,
      required: [true, 'expiresAt is required'],
      validate: {
        validator(v) {
          return v > (this.startsAt || Date.now());
        },
        message: 'expiresAt must be after startsAt',
      },
    },
    // Soft delete / manual hide by admin
    isActive: {
      type: Boolean,
      default: true,
    },
    // Which admin created it
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    // Optional: pin to top of list
    isPinned: {
      type: Boolean,
      default: false,
    },
    // Optional CTA link
    ctaLabel: { type: String, default: '' },
    ctaUrl:   { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: is the announcement currently live?
announcementSchema.virtual('isLive').get(function () {
  const now = Date.now();
  return (
    this.isActive &&
    this.startsAt.getTime() <= now &&
    this.expiresAt.getTime() > now
  );
});

// Index for efficient "live" queries
announcementSchema.index({ expiresAt: 1, isActive: 1, startsAt: 1 });
announcementSchema.index({ isPinned: -1, startsAt: -1 });

const Announcement = mongoose.model('Announcement', announcementSchema);
module.exports = Announcement;