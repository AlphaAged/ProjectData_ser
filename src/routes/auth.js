import express from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/register', (req,res)=> res.render('auth/register'));
router.post('/register', async (req,res)=>{
  try {
    const {username, email, password} = req.body;
    const user = new User({username, email});
    await user.setPassword(password);
    await user.save();
    req.session.user = {id:user._id, username:user.username, role:user.role, avatar:user.avatar, email:user.email};
    res.redirect('/');
  } catch (e) {
    res.render('auth/register', {error: 'มีผู้ใช้ชื่อนี้หรืออีเมลนี้แล้ว'});
  }
});

router.get('/login', (req,res)=> res.render('auth/login'));
router.post('/login', async (req,res)=>{
  const {email, password} = req.body;
  const user = await User.findOne({email});
  if (!user || !(await user.validatePassword(password))) {
    return res.render('auth/login', {error:'Invalid credentials'});
  }
  req.session.user = {id:user._id, username:user.username, role:user.role, avatar:user.avatar, email:user.email};
  res.redirect('/');
});

router.post('/logout', (req,res)=>{
  req.session.destroy(()=> res.redirect('/'));
});

// ✅ ใช้ requireAuth และดึง posts ทุกครั้ง + รับ message จาก query
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id).lean();

    const posts = await Post.find({
      author: req.session.user.id,
      deleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .populate('author', 'username')
    .lean();

    res.render('auth/profile', {
      user,
      posts,
      message: req.query.msg || null
    });
  } catch (err) {
    next(err);
  }
});

// แสดงฟอร์มแก้ไขโปรไฟล์
router.get('/edit-profile', requireAuth, async (req,res, next)=>{
  try {
    const user = await User.findById(req.session.user.id).lean();
    res.render('auth/edit-profile', { user, message: null });
  } catch (err) {
    next(err);
  }
});

// ✅ แก้: อัปเดตเสร็จ redirect ไป /profile พร้อมข้อความ แทนการ render ตรงๆ
router.post('/edit-profile', requireAuth, async (req,res, next)=>{
  try {
    const {username,email,program,year,bio} = req.body;

    const user = await User.findByIdAndUpdate(
      req.session.user.id,
      { username, email, program, year, bio },
      { new: true }
    );

    // อัปเดต session ด้วย (เท่าที่ต้องใช้)
    req.session.user.username = user.username;
    req.session.user.email = user.email;

    // ส่งข้อความแจ้งไปทาง query
    res.redirect('/profile?msg=' + encodeURIComponent('อัปเดตโปรไฟล์แล้ว'));
  } catch (err) {
    next(err);
  }
});

// รายการที่บันทึก
router.get('/saved-posts', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id)
      .populate({ path: 'savePosts', populate: { path: 'author', select:'username' } })
      .lean();

    // กรองโพสต์ที่ถูกลบออก เผื่อมี
    const savedPosts = (user.savePosts || []).filter(p => !p.deleted);

    res.render('auth/saved-posts', { savedPosts, currentUser: req.session.user });
  } catch (err) {
    next(err);
  }
});

export default router;
