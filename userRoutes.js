const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();
router.use(protect);
router.put('/profile', async (req,res,next)=>{ try{ const {username,phone,country,language}=req.body; const u=await User.findById(req.user._id); if(username) u.username=username; if(phone!==undefined) u.phone=phone; if(country) u.country=country; if(language) u.language=language; await u.save(); res.json({success:true,user:u}); }catch(e){next(e)} });
router.put('/settings', async (req,res,next)=>{ try{ const u=await User.findById(req.user._id); u.settings={...u.settings.toObject(),...req.body}; await u.save(); res.json({success:true,settings:u.settings}); }catch(e){next(e)} });
module.exports = router;
