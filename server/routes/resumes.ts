import { Router } from 'express';
import { z } from 'zod';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { resumes, versions, profiles, resumeDownloads, portfolios } from '../schema';
import { blankResume, resumeSchema, templates } from '../../shared/resume';
import { getResume, listResumes, saveResume, HttpError } from '../resumes';
import { makePdf } from '../services';
import { validatePhotoOwnership } from '../validation';
export const resumeRouter = Router();
resumeRouter.get('/', async (req, res) => res.json(await listResumes(req.user!.id)));
resumeRouter.post('/', async (req, res) => {
  const data = z
    .object({
      name: z.string().min(1).max(120).default('Untitled resume'),
      template: z.string().optional(),
      useProfile: z.boolean().default(true),
    })
    .parse(req.body);
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.user!.id));
  const resume = blankResume(data.name, data.useProfile ? profile?.personal : undefined);
  resume.summary = data.useProfile ? profile?.bio || '' : '';
  const template = templates.find((t) => t.id === data.template);
  if (template) {
    resume.template = template.id;
    resume.style.accent = template.accent;
  }
  res.status(201).json(await saveResume(resume, req.user!.id, true));
});
resumeRouter.get('/:id', async (req, res) =>
  res.json(await getResume(String(req.params.id), req.user!.id)),
);
resumeRouter.put('/:id', async (req, res) => {
  const data = resumeSchema.parse(req.body);
  validatePhotoOwnership(data.personal.photo, req.user!.id);
  if (data.id !== req.params.id) throw new HttpError(400, 'Resume ID does not match.');
  if (!templates.some((t) => t.id === data.template)) throw new HttpError(400, 'Unknown template.');
  const current = await getResume(data.id, req.user!.id);
  // Publishing is controlled exclusively by portfolio settings. A stale editor
  // must not re-publish a page that was made private in another window.
  if (data.status === 'published') data.status = current.status;
  if (data.status !== 'archived' && current.status === 'published') data.status = 'published';
  const saved = await saveResume(data, req.user!.id);
  if (data.status === 'archived')
    await db
      .update(portfolios)
      .set({ visibility: 'private' })
      .where(and(eq(portfolios.resumeId, data.id), eq(portfolios.userId, req.user!.id)));
  res.json(saved);
});
resumeRouter.delete('/:id', async (req, res) => {
  await getResume(String(req.params.id), req.user!.id);
  await db
    .delete(resumes)
    .where(and(eq(resumes.id, String(req.params.id)), eq(resumes.userId, req.user!.id)));
  res.json({ ok: true });
});
resumeRouter.post('/:id/duplicate', async (req, res) => {
  const original = await getResume(String(req.params.id), req.user!.id);
  const copy = {
    ...original,
    id: crypto.randomUUID(),
    name: `${original.name.slice(0, 110)} (copy)`,
    status: 'draft' as const,
    revision: 0,
  };
  res.status(201).json(await saveResume(copy, req.user!.id, true));
});
resumeRouter.get('/:id/versions', async (req, res) => {
  await getResume(String(req.params.id), req.user!.id);
  res.json(
    await db
      .select({ id: versions.id, number: versions.number, createdAt: versions.createdAt })
      .from(versions)
      .where(eq(versions.resumeId, String(req.params.id)))
      .orderBy(desc(versions.number))
      .limit(100),
  );
});
resumeRouter.post('/:id/versions/:version/restore', async (req, res) => {
  const current = await getResume(String(req.params.id), req.user!.id);
  const [version] = await db
    .select()
    .from(versions)
    .where(and(eq(versions.id, String(req.params.version)), eq(versions.resumeId, current.id)));
  if (!version) throw new HttpError(404, 'Version not found.');
  res.json(
    await saveResume(
      { ...version.snapshot, status: current.status, revision: current.revision },
      req.user!.id,
    ),
  );
});
resumeRouter.post('/:id/export', async (req, res) => {
  const resume = await getResume(String(req.params.id), req.user!.id);
  if (!resume.personal.name.trim())
    throw new HttpError(400, 'Add your name before exporting your resume.');
  const pdf = await makePdf(resume);
  await db.insert(resumeDownloads).values({ id: crypto.randomUUID(), resumeId: resume.id });
  res
    .set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${resume.name.replace(/[^a-zA-Z0-9 -]/g, '').slice(0, 80) || 'resume'}.pdf"`,
    })
    .send(Buffer.from(pdf));
});
