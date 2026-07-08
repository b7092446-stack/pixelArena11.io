/**
 * Seed 1,000,000 pixels into MongoDB
 * Run: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Pixel = require('../models/Pixel');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');
  const count = await Pixel.countDocuments();
  if (count >= 1000000) {
    console.log(`Already seeded: ${count} pixels`);
    process.exit(0);
  }
  console.log('Seeding 1,000,000 pixels... this takes ~2-4 min');
  const batchSize = 10000;
  const teams = ['football','basketball','f1','esports','celebrities','global'];
  for (let start=0; start<1000000; start+=batchSize) {
    const docs = [];
    const end = Math.min(start+batchSize, 1000000);
    for (let i=start; i<end; i++) {
      const x = i % 1000;
      const y = Math.floor(i / 1000);
      // assign team by region (example)
      let team = 'global';
      if (y < 200) team = 'football';
      else if (y < 400) team = 'basketball';
      else if (y < 600) team = 'f1';
      else if (y < 800) team = 'esports';
      else team = 'celebrities';
      docs.push({ x, y, index: i, team, price: 1, isSold: false });
    }
    await Pixel.insertMany(docs, { ordered: false });
    console.log(`Inserted ${end}/1000000`);
  }
  console.log('Seed complete');
  process.exit(0);
}
run().catch(e=>{ console.error(e); process.exit(1); });
