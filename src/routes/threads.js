import express from 'express';

//รับ api จาก model
import Thread from '../models/Thread.js';
//รับ api จาก model
import User from '../models/User.js';
//ตรวจสอบการ login
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/community', async (req, res) => {
  const q = (req.query.q || '').trim();

  const filter = { deleted: { $ne: true } };
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { body: { $regex: q, $options: 'i' } },
    ];
  }

  const threads = await Thread.find(filter)
    .sort({ createdAt: -1 })                 // จะใช้ updatedAt ก็ได้
    .populate('author', 'username program year')
    .lean();

  res.render('threads/index', { threads, q });
});


router.get('/threads/new', requireAuth, (req, res) => res.render('threads/new'));

router.post('/threads', requireAuth, async (req, res) => {
  const { title, body } = req.body;
  const th = await Thread.create({ title, body, author: req.session.user.id });
  res.redirect('/threads/' + th._id);
});



router.get('/threads/:id', requireAuth, async (req, res) => {
  const th = await Thread.findById(req.params.id)
    .populate('author')
    .populate('replies.author');
  if (!th) return res.status(404).send('Not found');
  if (th.deleted && req.session.user.role !== 'admin') return res.status(404).send('Not found');

  // นับ view
  th.views = (typeof th.views === 'number' ? th.views : 0) + 1;
  await th.save();
  res.render('threads/show', { thread: th });
});

router.post('/threads/:id', requireAuth, async (req, res) => {
  const th = await Thread.findById(req.params.id).populate('author');
  if (!th) return res.status(404).send('Not found');
  if (String(th.author._id) !== String(req.session.user.id) && req.session.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }

  const title = (req.body.title || '').trim();
  const body  = (req.body.body  || '').trim();
  if (title) th.title = title;
  if (body)  th.body  = body;

  await th.save();
  res.redirect('/threads/' + th._id);
});

router.post('/threads/:id/replies', requireAuth, async (req, res) => {
  const th = await Thread.findById(req.params.id);
  th.replies.push({ author: req.session.user.id, body: req.body.body });
  await th.save();
  if (req.session.user.id !== th.author.toString()) {
    const owner = await User.findById(th.author);
    owner.notifications.unshift({ type: 'reply', message: `${req.session.user.username} ตอบกระทู้ของคุณ`, link: `/threads/${th._id}` });
    await owner.save();
  }
  res.redirect('/threads/' + th._id);
});

// like
router.post('/threads/:id/like', requireAuth, async (req, res) => {
  const th = await Thread.findById(req.params.id);
  if (!th) return res.status(404).send('Not found');

  const u = req.session.user.id;
  const i = th.likes.findIndex(id => String(id) === String(u));
  let liked;
  if (i >= 0) { th.likes.splice(i, 1); liked = false; }
  else       { th.likes.push(u);       liked = true; }

  await th.save();

  // ถ้าเป็น AJAX ให้ตอบ JSON (หน้า show.ejs รอแบบนี้)
  if (req.accepts('json')) return res.json({ liked, likes: th.likes.length });

  // เผื่อกรณีปุ่มแบบปกติ (มี noscript)
  res.redirect('/threads/' + th._id);
});

// edit
router.get('/threads/:id/edit', requireAuth, async (req, res) => {
  const th = await Thread.findById(req.params.id).populate('author');
  if (!th) return res.status(404).send('Not found');

  // อนุญาตเฉพาะเจ้าของกระทู้หรือ admin
  if (String(th.author._id) !== String(req.session.user.id) && req.session.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }

  res.render('threads/edit', { thread: th, title: 'แก้ไขหัวข้อ' });
});

// บันทึกการแก้ไข
router.post('/threads/:id', requireAuth, async (req, res) => {
  const th = await Thread.findById(req.params.id).populate('author');
  if (!th) return res.status(404).send('Not found');

  if (String(th.author._id) !== String(req.session.user.id) && req.session.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }

  th.title = (req.body.title || '').trim();
  th.body  = (req.body.body  || '').trim();
  await th.save();

  res.redirect('/threads/' + th._id);
});

// report
router.get('/threads/:id/report', requireAuth, async (req, res) => {
  const th = await Thread.findById(req.params.id);
  res.render('threads/report', { thread: th });
});

router.post('/threads/:id/report', requireAuth, async (req, res) => {
  const th = await Thread.findById(req.params.id);
  th.reports.push({ reporter: req.session.user.id, reasonTitle: req.body.title, reasonBody: req.body.body });
  await th.save();
  res.redirect('/threads/' + th._id);
});

// delete or report button
router.post('/threads/:id/delete', requireAuth, async (req, res) => {
  const th = await Thread.findById(req.params.id);
  if (!th) return res.status(404).send('Not found');
  if (th.author.toString() !== req.session.user.id && req.session.user.role !== 'admin')
    return res.status(403).send('Forbidden');
  // Soft delete
  th.deleted = true;
  th.deletedAt = new Date();
  await th.save();

  res.redirect('/community'); //list threads จะไม่ดึง deleted
});

export default router;
