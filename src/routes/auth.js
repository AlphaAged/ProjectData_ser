import express from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Thread from '../models/Thread.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

//แสดงฟอร์มสมัครสมาชิก
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

//แสดงฟอร์มล็อกอิน
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

//ออกจากระบบ
router.post('/logout', (req,res)=>{
  req.session.destroy(()=> res.redirect('/'));
});

//ดูโปรไฟล์ตัวเอง
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id)
    .populate('following', 'username program year bio')
    .lean();
    //ดึงโพสต์และกระทู้ที่ยังไม่ลบของผู้ใช้คนนี้
    const posts = await Post.find({
      author: req.session.user.id,
      deleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .populate('author', 'username')
    .lean();
    const threads = await Thread.find({ 
      author: req.session.user.id,
      deleted: { $ne: true } 
    })
    .sort({ createdAt: -1 })
    .populate('author', 'username')
    .lean();

    //render หน้าโปรไฟล์ตัวเอง
    res.render('auth/profile', {
      user,
      posts,
      threads,
      following: user.following || [],
      message: req.query.msg || null
    });
  } catch (err) {
    next(err);
  }
});

//ดูโปรไฟล์คนอื่น
router.get('/user/:username', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username }).lean();
    if (!user) return res.status(404).render('404', { message: 'ไม่พบบัญชีผู้ใช้นี้' });

    const posts = await Post.find({
      author: user._id,
      deleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .populate('author', 'username')
    .lean();

    const threads = await Thread.find({
      author: user._id,
      deleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .populate('author', 'username')
    .lean();

    //render หน้าโปรไฟล์คนอื่น
    res.render('auth/user_profile', {
      user,
      posts,
      threads,
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

//แก้: อัปเดตเสร็จ redirect ไป /profile พร้อมข้อความ แทนการ render ตรงๆ
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

//follow
router.post('/user/:id/follow', requireAuth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const currentUser = await User.findById(req.session.user.id);

    // ป้องกันติดตามตัวเอง
    if (currentUser._id.equals(targetUser._id)) {
      return res.status(400).json({ error: 'ไม่สามารถติดตามตัวเองได้' });
    }

    let following = false;

    //unfollow
    const index = currentUser.following.findIndex(id => id.equals(targetUser._id));
    if (index >= 0) {
      currentUser.following.splice(index, 1);
      targetUser.followers = targetUser.followers.filter(id => !id.equals(currentUser._id));
      following = false;
    } else {
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
      following = true;
    }

    await currentUser.save();
    await targetUser.save();

    req.session.user.following = currentUser.following;

    res.json({ following, followersCount: targetUser.followers.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

//ดูโปรไฟล์คนอื่น
router.get('/user/:username', requireAuth, async (req, res) => {
  const user = await User.findOne({ username: req.params.username }).lean();
  const currentUser = await User.findById(req.session.user.id).lean();

  res.render('auth/user_profile', { user, currentUser });
});


export default router;
