import mongoose from 'mongoose';

const USERS_COLLECTION = process.env.USERS_COLLECTION || 'users';

export async function purgeAllExceptAdminUsers() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB is not connected');

  const collections = await db.listCollections().toArray();

  for (const coll of collections) {
    const name = coll.name;

    if (name === USERS_COLLECTION) {
      // ลบที่ไม่ใช่ admin
      await db.collection(name).deleteMany({ role: { $ne: 'admin' } });
      continue;
    }
    // ลบข้อมูลทุก collection อื่น ๆ ทั้งหมด
    await db.collection(name).deleteMany({});
  }
}
