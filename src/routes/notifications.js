import express from 'express';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/notifications', requireAuth, async (req,res)=>{
  const user = await User.findById(req.session.user.id);
  res.render('notifications/index', {notifications: user.notifications});
});

router.post('/notifications/mark-all-read', requireAuth, async (req,res)=>{
  const user = await User.findById(req.session.user.id);
  user.notifications = user.notifications.map(n=>({...n.toObject(), read:true}));
  await user.save();
  res.redirect('/notifications');
});

export default router;
