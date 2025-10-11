import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import morgan from 'morgan';
import dotenv from 'dotenv';
import methodOverride from 'method-override';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/auth.js';
import postRoutes from './src/routes/posts.js';
import threadRoutes from './src/routes/threads.js';
import adminRoutes from './src/routes/admin.js';
import notifyRoutes from './src/routes/notifications.js';
import expressEjsLayouts from 'express-ejs-layouts';

dotenv.config();

  //แปลง path ให้ใช้กับ ES module // แปลง path ของไฟล์ปัจจุบันให้เป็นรูปแบบที่ Node.js เข้าใจได้
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

  //เพิ่ม port และ เชื่อมต่อฐานข้อมูล MongoDB
const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(()=>console.log('MongoDB connected'))
  .catch(err=>console.error('Mongo error', err));

// view engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(expressEjsLayouts);
app.set('layout', 'layouts/mainbar'); // default layout

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));

 //กรองตัวอักษรพิเศษ เพื่อป้องกัน XSS
app.use((req, res, next) => {
  res.locals.escapeHtml = (s) => String(s ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
  next();
});

 //ตั้งค่า session
app.use(session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000*60*60*24*7 } // 7 days
}));

//ทำให้ทุกหน้า EJS เข้าถึง currentUser, title, path/url ปัจจุบันได้
app.use((req,res,next)=>{
  res.locals.currentUser = req.session.user || null;
  res.locals.title = '';

  res.locals.currentPath = req.path;
  res.locals.currentUrl = req.originalUrl;
  next();
});

// routes
app.use('/', authRoutes);
app.use('/', notifyRoutes);
app.use('/', postRoutes);
app.use('/', threadRoutes);
app.use('/admin', adminRoutes);

// Home
 //ดึงข้อมูลโพสต์ล่าสุด 12 โพสต์ที่ยังไม่ถูกลบ มาแสดงที่หน้าแรก
import Post from './src/models/Post.js';
app.get('/', async (req,res)=>{
  const posts = await Post.find({ deleted: false }).sort({createdAt:-1}).limit(12).populate('author');
  res.render('home', { title: 'หน้าแรก', posts });
});


  // Search
app.get('/search', async (req,res)=>{
  const {q, tag} = req.query;
  const filter = {};
  if (tag) filter.tags = tag;
  if (q) filter.$or = [{title: new RegExp(q,'i')},{body: new RegExp(q,'i')}];
  const posts = await Post.find(filter).sort({createdAt:-1}).limit(50).populate('author');
  res.render('search', { title: 'ค้นหาสรุป', posts, q:q||'', tag:tag||'' });
});

 //ให้ console.log แสดง URL ที่ใช้เข้าถึงแอป
app.listen(PORT, ()=>console.log(`App running on http://localhost:${PORT}`));
