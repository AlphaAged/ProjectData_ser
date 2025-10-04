import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadPath = path.join(process.cwd(), 'public', 'uploads');

// ถ้าโฟลเดอร์ยังไม่มี ให้สร้างมัน
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log('📂 Created upload folder:', uploadPath);
} else {
  console.log('📂 Upload folder exists:', uploadPath);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 7) + ext);
  }
});

export default multer({ storage });
