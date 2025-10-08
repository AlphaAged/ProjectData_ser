// src/utils/handleDbFull.js
import { purgeAllExceptAdminUsers } from './cleanup.js';

function looksLikeDbFull(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    err?.code === 292 ||                                
    msg.includes('queryexceededmemorylimit') ||
    msg.includes('no disk use allowed') ||
    msg.includes('quota') ||
    msg.includes('exceeded') ||
    msg.includes('out of memory')
  );
}

export async function handleDatabaseFullError(err) {
  if (!looksLikeDbFull(err)) throw err;

  if (process.env.ENABLE_DB_PURGE !== 'true') {
    console.error(' DB full detected but purge DISABLED. Set ENABLE_DB_PURGE=true');
    throw err;
  }

  console.warn('DB limit exceeded → destructive cleanup (preserve admin users)…');
  await purgeAllExceptAdminUsers();
  console.info('Cleanup completed.');
}
