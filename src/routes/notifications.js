import express from 'express';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

//ดูการแจ้งเตือนทั้งหมดของผู้ใช้ที่ล็อกอิน
router.get('/notifications', requireAuth, async (req,res)=>{
  const user = await User.findById(req.session.user.id);
  res.render('notifications/index', {notifications: user.notifications});
});

//ทำเครื่องหมายการแจ้งเตือนทั้งหมดว่าอ่านแล้ว
router.post('/notifications/mark-all-read', requireAuth, async (req,res)=>{
  const user = await User.findById(req.session.user.id);
  user.notifications = user.notifications.map(n=>({...n.toObject(), read:true}));
  await user.save();
  res.redirect('/notifications');
});

//เปลี่ยนสถานะการแจ้งเตือนเป็นอ่านแล้ว
router.post('/:id/mark-read', async (req, res) => {
  const id = req.params.id;
  await Notification.findByIdAndUpdate(id, { read: true });
  res.json({ success: true });
});

export default router;