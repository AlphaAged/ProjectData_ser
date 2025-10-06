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

// แสดงโปรไฟล์
router.get('/profile', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const user = await User.findById(req.session.user.id);

  const posts = await Post.find({
      author: req.session.user.id,
      deleted: { $ne: true } // กรองโพสต์ที่ถูกลบออก
  })
  .sort({ createdAt: -1 })
  .populate('author', 'username email');

  res.render('auth/profile', { user, posts, message: null });
});


// แสดงฟอร์มแก้ไขโปรไฟล์
router.get('/edit-profile', async (req,res)=>{
  if (!req.session.user) return res.redirect('/login');
  const user = await User.findById(req.session.user.id);
 res.render('auth/edit-profile', { user, message: null });// 👈 เปลี่ยนไป render edit-profile.ejs
});

// อัปเดตโปรไฟล์
router.post('/edit-profile', async (req,res)=>{
  if (!req.session.user) return res.redirect('/login');
  const user = await User.findById(req.session.user.id);

  const {username,email,program,year,bio} = req.body;
  user.username = username;
  user.email = email;
  user.program = program;
  user.year = year;
  user.bio = bio;

  await user.save();

  // อัปเดต session ด้วย
  req.session.user.username = username;
  req.session.user.email = email;

  res.render('auth/profile', {user, message:'อัปเดตโปรไฟล์แล้ว'});
});

// บันทึก/ยกเลิกบันทึกโพสต์
router.get('/saved-posts', requireAuth, async (req, res) => {
  const user = await User.findById(req.session.user.id).populate({
    path: 'savePosts',
    populate: { path: 'author' } // ดึง author ของแต่ละ post
  });

  res.render('auth/saved-posts', { savedPosts: user.savePosts, currentUser: req.session.user });
});


export default router;
