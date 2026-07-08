const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;
const { protect } = require('../middleware/auth');
const Pixel = require('../models/Pixel');
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10*1024*1024 }, fileFilter: (req,file,cb)=>{ if(['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype)) cb(null,true); else cb(new Error('Invalid file type')); }});

router.post('/pixel/:x/:y', protect, upload.single('image'), async (req,res,next)=>{
  try{
    const {x,y}=req.params;
    const pixel = await Pixel.findOne({x,y});
    if(!pixel) return res.status(404).json({success:false,message:'Pixel not found'});
    if(pixel.owner?.toString()!==req.user._id.toString()) return res.status(403).json({success:false,message:'Not owner'});
    if(!req.file) return res.status(400).json({success:false,message:'No file'});
    // compress
    const buf = await sharp(req.file.buffer).resize(512,512,{fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
    const thumb = await sharp(buf).resize(128,128).webp({quality:75}).toBuffer();
    // upload cloudinary
    const uploadStream = (buffer, folder)=> new Promise((resolve,reject)=>{
      const stream = cloudinary.uploader.upload_stream({folder: process.env.CLOUDINARY_FOLDER||'pixelarena', resource_type:'image'}, (err,result)=> err?reject(err):resolve(result));
      stream.end(buffer);
    });
    const result = await uploadStream(buf);
    const tResult = await uploadStream(thumb);
    pixel.image = {
      url: result.secure_url,
      publicId: result.public_id,
      thumbnailUrl: tResult.secure_url,
      width: result.width,
      height: result.height,
      size: result.bytes,
      format: result.format,
      uploadedAt: new Date(),
      moderated: false,
      approved: true
    };
    await pixel.save();
    res.json({success:true,data:pixel.image});
  }catch(e){next(e)}
});
module.exports = router;
