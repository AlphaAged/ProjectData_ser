import mongoose from 'mongoose';
import slugify from 'slugify';

const CommentSchema = new mongoose.Schema({
  author: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
  body: String,
  createdAt: {type:Date, default:Date.now}
});

const ReportSchema = new mongoose.Schema({
  reporter: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
  reasonTitle: String,
  reasonBody: String,
  status: {type:String, enum:['pending','in_progress','resolved'], default:'pending'},
  createdAt: {type:Date, default:Date.now}
});

const PostSchema = new mongoose.Schema({
  title: {type:String, required:true},
  body: {type:String, required:true},
  tags: [{type:String, enum:['CS','AI','IT','CY','GIS','Physics','Chemistry','Biology','Math','English','GE','Free']}],
  coverImage: String,
  author: {type: mongoose.Schema.Types.ObjectId, ref:'User', required:true},
  likes: [{type: mongoose.Schema.Types.ObjectId, ref:'User'}],
  views: {type:Number, default:0},
  comments: [CommentSchema],
  reports: [ReportSchema],
  slug: {type:String, unique:true}
}, {timestamps:true});

PostSchema.pre('save', function(next){
  if (!this.slug) {
    this.slug = slugify(`${this.title}-${Math.random().toString(36).slice(2,7)}`, {lower:true, strict:true});
  }
  next();
});

export default mongoose.model('Post', PostSchema);
