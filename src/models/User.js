import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const NotificationSchema = new mongoose.Schema({
  type: {type: String, enum: ['comment','reply','admin','like'], required:true},
  message: String,
  link: String,
  read: {type:Boolean, default:false},
  createdAt: {type:Date, default:Date.now}
});

const UserSchema = new mongoose.Schema({
  username: {type:String, unique:true, required:true},
  email: {type:String, unique:true, required:true},
  passwordHash: {type:String, required:true},
  role: {type:String, enum:['user','admin'], default:'user'},
  avatar: {type:String, default:'/img/default-avatar.png'},
  program: String,
  year: String,
  bio: String,
  notifications: [NotificationSchema],
   savePosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }]
}, {timestamps:true});

UserSchema.methods.setPassword = async function(password){
  this.passwordHash = await bcrypt.hash(password, 10);
}
UserSchema.methods.validatePassword = function(password){
  return bcrypt.compare(password, this.passwordHash);
}

export default mongoose.model('User', UserSchema);
