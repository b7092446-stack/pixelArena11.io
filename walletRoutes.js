const express = require('express');
const { protect } = require('../middleware/auth');
const { getWalletUSDTBalance } = require('../services/blockchain');
const User = require('../models/User');
const router = express.Router();
router.get('/balance/:address', async (req,res,next)=>{ try{ const bal=await getWalletUSDTBalance(req.params.address); res.json({success:true,balance:bal}); }catch(e){next(e)} });
router.post('/connect', protect, async (req,res,next)=>{ try{ const {address,chain='ethereum'}=req.body; if(!address) return res.status(400).json({success:false,message:'address required'}); const user=await User.findById(req.user._id); if(!user.wallets.find(w=>w.address===address.toLowerCase())){ user.wallets.push({address:address.toLowerCase(),chain,verified:true}); } user.walletAddress=address.toLowerCase(); await user.save(); res.json({success:true}); }catch(e){next(e)} });
router.get('/supported', (req,res)=> res.json({success:true,data:[{name:'MetaMask',id:'metamask'},{name:'WalletConnect',id:'walletconnect'},{name:'Coinbase Wallet',id:'coinbase'},{name:'Trust Wallet',id:'trust'}]}));
module.exports = router;
