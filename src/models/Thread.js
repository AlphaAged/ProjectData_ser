import mongoose from 'mongoose';

const ReplySchema = new mongoose.Schema({
  author: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
  body: String,
  createdAt: {type:Date, default:Date.now}
});

const ThreadSchema = new mongoose.Schema({
  title: {type:String, required:true},
  body: {type:String, required:true},
  author: {type: mongoose.Schema.Types.ObjectId, ref:'User', required:true},
  replies: [ReplySchema],
  likes: [{type: mongoose.Schema.Types.ObjectId, ref:'User'}],
  reports: [{
    reporter: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
    reasonTitle: String,
    reasonBody: String,
    status: {type:String, enum:['pending','in_progress','resolved'], default:'pending'},
    createdAt: {type:Date, default:Date.now}
  }],
    deleted: { type: Boolean, default: false },  //เพิ่มลบ
  deletedAt: Date                                //เพิ่มลบ
}, {timestamps:true});

export default mongoose.model('Thread', ThreadSchema);
