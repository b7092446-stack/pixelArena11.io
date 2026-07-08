const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['purchase','payment','image_approved','security','announcement','system'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  read: { type: Boolean, default: false },
  readAt: Date,
  channels: { email: { type: Boolean, default: false }, browser: { type: Boolean, default: true } }
}, { timestamps: true });
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', notificationSchema);
