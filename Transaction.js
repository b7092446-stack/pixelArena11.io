const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  wallet: { type: String, required: true, lowercase: true, index: true },
  txHash: { type: String, required: true, unique: true, lowercase: true, index: true },
  blockNumber: Number,
  blockHash: String,
  chainId: { type: Number, default: 1 },
  network: { type: String, default: 'ethereum' },
  tokenContract: { type: String, default: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  from: { type: String, required: true, lowercase: true },
  to: { type: String, required: true, lowercase: true }, // recipient
  amount: { type: String, required: true }, // in USDT wei (6 decimals)
  amountHuman: { type: Number, required: true }, // e.g. 1250
  pixelsCount: { type: Number, required: true },
  pixels: [{ x: Number, y: Number, index: Number }],
  status: { 
    type: String, 
    enum: ['pending','confirming','confirmed','failed','rejected','refunded'], 
    default: 'pending', 
    index: true 
  },
  confirmations: { type: Number, default: 0 },
  requiredConfirmations: { type: Number, default: 12 },
  gasUsed: String,
  gasPrice: String,
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  failureReason: String,
  metadata: {
    userAgent: String,
    ip: String,
    referrer: String
  }
}, { timestamps: true });

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ txHash: 1 }, { unique: true });

module.exports = mongoose.model('Transaction', transactionSchema);
