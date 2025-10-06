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
  const usersCount = await User.countDocuments();
  const postsCount = await Post.countDocuments({ deleted: false });
  const threadsCount = await Thread.countDocuments({ deleted: false });
  const posts = await Post.find({ deleted: false }).sort({ createdAt: -1 });


  // นับรายงานคงค้าง
// นับรายงานคงค้างเฉพาะที่ status != 'resolved'
const pendingReportsPosts = await Post.aggregate([
  { $unwind: "$reports" }, // แยกรายงานแต่ละอัน
  { $match: { "reports.status": { $ne: "resolved" } } }
]);

const pendingReportsThreads = await Thread.aggregate([
  { $unwind: "$reports" },
  { $match: { "reports.status": { $ne: "resolved" } } }
]);

const totalReports = pendingReportsPosts.length + pendingReportsThreads.length;


  res.render('admin/dashboard', {
    users: usersCount,
    posts: postsCount,
    threads: threadsCount,
    totalReports
  });
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
  await User.deleteOne({_id:req.params.id});
  res.redirect('/admin/users');
});

// admin report and update report status
router.get('/reports', requireAuth, async (req,res) => {
  // ดึงโพสต์ทั้งหมด ไม่กรอง deleted
  const posts = await Post.find().sort({ createdAt: -1 }).populate('author');
  const threads = await Thread.find().sort({ createdAt: -1 }).populate('author');
  
  res.render('admin/reports', { posts, threads, currentUser: req.session.user });
});

router.get('/reports/:type/:itemId/:reportIdx', requireAuth, async (req,res) => {
  const { type, itemId, reportIdx } = req.params;
  let report, originalItem;

  if (type === 'post') {
    originalItem = await Post.findById(itemId);
    if (originalItem && originalItem.reports && originalItem.reports[reportIdx]) {
      report = originalItem.reports[reportIdx];
    }
  } else if (type === 'thread') {
    originalItem = await Thread.findById(itemId);
    if (originalItem && originalItem.reports && originalItem.reports[reportIdx]) {
      report = originalItem.reports[reportIdx];
    }
  }

  if (!report) return res.status(404).send('Report not found');

  res.render('admin/reportdetails', { report, originalItem, type, reportIdx, currentUser: req.session.user });
});


router.post('/reports/:type/:itemId/:reportIdx/status', async (req, res) => {
  const { type, itemId, reportIdx } = req.params;
  const {status} = req.body; 

  let item;
  if (type === 'post') item = await Post.findById(itemId);
  else if (type === 'thread') item = await Thread.findById(itemId);

  if (!item) return res.status(404).send('Item not found');

  const report = item.reports[reportIdx];
  if (!report) return res.status(404).send('Report not found');

  report.status = status;
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
  if (!p) return res.status(404).send('Post not found');
  //Soft delete
  p.deleted = true;
  p.deletedAt = new Date();
  await p.save();

  res.redirect('/admin/reports');
});

router.post('/threads/:id/delete', requireAuth, async (req, res) => {
  const thread = await Thread.findById(req.params.id);
  if (!thread) return res.status(404).send('Thread not found');

  if (String(thread.author) !== req.session.user.id && req.session.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }
  //Soft delete
  thread.deleted = true;
  thread.deletedAt = new Date();
  await thread.save();

  res.redirect('/admin/reports');
});

export default router;
