import mongoose from 'mongoose';

//เก็บข้อความตอบกลับในกระทู้
const ReplySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  body: String,
  createdAt: { type: Date, default: Date.now }
});

//เก็บข้อมูลกระทู้
const ThreadSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  replies: [ReplySchema],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    views:    { type: Number, default: 0 }, 
  reports: [{
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reasonTitle: String,
    reasonBody: String,
    status: { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  deleted: { type: Boolean, default: false },  //เพิ่มลบ
  deletedAt: Date                                //เพิ่มลบ
}, { timestamps: true });

//ส่งออกให้ใช้โมเดลชื่อ Thread
export default mongoose.model('Thread', ThreadSchema);
