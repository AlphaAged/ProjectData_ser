import mongoose from 'mongoose';
import { purgeAllExceptAdminUsers } from './cleanup.js';

async function getUsageRatio() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB is not connected');

  try {
    const admin = db.admin();
    const status = await admin.serverStatus();
    const used = status?.fs?.usedSize ?? (status?.fs?.totalSize - status?.fs?.freeSize);
    const total = status?.fs?.totalSize;

    if (typeof used === 'number' && typeof total === 'number' && total > 0) {
      return used / total;
    }
  } catch (_) {

  }


  try {
    const stats = await db.command({ dbStats: 1, scale: 1 });
    const approxUsed = (stats.dataSize || 0) + (stats.indexSize || 0);
    let approxTotal = stats.storageSize || 0;

    if ((approxTotal === 0 || approxTotal < approxUsed) && process.env.DB_CAPACITY_BYTES) {
      approxTotal = Number(process.env.DB_CAPACITY_BYTES);
    }

    if (approxTotal > 0) {
      return approxUsed / approxTotal;
    }
  } catch (_) {}

  if (process.env.DB_USED_BYTES && process.env.DB_CAPACITY_BYTES) {
    const used = Number(process.env.DB_USED_BYTES);
    const total = Number(process.env.DB_CAPACITY_BYTES);
    if (total > 0) return used / total;
  }

  return -1;
}

export function startStorageGuard() {
  const enabled = process.env.ENABLE_DB_PURGE === 'true';
  if (!enabled) {
    console.warn('[GUARD] Disabled (ENABLE_DB_PURGE != true)');
    return;
  }

  const threshold = Number(process.env.STORAGE_GUARD_THRESHOLD || 0.9);
  const intervalMs = Number(process.env.STORAGE_GUARD_INTERVAL_MS || 5 * 60 * 1000);

  const tick = async () => {
    try {
      const ratio = await getUsageRatio();
      if (ratio < 0) {
        console.warn('[GUARD] Cannot read storage usage; skip this round.');
        return;
      }

      const percent = (ratio * 100).toFixed(2);
      console.log(`[GUARD] Storage usage ~ ${percent}% (threshold ${threshold * 100}%)`);

      if (ratio >= threshold) {
        console.warn('[GUARD] Threshold exceeded → purge now (preserve admin users)');
        await purgeAllExceptAdminUsers();
        console.info('[GUARD] Purge done.');
      }
    } catch (e) {
      console.error('[GUARD] tick error:', e?.message || e);
    }
  };

  tick();
  const id = setInterval(tick, intervalMs);

  return id;
}
