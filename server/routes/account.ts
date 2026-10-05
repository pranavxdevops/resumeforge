import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, inArray, gte, count } from 'drizzle-orm';
import multer from 'multer';
import { db } from '../db';
import {
  profiles,
  users,
  notifications,
  portfolios,
  resumes,
  resumeViews,
  resumeDownloads,
  jobDescriptions,
} from '../schema';
import { personalSchema } from '../../shared/resume';
import { getResume, HttpError } from '../resumes';
import { hashPassword } from '../security';
import { uploadImage } from '../services';
import { validatePhotoOwnership } from '../validation';
export const accountRouter = Router();
accountRouter.get('/activity', async (req, res) => {
  const [result] = await db
    .select({ jobMatches: count() })
    .from(jobDescriptions)
    .where(eq(jobDescriptions.userId, req.user!.id));
  res.json(result);
});
accountRouter.get('/profile', async (req, res) => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.user!.id));
  res.json(profile);
});
accountRouter.put('/profile', async (req, res) => {
  const data = z.object({ personal: personalSchema, bio: z.string().max(3000) }).parse(req.body);
  validatePhotoOwnership(data.personal.photo, req.user!.id);
  await db.update(profiles).set(data).where(eq(profiles.userId, req.user!.id));
  await db
    .update(users)
    .set({ name: data.personal.name || req.user!.name })
    .where(eq(users.id, req.user!.id));
  res.json(data);
});
accountRouter.put('/settings', async (req, res) => {
  const data = z
    .object({
      theme: z.enum(['light', 'dark', 'system']),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      emailNotifications: z.boolean(),
      productUpdates: z.boolean(),
      analytics: z.boolean(),
    })
    .parse(req.body);
  await db.update(users).set({ settings: data }).where(eq(users.id, req.user!.id));
  await db
    .update(portfolios)
    .set({ analytics: data.analytics })
    .where(eq(portfolios.userId, req.user!.id));
  res.json(data);
});
accountRouter.get('/notifications', async (req, res) =>
  res.json(
    await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.id))
      .orderBy(desc(notifications.createdAt))
      .limit(30),
  ),
);
accountRouter.post('/notifications/read', async (req, res) => {
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, req.user!.id));
  res.json({ ok: true });
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});
accountRouter.post('/profile/photo', upload.single('file'), async (req, res) => {
  const f = req.file;
  if (!f) throw new HttpError(400, 'Choose a JPG or PNG image.');
  const isPng =
    f.mimetype === 'image/png' &&
    /\.png$/i.test(f.originalname) &&
    f.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg =
    f.mimetype === 'image/jpeg' &&
    /\.jpe?g$/i.test(f.originalname) &&
    f.buffer[0] === 255 &&
    f.buffer[1] === 216 &&
    f.buffer[2] === 255;
  if (!isPng && !isJpeg) throw new HttpError(400, 'Choose a valid PNG or JPEG image up to 2 MB.');
  const key = `${req.user!.id}/${crypto.randomUUID()}.${isPng ? 'png' : 'jpg'}`;
  await uploadImage(key, f.buffer, f.mimetype);
  res.json({ key });
});
accountRouter.get('/portfolio', async (req, res) => {
  const [page] = await db.select().from(portfolios).where(eq(portfolios.userId, req.user!.id));
  if (!page) return res.json(null);
  const { passwordHash, ...safe } = page;
  res.json({ ...safe, hasPassword: !!passwordHash });
});
accountRouter.put('/portfolio', async (req, res) => {
  const data = z
    .object({
      resumeId: z.string(),
      slug: z
        .string()
        .min(3)
        .max(50)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      visibility: z.enum(['public', 'private', 'password']),
      password: z.string().max(128).optional(),
      theme: z.enum(['studio', 'editorial', 'minimal']),
      analytics: z.boolean(),
    })
    .parse(req.body);
  const resume = await getResume(data.resumeId, req.user!.id);
  if (data.visibility !== 'private' && !resume.personal.name.trim())
    throw new HttpError(400, 'Add your name before publishing this resume.');
  if (resume.status === 'archived')
    throw new HttpError(400, 'Restore this resume before publishing.');
  if (process.env.NODE_ENV === 'production' && data.visibility !== 'private' && !req.user!.verified)
    throw new HttpError(403, 'Verify your email before publishing.');
  const [existing] = await db.select().from(portfolios).where(eq(portfolios.userId, req.user!.id));
  const [taken] = await db.select().from(portfolios).where(eq(portfolios.slug, data.slug));
  if (taken && taken.userId !== req.user!.id)
    throw new HttpError(409, 'This public address is already taken.');
  if (
    data.visibility === 'password' &&
    !existing?.passwordHash &&
    (!data.password || data.password.length < 10)
  )
    throw new HttpError(400, 'Use a portfolio password with at least 10 characters.');
  if (data.password && data.password.length < 10)
    throw new HttpError(400, 'Use at least 10 characters for the portfolio password.');
  const { password, ...rest } = data;
  const values = {
    ...rest,
    passwordHash: password ? await hashPassword(password) : existing?.passwordHash || null,
  };
  await db.transaction(async (tx) => {
    if (existing) await tx.update(portfolios).set(values).where(eq(portfolios.id, existing.id));
    else
      await tx
        .insert(portfolios)
        .values({ id: crypto.randomUUID(), userId: req.user!.id, ...values });
    if (existing && existing.resumeId !== data.resumeId)
      await tx
        .update(resumes)
        .set({ status: 'draft' })
        .where(and(eq(resumes.id, existing.resumeId), eq(resumes.userId, req.user!.id)));
    await tx
      .update(resumes)
      .set({ status: data.visibility === 'private' ? 'draft' : 'published' })
      .where(eq(resumes.id, data.resumeId));
  });
  res.json({ ...rest, hasPassword: !!values.passwordHash, url: `/r/${data.slug}` });
});
accountRouter.get('/analytics', async (req, res) => {
  const owned = await db
    .select({ id: resumes.id })
    .from(resumes)
    .where(eq(resumes.userId, req.user!.id));
  let ids = owned.map((r) => r.id);
  if (req.query.resumeId) {
    await getResume(String(req.query.resumeId), req.user!.id);
    ids = [String(req.query.resumeId)];
  }
  if (!ids.length)
    return res.json({
      views: 0,
      visitors: 0,
      downloads: 0,
      weeklyViews: 0,
      weeklyDownloads: 0,
      series: [],
      devices: [],
      referrers: [],
    });
  const views = await db
    .select()
    .from(resumeViews)
    .where(
      and(
        inArray(resumeViews.resumeId, ids),
        gte(resumeViews.createdAt, new Date(Date.now() - 90 * 86400000)),
      ),
    );
  const downloads = await db
    .select()
    .from(resumeDownloads)
    .where(
      and(
        inArray(resumeDownloads.resumeId, ids),
        gte(resumeDownloads.createdAt, new Date(Date.now() - 90 * 86400000)),
      ),
    );
  const week = Date.now() - 7 * 86400000;
  const series = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
    return {
      date,
      views: views.filter((v) => v.createdAt.toISOString().startsWith(date)).length,
      downloads: downloads.filter((v) => v.createdAt.toISOString().startsWith(date)).length,
    };
  });
  const counts = (key: 'device' | 'referrer') =>
    Object.entries(
      views.reduce<Record<string, number>>((acc, v) => {
        acc[v[key]] = (acc[v[key]] || 0) + 1;
        return acc;
      }, {}),
    ).map(([name, value]) => ({ name, value }));
  res.json({
    views: views.length,
    visitors: new Set(views.map((v) => v.visitor)).size,
    downloads: downloads.length,
    weeklyViews: views.filter((v) => v.createdAt.getTime() > week).length,
    weeklyDownloads: downloads.filter((v) => v.createdAt.getTime() > week).length,
    series,
    devices: counts('device'),
    referrers: counts('referrer'),
  });
});
