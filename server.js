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

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
//app.use(express.static( 'public'));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));

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
  const posts = await Post.find().sort({createdAt:-1}).limit(12).populate('author');
  res.render('home', { posts });
});

// Search by tag & keyword
app.get('/search', async (req,res)=>{
  const {q, tag} = req.query;
  const filter = {};
  if (tag) filter.tags = tag;
  if (q) filter.$or = [{title: new RegExp(q,'i')},{body: new RegExp(q,'i')}];
  const posts = await Post.find(filter).sort({createdAt:-1}).limit(50).populate('author');
  res.render('search', { posts, q:q||'', tag:tag||'' });
});

app.listen(PORT, ()=>console.log(`App running on http://localhost:${PORT}`));
