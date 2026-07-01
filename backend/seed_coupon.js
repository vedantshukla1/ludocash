const mongoose = require('mongoose');
const Coupon = require('./models/Coupon');
require('dotenv').config({ path: './.env' });

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  await Coupon.deleteMany({ code: 'WELCOME100' });
  await Coupon.create({
    code: 'WELCOME100',
    bonusAmount: 100,
    maxUses: 1000,
    usedCount: 0,
    isActive: true,
  });

  console.log('Coupon WELCOME100 created with Rs 100 bonus!');
  process.exit(0);
}

seed();
