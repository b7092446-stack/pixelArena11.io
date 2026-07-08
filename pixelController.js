const Pixel = require('../models/Pixel');
const User = require('../models/User');
const { emitPixelSold } = require('../config/socket');
const { getRedis } = require('../config/redis');

// GET /api/v1/pixels?x1=0&y1=0&x2=999&y2=999&team=football
exports.getPixels = async (req, res, next) => {
  try {
    const { x1=0, y1=0, x2=999, y2=999, team, sold } = req.query;
    const q = {
      x: { $gte: parseInt(x1), $lte: parseInt(x2) },
      y: { $gte: parseInt(y1), $lte: parseInt(y2) }
    };
    if (team) q.team = team;
    if (sold !== undefined) q.isSold = sold === 'true';
    
    // Cache hot regions
    const cacheKey = `pixels:${x1}:${y1}:${x2}:${y2}:${team||'all'}`;
    try {
      const redis = getRedis();
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    } catch(e){}

    const pixels = await Pixel.find(q)
      .select('x y index isSold owner wallet team title link image.thumbnailUrl image.url purchasedAt price')
      .populate('owner', 'username profileImage')
      .lean()
      .limit(20000); // safeguard

    const response = { success: true, count: pixels.length, data: pixels };
    try {
      const redis = getRedis();
      await redis.setex(cacheKey, 30, JSON.stringify(response));
    } catch(e){}
    res.json(response);
  } catch (err) { next(err); }
};

exports.getPixel = async (req, res, next) => {
  try {
    const { x, y } = req.params;
    const pixel = await Pixel.findOne({ x: parseInt(x), y: parseInt(y) }).populate('owner', 'username profileImage walletAddress stats');
    if (!pixel) return res.status(404).json({ success: false, message: 'Pixel not found' });
    pixel.views += 1;
    await pixel.save({ validateBeforeSave: false });
    res.json({ success: true, data: pixel });
  } catch (err) { next(err); }
};

exports.updatePixelMeta = async (req, res, next) => {
  try {
    const { x, y } = req.params;
    const { title, description, link } = req.body;
    const pixel = await Pixel.findOne({ x, y });
    if (!pixel) return res.status(404).json({ success: false, message: 'Pixel not found' });
    if (!pixel.owner || pixel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your pixel' });
    }
    if (title !== undefined) pixel.title = title.slice(0,60);
    if (description !== undefined) pixel.description = description.slice(0,280);
    if (link !== undefined) {
      if (link && !/^https?:\/\/.+/.test(link)) return res.status(400).json({ success: false, message: 'Invalid link' });
      pixel.link = link;
    }
    await pixel.save();
    res.json({ success: true, data: pixel });
  } catch (err) { next(err); }
};

exports.getMyPixels = async (req, res, next) => {
  try {
    const pixels = await Pixel.find({ owner: req.user._id, isSold: true }).sort({ purchasedAt: -1 });
    res.json({ success: true, count: pixels.length, data: pixels });
  } catch (err) { next(err); }
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const top = await User.find({ 'stats.pixelsOwned': { $gt: 0 } })
      .select('username profileImage stats walletAddress')
      .sort({ 'stats.pixelsOwned': -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: top });
  } catch (err) { next(err); }
};

exports.getMapStats = async (req, res, next) => {
  try {
    const cacheKey = 'stats:map';
    try {
      const redis = getRedis();
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    } catch(e){}
    const [sold, byTeam] = await Promise.all([
      Pixel.countDocuments({ isSold: true }),
      Pixel.aggregate([
        { $match: { isSold: true } },
        { $group: { _id: '$team', count: { $sum: 1 }, revenue: { $sum: '$price' } } }
      ])
    ]);
    const data = {
      success: true,
      total: 1000000,
      sold,
      available: 1000000 - sold,
      percentSold: +(sold/1000000*100).toFixed(4),
      byTeam,
      price: 1,
      currency: 'USDT'
    };
    try {
      const redis = getRedis();
      await redis.setex(cacheKey, 60, JSON.stringify(data));
    } catch(e){}
    res.json(data);
  } catch (err) { next(err); }
};
