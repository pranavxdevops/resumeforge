import { Router } from 'express';
import { z } from 'zod';
import { and, eq, gt, ne } from 'drizzle-orm';
import { db } from '../db';
import { users, profiles, sessions, authTokens, subscriptions, notifications } from '../schema';
import {
  hashPassword,
  verifyPassword,
  hash,
  randomToken,
  createSession,
  cookieOptions,
  requireAuth,
} from '../security';
import { HttpError } from '../resumes';
import { sendMail, removeUserImages } from '../services';
import { emptyPersonal } from '../../shared/resume';
export const authRouter = Router();
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(10, 'Use at least 10 characters.').max(128),
});
const appURL = () => process.env.APP_URL || 'http://localhost:5173';
async function deliverToken(userId: string, email: string, type: 'verify' | 'reset') {
  const token = randomToken();
  await db.insert(authTokens).values({
    id: crypto.randomUUID(),
    userId,
    hash: hash(token),
    type,
    expiresAt: new Date(Date.now() + (type === 'verify' ? 86400000 : 3600000)),
  });
  return sendMail(
    email,
    type === 'verify' ? 'Verify your ResumeForge email' : 'Reset your ResumeForge password',
    `${appURL()}/${type === 'verify' ? 'verify-email' : 'reset-password'}?token=${token}`,
  );
}
authRouter.get('/config', (_req, res) =>
  res.json({
    google: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    ai: !!process.env.AI_API_KEY,
    development: process.env.NODE_ENV !== 'production',
  }),
);
authRouter.get('/me', (req, res) => res.json({ user: req.user || null }));
authRouter.post('/register', async (req, res) => {
  const data = credentials.extend({ name: z.string().trim().min(2).max(120) }).parse(req.body);
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email));
  if (existing)
    throw new HttpError(
      409,
      'An account with this email already exists. Sign in or reset your password.',
    );
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(data.password);
  await db.transaction(async (tx) => {
    await tx.insert(users).values({ id, name: data.name, email: data.email, passwordHash });
    await tx
      .insert(profiles)
      .values({ userId: id, personal: { ...emptyPersonal, name: data.name, email: data.email } });
    await tx.insert(subscriptions).values({ id: crypto.randomUUID(), userId: id });
    await tx.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: id,
      title: 'Welcome to your next chapter',
      body: 'Create your first resume, explore templates, and make your experience stand out.',
    });
  });
  await createSession(id, req, res);
  let mail: Record<string, unknown> = {};
  try {
    mail = await deliverToken(id, data.email, 'verify');
  } catch {
    mail = { emailDeliveryPending: true };
  }
  res.status(201).json({
    user: { id, name: data.name, email: data.email, verified: false, settings: {} },
    ...mail,
  });
});
authRouter.post('/login', async (req, res) => {
  const { email, password } = credentials.parse(req.body);
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    throw new HttpError(401, 'Email or password is incorrect.');
  await createSession(user.id, req, res);
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.verified,
      settings: user.settings,
    },
  });
});
authRouter.post('/logout', async (req, res) => {
  if (req.sessionId) await db.delete(sessions).where(eq(sessions.id, req.sessionId));
  res.clearCookie('rf_session', cookieOptions).json({ ok: true });
});
authRouter.post('/forgot-password', async (req, res) => {
  const { email } = z
    .object({ email: z.email().transform((v) => v.toLowerCase()) })
    .parse(req.body);
  const [user] = await db.select().from(users).where(eq(users.email, email));
  let mail = {};
  if (user) {
    try {
      mail = await deliverToken(user.id, email, 'reset');
    } catch {
      /* Do not disclose account existence or mail transport failures. */
    }
  }
  res.json({ message: 'If an account exists, a password reset link has been sent.', ...mail });
});
authRouter.post('/reset-password', async (req, res) => {
  const { token, password } = z
    .object({ token: z.string().length(64), password: credentials.shape.password })
    .parse(req.body);
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const [record] = await tx
      .delete(authTokens)
      .where(
        and(
          eq(authTokens.hash, hash(token)),
          eq(authTokens.type, 'reset'),
          gt(authTokens.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!record)
      throw new HttpError(400, 'This reset link is invalid or expired. Request a new one.');
    await tx.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
    await tx.delete(sessions).where(eq(sessions.userId, record.userId));
    await tx
      .delete(authTokens)
      .where(and(eq(authTokens.userId, record.userId), eq(authTokens.type, 'reset')));
  });
  res.clearCookie('rf_session', cookieOptions).json({ ok: true });
});
authRouter.post('/verify-email', async (req, res) => {
  const { token } = z.object({ token: z.string().length(64) }).parse(req.body);
  await db.transaction(async (tx) => {
    const [record] = await tx
      .delete(authTokens)
      .where(
        and(
          eq(authTokens.hash, hash(token)),
          eq(authTokens.type, 'verify'),
          gt(authTokens.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!record) throw new HttpError(400, 'This verification link is invalid or expired.');
    await tx.update(users).set({ verified: true }).where(eq(users.id, record.userId));
  });
  res.json({ ok: true });
});
authRouter.post('/resend-verification', requireAuth, async (req, res) => {
  if (req.user!.verified) return res.json({ message: 'Your email is already verified.' });
  res.json({
    message: 'Verification email sent.',
    ...(await deliverToken(req.user!.id, req.user!.email, 'verify')),
  });
});
authRouter.get('/sessions', requireAuth, async (req, res) =>
  res.json(
    await db
      .select({
        id: sessions.id,
        agent: sessions.agent,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, req.user!.id), gt(sessions.expiresAt, new Date()))),
  ),
);
authRouter.post('/logout-all', requireAuth, async (req, res) => {
  await db.delete(sessions).where(eq(sessions.userId, req.user!.id));
  res.clearCookie('rf_session', cookieOptions).json({ ok: true });
});
authRouter.post('/change-password', requireAuth, async (req, res) => {
  const data = z
    .object({ currentPassword: z.string().max(128), password: credentials.shape.password })
    .parse(req.body);
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
  if (!(await verifyPassword(data.currentPassword, user.passwordHash)))
    throw new HttpError(400, 'Your current password is incorrect.');
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(data.password) })
    .where(eq(users.id, user.id));
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, user.id), ne(sessions.id, req.sessionId!)));
  res.json({ ok: true });
});
authRouter.delete('/account', requireAuth, async (req, res) => {
  const data = z
    .object({ confirmation: z.literal('DELETE'), password: z.string().max(128) })
    .parse(req.body);
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
  if (!(await verifyPassword(data.password, user.passwordHash)))
    throw new HttpError(400, 'Your password is incorrect.');
  await removeUserImages(user.id);
  await db.delete(users).where(eq(users.id, user.id));
  res.clearCookie('rf_session', cookieOptions).json({ ok: true });
});
authRouter.get('/google', async (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) throw new HttpError(503, 'Google sign-in is not configured.');
  const state = randomToken();
  res.cookie('rf_oauth_state', state, { ...cookieOptions, maxAge: 600000 });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${appURL()}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  }).toString();
  res.redirect(url.toString());
});
authRouter.get('/google/callback', async (req, res) => {
  const { code, state } = z
    .object({ code: z.string().max(3000), state: z.string().length(64) })
    .parse(req.query);
  if (!req.cookies.rf_oauth_state || state !== req.cookies.rf_oauth_state)
    throw new HttpError(400, 'Invalid sign-in state. Please try again.');
  res.clearCookie('rf_oauth_state', cookieOptions);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appURL()}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new HttpError(400, 'Google sign-in failed. Try again.');
  const token = (await response.json()) as { access_token: string };
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(15000),
  });
  const profile = z
    .object({ email: z.email(), email_verified: z.literal(true), name: z.string().max(120) })
    .parse(await profileResponse.json());
  let [user] = await db.select().from(users).where(eq(users.email, profile.email.toLowerCase()));
  if (!user) {
    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id,
        email: profile.email.toLowerCase(),
        name: profile.name,
        passwordHash: await hashPassword(randomToken()),
        verified: true,
      });
      await tx.insert(profiles).values({
        userId: id,
        personal: { ...emptyPersonal, name: profile.name, email: profile.email },
      });
      await tx.insert(subscriptions).values({ id: crypto.randomUUID(), userId: id });
    });
    [user] = await db.select().from(users).where(eq(users.id, id));
  } else if (!user.verified) {
    throw new HttpError(403, 'Verify your existing account email before using Google sign-in.');
  }
  await createSession(user.id, req, res);
  res.redirect(`${appURL()}/dashboard`);
});
