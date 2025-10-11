import mongoose from 'mongoose';

const USERS_COLLECTION = process.env.USERS_COLLECTION || 'users';

export async function purgeAllExceptAdminUsers() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB is not connected');

  const collections = await db.listCollections().toArray();
  console.warn('[PURGE] Collections:', collections.map(c => c.name));

  for (const coll of collections) {
    const name = coll.name;

    if (name === USERS_COLLECTION) {
      const { deletedCount } = await db.collection(name).deleteMany({ role: { $ne: 'admin' } });
      console.warn(`[PURGE] ${name}: deleted non-admin users = ${deletedCount}`);
      continue;
    }

    const { deletedCount } = await db.collection(name).deleteMany({});
    console.warn(`[PURGE] ${name}: deleted docs = ${deletedCount}`);
  }
  console.warn('[PURGE] Completed.');
}
