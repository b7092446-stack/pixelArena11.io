const express = require('express');
const Pixel = require('../models/Pixel');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const router=express.Router();
router.get('/', async (req,res,next)=>{ try{ const [users, sold, revenue, txs]=await Promise.all([User.countDocuments({isActive:true}), Pixel.countDocuments({isSold:true}), Transaction.aggregate([{$match:{status:'confirmed'}},{$group:{_id:null,total:{$sum:'$amountHuman'}}}]), Transaction.countDocuments()]); res.json({success:true,data:{users, pixels_sold:sold, pixels_total:1000000, revenue: revenue[0]?.total||0, transactions:txs}})}catch(e){next(e)} });
module.exports=router;
