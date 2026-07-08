const Pixel = require('../models/Pixel');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { verifyUSDTTransaction, getConfirmations } = require('../services/blockchain');
const { emitPixelSold } = require('../config/socket');
const logger = require('../utils/logger');
const { getRedis } = require('../config/redis');

const RECIPIENT = (process.env.PAYMENT_RECIPIENT_WALLET || '0x98598Caa0F0b67D32503DA73c3719C3514C12643').toLowerCase();
const PIXEL_PRICE = parseFloat(process.env.PIXEL_PRICE_USDT) || 1;

/**
 * POST /api/v1/payment/verify
 * Body: { txHash, pixels: [{x,y}], wallet }
 * Verifies on-chain USDT transfer, prevents double spend, assigns pixels
 */
exports.verifyPayment = async (req, res, next) => {
  const session = await Pixel.startSession();
  session.startTransaction();
  try {
    const { txHash, pixels, wallet } = req.body;
    if (!txHash || !pixels || !Array.isArray(pixels) || pixels.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'txHash and pixels required' });
    }
    if (pixels.length > (parseInt(process.env.MAX_PIXELS_PER_TX) || 50000)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Too many pixels in one tx' });
    }

    const normalizedTx = txHash.toLowerCase();
    // duplicate tx check
    const existingTx = await Transaction.findOne({ txHash: normalizedTx });
    if (existingTx) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Transaction already processed', data: existingTx });
    }

    // Validate coordinates & availability
    const coords = pixels.map(p => ({ x: parseInt(p.x), y: parseInt(p.y) }));
    for (const c of coords) {
      if (c.x < 0 || c.x > 999 || c.y < 0 || c.y > 999) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Invalid coordinate ${c.x},${c.y}` });
      }
    }
    const indexes = coords.map(c => c.y * 1000 + c.x);
    const foundPixels = await Pixel.find({ index: { $in: indexes } }).session(session);
    if (foundPixels.length !== coords.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Some pixels do not exist in DB. Seed first.' });
    }
    const alreadySold = foundPixels.filter(p => p.isSold);
    if (alreadySold.length > 0) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: `${alreadySold.length} pixels already sold`, sold: alreadySold.map(p=>({x:p.x,y:p.y})) });
    }

    const expectedAmount = coords.length * PIXEL_PRICE;

    // Blockchain verification
    const verification = await verifyUSDTTransaction(normalizedTx, expectedAmount, RECIPIENT);
    if (!verification.valid) {
      await session.abortTransaction();
      logger.warn(`Payment verification failed ${normalizedTx}: ${verification.reason}`, { user: req.user?._id });
      return res.status(400).json({ success: false, message: 'Blockchain verification failed', reason: verification.reason });
    }

    // prevent double spending: ensure from matches claimed wallet if provided
    const fromWallet = verification.from.toLowerCase();
    if (wallet && wallet.toLowerCase() !== fromWallet) {
      // allow but log – user may pay from different wallet
      logger.warn(`Wallet mismatch: claimed ${wallet} actual ${fromWallet}`);
    }

    // Create transaction record
    const txDoc = await Transaction.create([{
      user: req.user._id,
      wallet: fromWallet,
      txHash: normalizedTx,
      from: fromWallet,
      to: RECIPIENT,
      amount: verification.amount,
      amountHuman: verification.amountHuman,
      pixelsCount: coords.length,
      pixels: coords.map(c => ({ ...c, index: c.y*1000 + c.x })),
      blockNumber: verification.blockNumber,
      confirmations: verification.confirmations,
      status: verification.confirmed ? 'confirmed' : 'confirming',
      verified: true,
      verifiedAt: new Date(),
      network: 'ethereum',
      chainId: 1,
      metadata: { ip: req.ip, userAgent: req.get('user-agent') }
    }], { session });

    // Assign pixels
    const now = new Date();
    const bulkOps = foundPixels.map(p => ({
      updateOne: {
        filter: { _id: p._id, isSold: false },
        update: {
          $set: {
            owner: req.user._id,
            wallet: fromWallet,
            isSold: true,
            purchasedAt: now,
            price: PIXEL_PRICE,
            txHash: normalizedTx,
            blockNumber: verification.blockNumber,
            confirmations: verification.confirmations
          },
          $push: {
            history: {
              owner: req.user._id,
              wallet: fromWallet,
              price: PIXEL_PRICE,
              txHash: normalizedTx,
              purchasedAt: now
            }
          }
        }
      }
    }));
    const bulkResult = await Pixel.bulkWrite(bulkOps, { session });
    if (bulkResult.modifiedCount !== coords.length) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Race condition: some pixels sold during processing' });
    }

    // Update user stats
    await User.updateOne({ _id: req.user._id }, {
      $inc: { 'stats.pixelsOwned': coords.length, 'stats.totalSpent': expectedAmount },
      $set: { walletAddress: fromWallet }
    }, { session });

    await session.commitTransaction();

    // emit socket events & invalidate cache
    try {
      const redis = getRedis();
      await redis.del('stats:map');
    } catch(e){}

    coords.forEach(c => {
      emitPixelSold({
        x: c.x, y: c.y,
        owner: req.user.username,
        wallet: fromWallet,
        txHash: normalizedTx,
        team: foundPixels.find(p=>p.x===c.x && p.y===c.y)?.team || 'global'
      });
    });

    logger.info(`Payment confirmed: ${normalizedTx} user ${req.user._id} pixels ${coords.length} amount ${expectedAmount} USDT`, { txHash: normalizedTx });

    res.status(201).json({
      success: true,
      message: verification.confirmed ? 'Payment confirmed and pixels assigned' : 'Payment verifying – confirmations pending',
      data: {
        transaction: txDoc[0],
        pixels: coords.length,
        amount: expectedAmount,
        confirmations: verification.confirmations,
        confirmed: verification.confirmed
      }
    });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// GET /api/v1/payment/status/:txHash
exports.paymentStatus = async (req, res, next) => {
  try {
    const tx = await Transaction.findOne({ txHash: req.params.txHash.toLowerCase() });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    // update confirmations live
    if (tx.status === 'confirming') {
      const conf = await getConfirmations(tx.txHash);
      if (conf !== tx.confirmations) {
        tx.confirmations = conf;
        if (conf >= tx.requiredConfirmations) {
          tx.status = 'confirmed';
        }
        await tx.save({ validateBeforeSave: false });
      }
    }
    res.json({ success: true, data: tx });
  } catch (err) { next(err); }
};

exports.myTransactions = async (req, res, next) => {
  try {
    const txs = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: txs.length, data: txs });
  } catch (err) { next(err); }
};
