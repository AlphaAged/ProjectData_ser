
//เมื่อมีการเรียกใช้ middleware นี้จะเช็คว่ามีการล็อกอินหรือไม่
//ถ้าไม่มีจะถูกส่งไปที่หน้า login
//ถ้ามีจะสามารถเข้าถึงหน้าที่ต้องการได้
export const requireAuth = (req,res,next)=>{
  if (!req.session.user) return res.redirect('/login');
  next();
}
//เมื่อมีการเรียกใช้ middleware นี้จะเช็คว่าผู้ใช้ที่ล็อกอินเข้ามามีบทบาทเป็น admin หรือไม่
//ถ้าไม่ใช่จะถูกส่งกลับไปที่หน้าหลัก
//ถ้าใช่จะสามารถเข้าถึงหน้า admin ได้
export const requireAdmin = (req,res,next)=>{
  if (!req.session.user || req.session.user.role!=='admin') return res.status(403).send('Forbidden');
  next();
}
