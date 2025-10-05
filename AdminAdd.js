import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

const adminEmail = 'admin@example.com';
let user = await User.findOne({email: adminEmail});
if (!user){
  user = new User({username:'admin', email: adminEmail, role:'admin'});
  await user.setPassword('admin1234');
  await user.save();
  console.log('Created admin:', adminEmail, 'password=admin1234');
} else {
  console.log('Admin already exists');
}
process.exit(0);
