const express = require('express');
const Pixel = require('../models/Pixel');
const User = require('../models/User');
const router = express.Router();
router.get('/', async (req,res,next)=>{ try{ const {q,type='all'}=req.query; if(!q) return res.json({success:true,data:[]}); const results={}; if(type==='all'||type==='user'){ results.users=await User.find({username: new RegExp(q,'i')}).select('username profileImage stats').limit(20);} if(type==='all'||type==='pixel'){ const [x,y]=q.split(',').map(Number); if(!isNaN(x)&&!isNaN(y)){ results.pixel=await Pixel.findOne({x,y}); } } if(type==='all'||type==='wallet'){ if(/^0x[a-fA-F0-9]{40}$/.test(q)){ results.pixels=await Pixel.find({wallet:q.toLowerCase(),isSold:true}).limit(100);} } res.json({success:true,data:results}); }catch(e){next(e)} });
module.exports = router;
