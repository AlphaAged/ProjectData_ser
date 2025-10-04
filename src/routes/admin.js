import express from 'express';
// import { requireAdmin } from '../middleware/auth.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Thread from '../models/Thread.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js'; //ขอใช้อันนี้แทนน ตรวจสอบว่าเป็นแอดมินกับเข้าสู่ระบบแล้ว

const router = express.Router();

router.use(requireAdmin);

// dashboard summary
router.get('/', async (req,res)=>{
  const users = await User.countDocuments();
  const posts = await Post.countDocuments();
  const pendingReportsPosts = await Post.aggregate([{$project:{cnt:{$size:'$reports'}}}]);
  const pendingReportsThreads = await Thread.aggregate([{$project:{cnt:{$size:'$reports'}}}]);
  const totalReports = pendingReportsPosts.reduce((a,b)=>a+b.cnt,0) + pendingReportsThreads.reduce((a,b)=>a+b.cnt,0);
  res.render('admin/dashboard', {users, posts, totalReports});
});

// manage users
router.get('/users', async (req,res)=>{
  const users = await User.find().sort({createdAt:-1});
  res.render('admin/users', {users});
});
router.post('/users/:id/role', async (req,res)=>{
  const u = await User.findById(req.params.id);
  u.role = req.body.role;
  await u.save();
  res.redirect('/admin/users');
});
router.post('/users/:id/delete', async (req,res)=>{
  // ลบโพสต์และกระทู้ของ user ก่อนลบ user
  await Promise.all([
    Post.deleteMany({author: req.params.id}),
    Thread.deleteMany({author: req.params.id}),
    User.deleteOne({_id:req.params.id})
  ]);
  res.redirect('/admin/users');
});

// admin report and update report status
router.get('/reports', requireAuth, async (req,res) => {
  const posts = await Post.find();    
  const threads = await Thread.find(); 
  res.render('admin/reports', { posts, threads, currentUser: req.session.user });
});

router.get('/reports/:type/:itemId/:reportIdx', requireAuth, async (req,res) => {
  const { type, itemId, reportIdx } = req.params;
  let report, originalItem;

  if(type==='post'){
    originalItem = await Post.findById(itemId);
  } else if(type==='thread'){
    originalItem = await Thread.findById(itemId);
  }

  // ไม่ return 404 ถ้า originalItem ไม่มี
  if(type==='post'){
    report = originalItem?.reports[reportIdx] ?? await Post.aggregate([
      { $match: { "reports._id": reportIdx } },
      { $project: { reports: 1 } }
    ]); // หรือเก็บ report แยกจาก post
  } else if(type==='thread'){
    report = originalItem?.reports[reportIdx] ?? await Thread.aggregate([
      { $match: { "reports._id": reportIdx } },
      { $project: { reports: 1 } }
    ]);
  }

  if(!report) return res.status(404).send('Report not found');

  res.render('admin/reportdetails', { report, originalItem, type, reportIdx, currentUser: req.session.user });
});


router.post('/reports/:type/:itemId/:reportIdx/status', async (req, res) => {
  const { type, itemId, reportIdx } = req.params;
  let item;

  if(type === 'post') {
    item = await Post.findById(itemId);
  } else if(type === 'thread') {
    item = await Thread.findById(itemId);
  }

  if(!item) return res.status(404).send('Item not found');

  const report = item.reports[reportIdx];
  if(!report) return res.status(404).send('Report not found');

  report.status = req.body.status;
  await item.save();

  res.redirect('/admin/reports');
});

router.post('/:id/delete', requireAuth, async (req, res) => {
  const thread = await Thread.findById(req.params.id);
  if (!thread) return res.status(404).send('Thread not found');

  if (String(thread.author) !== req.session.user.id && req.session.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }

  await Thread.deleteOne({_id: req.params.id});
  res.redirect('/community');
});

// admin can delete any post/thread
router.post('/posts/:slug/delete', async (req,res)=>{
  const p = await Post.findOne({slug:req.params.slug});
  if (p) await Post.deleteOne({_id:p._id});
  res.redirect('/admin/reports');
});
router.post('/threads/:slug/delete', async (req,res)=>{
  const t = await Thread.findOne({slug:req.params.slug});
  if (t) await Thread.deleteOne({_id:t._id});
  res.redirect('/admin/reports');
});

export default router;
