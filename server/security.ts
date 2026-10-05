import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
  createHmac,
} from 'node:crypto';
import { promisify } from 'node:util';
import { and, eq, gt } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { sessions, users } from './schema';
import { HttpError } from './resumes';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${((await scrypt(password, salt, 64)) as Buffer).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('hex');
export const secret = process.env.SESSION_SECRET || randomToken();
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
)
  throw new Error('SESSION_SECRET must contain at least 32 random characters.');
const localHttp =
  process.env.ALLOW_INSECURE_LOCAL_COOKIES === 'true' &&
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.APP_URL || '');
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' && !localHttp,
  sameSite: 'lax' as const,
  path: '/',
};
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      name: string;
      email: string;
      verified: boolean;
      settings: Record<string, unknown>;
    };
    sessionId?: string;
  }
}
export async function sessionMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies.rf_session;
    if (token) {
      const [row] = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(and(eq(sessions.tokenHash, hash(token)), gt(sessions.expiresAt, new Date())));
      if (row) {
        req.user = {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
          verified: row.user.verified,
          settings: row.user.settings,
        };
        req.sessionId = row.session.id;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Your session has expired. Please sign in.'));
  next();
}
export async function createSession(userId: string, req: Request, res: Response) {
  const token = randomToken();
  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hash(token),
    agent: req.get('user-agent')?.slice(0, 250) || 'Unknown browser',
    expiresAt: new Date(Date.now() + 7 * 86400000),
  });
  res.cookie('rf_session', token, { ...cookieOptions, maxAge: 7 * 86400000 });
}
export function signValue(value: string) {
  return createHmac('sha256', secret).update(value).digest('hex');
}
export function csrf(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  const allowed = process.env.APP_URL || 'http://localhost:5173';
  if (
    origin &&
    origin !== allowed &&
    !(
      process.env.NODE_ENV !== 'production' &&
      ['http://127.0.0.1:5173', 'http://localhost:5173'].includes(origin)
    )
  )
    return next(new HttpError(403, 'This request came from an unrecognized origin.'));
  if (req.get('x-resumeforge') !== '1')
    return next(new HttpError(403, 'Missing request verification header.'));
  next();
}
