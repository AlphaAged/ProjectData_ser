// src/utils/handleDbFull.js
import { purgeAllExceptAdminUsers } from './cleanup.js';

function looksLikeDbFull(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    err?.code === 292 ||                          
    msg.includes('no disk use allowed') ||
    msg.includes('quota') ||
    msg.includes('exceeded') ||
    msg.includes('out of memory')
  );
}

export async function handleDatabaseFullError(err) {
  if (!looksLikeDbFull(err)) throw err;

  if (process.env.ENABLE_DB_PURGE !== 'true') {
    console.error('DB full detected, but purge is DISABLED. Set ENABLE_DB_PURGE=true to allow cleanup.');
    throw err;
  }
  console.warn('Database limit exceeded. Starting destructive cleanup (preserve admin users)…');
  await purgeAllExceptAdminUsers();
  console.info('Cleanup completed (non-admin users & other collections removed).');
}
