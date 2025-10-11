import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

  // ตั้งค่าโฟลเดอร์เก็บไฟล์อัปโหลด
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

// ตั้งค่า multer ให้เก็บไฟล์ในหน่วยความจำก่อน (จะได้แปลงเป็น base64 ได้)
const storage = multer.memoryStorage();
const upload = multer({ storage });


export default multer({ storage });
