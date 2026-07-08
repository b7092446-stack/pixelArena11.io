const mongoose = require('mongoose');

const pixelHistorySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  wallet: String,
  price: Number,
  txHash: String,
  purchasedAt: Date
}, { _id: false });

const pixelSchema = new mongoose.Schema({
  x: { type: Number, required: true, min: 0, max: 999 },
  y: { type: Number, required: true, min: 0, max: 999 },
  index: { type: Number, required: true, unique: true }, // y*1000 + x
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  wallet: { type: String, lowercase: true, default: null, index: true },
  team: { 
    type: String, 
    enum: ['football','basketball','f1','esports','celebrities','custom','global'],
    default: 'global',
    index: true
  },
  category: { type: String, default: 'global' },
  isSold: { type: Boolean, default: false, index: true },
  isReserved: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  price: { type: Number, default: 1 }, // USDT
  purchasedAt: Date,
  txHash: { type: String, unique: true, sparse: true, index: true },
  blockNumber: Number,
  confirmations: { type: Number, default: 0 },
  image: {
    url: String,
    publicId: String,
    thumbnailUrl: String,
    width: Number,
    height: Number,
    size: Number,
    format: String,
    uploadedAt: Date,
    moderated: { type: Boolean, default: false },
    approved: { type: Boolean, default: true }
  },
  link: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid URL'
    }
  },
  title: { type: String, maxlength: 60, trim: true },
  description: { type: String, maxlength: 280, trim: true },
  history: [pixelHistorySchema],
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  favoriteCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

pixelSchema.index({ x: 1, y: 1 }, { unique: true });
pixelSchema.index({ index: 1 }, { unique: true });
pixelSchema.index({ isSold: 1, team: 1 });
pixelSchema.index({ owner: 1, isSold: 1 });
pixelSchema.index({ purchasedAt: -1 });

pixelSchema.statics.coordToIndex = function(x, y) {
  return y * 1000 + x;
};

pixelSchema.statics.indexToCoord = function(index) {
  return { x: index % 1000, y: Math.floor(index / 1000) };
};

module.exports = mongoose.model('Pixel', pixelSchema);
