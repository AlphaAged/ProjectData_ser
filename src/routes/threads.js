import express from 'express';
import Thread from '../models/Thread.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/community', async (req,res)=>{
  const threads = await Thread.find({ deleted: { $ne: true } }) //เพิ่มตรงนี้
                             .sort({createdAt:-1})
                             .populate('author');
  res.render('threads/index', {threads});
});

router.get('/threads/new', requireAuth, (req,res)=> res.render('threads/new'));

router.post('/threads', requireAuth, async (req,res)=>{
  const {title, body} = req.body;
  const th = await Thread.create({title, body, author:req.session.user.id});
  res.redirect('/threads/'+th._id);
});

router.get('/threads/:id', requireAuth, async (req,res)=>{
  const th = await Thread.findById(req.params.id)
                         .populate('author')
                         .populate('replies.author');
  if (!th) return res.status(404).send('Not found');
  if (th.deleted && req.session.user.role !== 'admin') return res.status(404).send('Not found');
  res.render('threads/show', {thread: th});
});

router.post('/threads/:id/replies', requireAuth, async (req,res)=>{
  const th = await Thread.findById(req.params.id);
  th.replies.push({author:req.session.user.id, body:req.body.body});
  await th.save();
  if (req.session.user.id !== th.author.toString()){
    const owner = await User.findById(th.author);
    owner.notifications.unshift({type:'reply', message:`${req.session.user.username} ตอบกระทู้ของคุณ`, link:`/threads/${th._id}`});
    await owner.save();
  }
  res.redirect('/threads/'+th._id);
});

router.post('/threads/:id/like', requireAuth, async (req,res)=>{
  const th = await Thread.findById(req.params.id);
  const u = req.session.user.id;
  const i = th.likes.findIndex(id=>id.toString()===u);
  if (i>=0) th.likes.splice(i,1); else th.likes.push(u);
  await th.save();
  res.redirect('/threads/'+th._id);
});

router.get('/threads/:id/report', requireAuth, async (req,res)=>{
  const th = await Thread.findById(req.params.id);
  res.render('threads/report', {thread: th});
});
router.post('/threads/:id/report', requireAuth, async (req,res)=>{
  const th = await Thread.findById(req.params.id);
  th.reports.push({reporter:req.session.user.id, reasonTitle:req.body.title, reasonBody:req.body.body});
  await th.save();
  res.redirect('/threads/'+th._id);
});

// delete or report button
router.post('/threads/:id/delete', requireAuth, async (req,res)=>{
  const th = await Thread.findById(req.params.id);
  if (!th) return res.status(404).send('Not found');
  if (th.author.toString() !== req.session.user.id && req.session.user.role!=='admin') 
    return res.status(403).send('Forbidden');
  // Soft delete
  th.deleted = true;
  th.deletedAt = new Date();
  await th.save();

  res.redirect('/community'); //list threads จะไม่ดึง deleted
});

export default router;
