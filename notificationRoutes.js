const express = require('express');
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');
const router = express.Router();
router.use(protect);
router.get('/', async (req,res,next)=>{ try{ const n=await Notification.find({user:req.user._id}).sort({createdAt:-1}).limit(50); res.json({success:true,data:n}); }catch(e){next(e)} });
router.patch('/:id/read', async (req,res,next)=>{ try{ await Notification.updateOne({_id:req.params.id,user:req.user._id},{read:true,readAt:new Date()}); res.json({success:true}); }catch(e){next(e)} });
module.exports = router;
