import express from 'express';
import Post from '../models/Post.js';
import User from '../models/User.js';
import upload from '../utils/upload.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const q = req.query.q || '';
  const tag = req.query.tag || '';

  //ไม่เอาโพสต์ที่ถูกลบ
  let filter = { deleted: { $ne: true } };
  if (q) {
    filter.title = { $regex: q, $options: 'i' }; // ค้นหาจาก title (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
  }
  if (tag) {
    filter.tags = tag;
  }
  const posts = await Post.find(filter).populate('author').sort({ createdAt: -1 });
  console.log('filter:', filter);
  console.log('posts:', posts);
  res.render('home', { posts, q, tag, currentUser: req.session.user });
});

// create form
router.get('/posts/new', requireAuth, (req, res) => {
  res.render('posts/new');
});

// create
router.post(              // ไฟล์รูปภาพเป็น base64  เเละ เก็บ pdf ได้
  '/posts',
  requireAuth,
  upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'pdf', maxCount: 1 },
  ]),
  async (req, res) => {
    const { title, body, tags } = req.body;

    let coverImage = null;
    let pdfFile = null;


    if (req.files['cover']) {
      const file = req.files['cover'][0];
      if (file.mimetype.startsWith('image/')) {
        coverImage = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      } else if (file.mimetype === 'application/pdf') {
        pdfFile = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      }
    }



    if (req.files['pdf']) {
      const file = req.files['pdf'][0];
      pdfFile = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      var pdfName = file.originalname;
    }

    const post = await Post.create({
      title,
      body,
      tags: Array.isArray(tags) ? tags : [tags],
      coverImage,
      pdfFile,
      pdfName,
      author: req.session.user.id,
    });

    res.redirect('/posts/' + post.slug);
  }
);

// detail
router.get('/posts/:slug', async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, deleted: false })
    .populate('author')
    .populate('comments.author');
  if (!post) return res.status(404).send('Not found');

  // ถ้า user ที่สร้างโพสต์ถูกลบ ให้ลบโพสต์นี้และ redirect ไปหน้าหลัก
  if (!post.author) {
    await Post.deleteOne({ _id: post._id });
    return res.redirect('/');
  }

  post.views += 1;
  await post.save();
  res.render('posts/show', { post });
});

// like
router.post('/posts/:slug/like', requireAuth, async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });
  const u = req.session.user.id;
  const idx = post.likes.findIndex(id => id.toString() === u);
  let liked;
  if (idx >= 0) {
    post.likes.splice(idx, 1);
    liked = false;
  } else {
    post.likes.push(u);
    liked = true;
  }
  await post.save();
  // notify owner
  if (u !== post.author.toString()) {
    const owner = await User.findById(post.author);
    owner.notifications.unshift({ type: 'like', message: `${req.session.user.username} ถูกใจโพสต์ของคุณ`, link: `/posts/${post.slug}` });
    await owner.save();
  }
  res.json({ liked, likes: post.likes.length }); // <-- ต้องใช้บรรทัดนี้!
});

// comment
router.post('/posts/:slug/comments', requireAuth, async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });
  post.comments.push({ author: req.session.user.id, body: req.body.body });
  await post.save();
  // notify owner
  if (req.session.user.id !== post.author.toString()) {
    const owner = await User.findById(post.author);
    owner.notifications.unshift({ type: 'comment', message: `${req.session.user.username} คอมเมนต์โพสต์ของคุณ`, link: `/posts/${post.slug}` });
    await owner.save();
  }
  res.redirect('/posts/' + post.slug);
});

// edit owner
router.get('/posts/:slug/edit', requireAuth, async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });
  if (!post) return res.status(404).send('Not found');
  if (post.author.toString() !== req.session.user.id) return res.status(403).send('Forbidden');
  res.render('posts/edit', { post });
});
router.post(                 // เเก้ไขโพสได้ทั้งรูปภาพ เเละ pdf
  '/posts/:slug',
  requireAuth,
  upload.fields([{ name: 'cover', maxCount: 1 }]),
  async (req, res) => {
    try {
      const post = await Post.findOne({ slug: req.params.slug });
      if (!post) return res.status(404).send('Not found');
      if (post.author.toString() !== req.session.user.id)
        return res.status(403).send('Forbidden');

      const { title, body, tags } = req.body;
      if (title) post.title = title;
      if (body) post.body = body;
      post.tags = Array.isArray(tags) ? tags : [tags];

      
      if (req.files && req.files['cover']) {
        const file = req.files['cover'][0];
        const mime = file.mimetype;

        if (mime.startsWith('image/')) {
          post.coverImage = `data:${mime};base64,${file.buffer.toString('base64')}`;
          post.pdfFile = null;
          post.pdfName = null;
        } else if (mime === 'application/pdf') {
          post.pdfFile = `data:${mime};base64,${file.buffer.toString('base64')}`;
          post.pdfName = file.originalname; 
          post.coverImage = null;
        }
      }

      await post.save();
      res.redirect('/posts/' + post.slug);
    } catch (err) {
      console.error(err);
      res.status(500).send('เกิดข้อผิดพลาดในการแก้ไขโพสต์');
    }
  }
);

// delete or report button
//soft delete แทนการลบจริง
router.post('/posts/:slug/delete', requireAuth, async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });
  if (!post) return res.status(404).send('Not found');
  if (post.author.toString() !== req.session.user.id && req.session.user.role !== 'admin') return res.status(403).send('Forbidden');
  //Soft delete
  post.deleted = true;
  post.deletedAt = new Date();
  await post.save();

  res.redirect('/');
});

router.get('/posts/:slug/report', requireAuth, async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });
  if (!post) return res.status(404).send('Not found');
  res.render('posts/report', { post });
});
router.post('/posts/:slug/report', requireAuth, async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });
  post.reports.push({ reporter: req.session.user.id, reasonTitle: req.body.title, reasonBody: req.body.body });
  await post.save();
  res.redirect('/posts/' + post.slug);
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
