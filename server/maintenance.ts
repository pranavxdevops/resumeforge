import { lt } from 'drizzle-orm';
import { db } from './db';
import { sessions, authTokens, resumeViews, resumeDownloads } from './schema';
export async function cleanupExpiredData() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.delete(authTokens).where(lt(authTokens.expiresAt, new Date()));
  const cutoff = new Date(Date.now() - 90 * 86400000);
  await db.delete(resumeViews).where(lt(resumeViews.createdAt, cutoff));
  await db.delete(resumeDownloads).where(lt(resumeDownloads.createdAt, cutoff));
}
