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
import { handleDatabaseFullError } from './src/utils/handleDbFull.js';
import { startStorageGuard } from './src/utils/storageGuard.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(()=>console.log('MongoDB connected'))
  .catch(err=>console.error('Mongo error', err));

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

// simple HTML escaping function for EJS templates  (usage: <%= escapeHtml(variable) %> )
// prevents XSS attacks
app.use((req, res, next) => {
  res.locals.escapeHtml = (s) => String(s ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000*60*60*24*7 } // 7 days
}));

// expose user to templates
app.use((req,res,next)=>{
  res.locals.currentUser = req.session.user || null;
  res.locals.title = '';
  // expose current request path for active nav link highlighting
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
import Post from './src/models/Post.js';
app.get('/', async (req,res)=>{
  const posts = await Post.find({ deleted: false }).sort({createdAt:-1}).limit(12).populate('author');
  res.render('home', { title: 'หน้าแรก', posts });
});


// Search by tag & keyword
app.get('/search', async (req,res)=>{
  const {q, tag} = req.query;
  const filter = {};
  if (tag) filter.tags = tag;
  if (q) filter.$or = [{title: new RegExp(q,'i')},{body: new RegExp(q,'i')}];
  const posts = await Post.find(filter).sort({createdAt:-1}).limit(50).populate('author');
  res.render('search', { title: 'ค้นหาสรุป', posts, q:q||'', tag:tag||'' });
});


//test DB full


app.use(async (err, req, res, next) => {
  try {
    await handleDatabaseFullError(err);
    return res.status(503).json({
      message: 'Database was full and has been cleaned. Please retry your request.',
    });
  } catch (e) {
    return next(err);
  }
});
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err?.message || err);
  res.status(500).json({ message: 'Internal server error' });
});


app.get('/Dbfull', async (req, res, next) => {
  try {
    const fake = new Error('QueryExceededMemoryLimitNoDiskUseAllowed');
    fake.code = 292;
    await handleDatabaseFullError(fake);
    res.json({ ok: true, note: 'Cleanup simulated (non-admin users & other collections removed)' });
  } catch (err) {
    next(err);
  }
});

process.on('unhandledRejection', async (reason) => {
  try { await handleDatabaseFullError(reason); }
  catch (_) {}
});

process.on('uncaughtException', async (err) => {
  try { await handleDatabaseFullError(err); }
  finally { /* ใส่อะไรดี*/ }
});


startStorageGuard();

app.listen(PORT, ()=>console.log(`App running on http://localhost:${PORT}`));
