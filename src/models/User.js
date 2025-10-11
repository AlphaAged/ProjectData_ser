import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

  //เก็บการแจ้งเตือน
const NotificationSchema = new mongoose.Schema({
  type: {type: String, enum: ['comment','reply','admin','like'], required:true},
  message: String,
  link: String,
  read: {type:Boolean, default:false},
  createdAt: {type:Date, default:Date.now}
});

  //เก็บข้อมูลผู้ใช้
const UserSchema = new mongoose.Schema({
  username: {type:String, unique:true, required:true},
  email: {type:String, unique:true, required:true},
  passwordHash: {type:String, required:true},
  role: {type:String, enum:['user','admin'], default:'user'},
  avatar: {type:String, default:'/img/default-avatar.png'},
  program: String,
  year: String,
  bio: String,
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notifications: [NotificationSchema],
   savePosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }]
}, {timestamps:true});

//ตั้งรหัสผ่าน โดยจะเก็บโดยการ hash รหัสผ่าน 10 ครั้งก่อนเก็บลงฐานข้อมูล
UserSchema.methods.setPassword = async function(password){
  this.passwordHash = await bcrypt.hash(password, 10);
}
//ตรวจสอบรหัสผ่าน
UserSchema.methods.validatePassword = function(password){
  return bcrypt.compare(password, this.passwordHash);
}


//ส่งออกให้ใช้โมเดลชื่อ User
export default mongoose.model('User', UserSchema);
