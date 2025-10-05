import express from 'express';
import Post from '../models/Post.js';
import User from '../models/User.js';
import upload from '../utils/upload.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// create form
router.get('/posts/new', requireAuth, (req,res)=>{
  res.render('posts/new');
});

// create
router.post('/posts', requireAuth, upload.single('cover'), async (req,res)=>{
  const {title, body, tags} = req.body;
  const coverImage = req.file ? '/uploads/'+req.file.filename : null;
  const post = await Post.create({title, body, tags: Array.isArray(tags)?tags:[tags], coverImage, author:req.session.user.id});
  res.redirect('/posts/'+post.slug);
});

// detail (increase views)
router.get('/posts/:slug', async (req,res)=>{
  const post = await Post.findOne({slug: req.params.slug}).populate('author').populate('comments.author');
  if (!post) return res.status(404).send('Not found');
  // ถ้า user ที่สร้างโพสต์ถูกลบ ให้ลบโพสต์นี้และ redirect ไปหน้าหลัก
  if (!post.author) {
    await Post.deleteOne({_id: post._id});
    return res.redirect('/');
  }
  post.views += 1;
  await post.save();
  res.render('posts/show', {post});
});

// like
router.post('/posts/:slug/like', requireAuth, async (req,res)=>{
  const post = await Post.findOne({slug:req.params.slug});
  const u = req.session.user.id;
  const idx = post.likes.findIndex(id=>id.toString()===u);
  if (idx>=0) post.likes.splice(idx,1);
  else post.likes.push(u);
  await post.save();
  // notify owner
  if (u !== post.author.toString()){
    const owner = await User.findById(post.author);
    owner.notifications.unshift({type:'like', message:`${req.session.user.username} ถูกใจโพสต์ของคุณ`, link:`/posts/${post.slug}`});
    await owner.save();
  }
  res.redirect('/posts/'+post.slug);
});

// comment
router.post('/posts/:slug/comments', requireAuth, async (req,res)=>{
  const post = await Post.findOne({slug:req.params.slug});
  post.comments.push({author:req.session.user.id, body:req.body.body});
  await post.save();
  // notify owner
  if (req.session.user.id !== post.author.toString()){
    const owner = await User.findById(post.author);
    owner.notifications.unshift({type:'comment', message:`${req.session.user.username} คอมเมนต์โพสต์ของคุณ`, link:`/posts/${post.slug}`});
    await owner.save();
  }
  res.redirect('/posts/'+post.slug);
});

// edit owner
router.get('/posts/:slug/edit', requireAuth, async (req,res)=>{
  const post = await Post.findOne({slug:req.params.slug});
  if (!post) return res.status(404).send('Not found');
  if (post.author.toString() !== req.session.user.id) return res.status(403).send('Forbidden');
  res.render('posts/edit', {post});
});
router.post('/posts/:slug', requireAuth, upload.single('cover'), async (req,res)=>{
  const post = await Post.findOne({slug:req.params.slug});
  if (!post) return res.status(404).send('Not found');
  if (post.author.toString() !== req.session.user.id) return res.status(403).send('Forbidden');
  const {title, body, tags} = req.body;
  if (title) post.title=title;
  if (body) post.body=body;
  post.tags = Array.isArray(tags)?tags:[tags];
  if (req.file) post.coverImage='/uploads/'+req.file.filename;
  await post.save();
  res.redirect('/posts/'+post.slug);
});

// delete or report button
router.post('/posts/:slug/delete', requireAuth, async (req,res)=>{
  const post = await Post.findOne({slug:req.params.slug});
  if (!post) return res.status(404).send('Not found');
  if (post.author.toString() !== req.session.user.id && req.session.user.role!=='admin') return res.status(403).send('Forbidden');
  await Post.deleteOne({_id:post._id});
  res.redirect('/');
});

router.get('/posts/:slug/report', requireAuth, async (req,res)=>{
  const post = await Post.findOne({slug:req.params.slug});
  if (!post) return res.status(404).send('Not found');
  res.render('posts/report', {post});
});
router.post('/posts/:slug/report', requireAuth, async (req,res)=>{
  const post = await Post.findOne({slug:req.params.slug});
  post.reports.push({reporter:req.session.user.id, reasonTitle:req.body.title, reasonBody:req.body.body});
  await post.save();
  res.redirect('/posts/'+post.slug);
});

// toggle save post แบบ AJAX
router.post('/posts/:slug/save', requireAuth, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  const post = await Post.findOne({ slug: req.params.slug });
  if (!post) return res.status(404).json({ error: 'โพสต์ไม่พบ' });

  if (!user.savePosts) user.savePosts = [];

  let saved;
  const postIdStr = String(post._id);

  if (user.savePosts.includes(postIdStr)) {
    // ยกเลิกบันทึก
    user.savePosts = user.savePosts.filter(id => String(id) !== postIdStr);
    saved = false;
  } else {
    // บันทึกโพสต์
    user.savePosts.push(post._id);
    saved = true;
  }

  await user.save();
  req.session.user.savePosts = user.savePosts.map(id => id.toString());

  res.json({ saved });
});



export default router;
