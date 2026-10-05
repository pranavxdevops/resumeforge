import { Router, type Request } from 'express';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { portfolios, resumeViews, resumeDownloads, resumes } from '../schema';
import { getResume, HttpError } from '../resumes';
import { verifyPassword, signValue, randomToken, cookieOptions, hash } from '../security';
import { makePdf, readImage } from '../services';
export const publicRouter = Router();
function publicResume(resume: Awaited<ReturnType<typeof getResume>>) {
  const visible = new Set(resume.sections.filter((s) => s.visible).map((s) => s.key));
  return {
    ...resume,
    summary: visible.has('summary') ? resume.summary : '',
    entries: Object.fromEntries(
      Object.entries(resume.entries).map(([key, entries]) => [
        key,
        visible.has(key as any) ? entries : [],
      ]),
    ),
    personal: { ...resume.personal, photo: resume.style.showPhoto ? resume.personal.photo : '' },
  };
}
async function visiblePage(slug: string, req: Request) {
  const [page] = await db.select().from(portfolios).where(eq(portfolios.slug, slug));
  if (!page || page.visibility === 'private')
    throw new HttpError(404, 'This portfolio is private or no longer available.');
  const resume = await getResume(page.resumeId);
  if (resume.status === 'archived')
    throw new HttpError(404, 'This portfolio is no longer available.');
  const cookie = req.cookies[`rf_portfolio_${page.id}`];
  const expected = signValue(`${page.id}:${page.passwordHash}`);
  if (page.visibility === 'password' && cookie !== expected && req.user?.id !== page.userId)
    throw new HttpError(401, 'This portfolio is password protected.');
  return { page, resume };
}
publicRouter.post('/public/:slug/unlock', async (req, res) => {
  const { password } = z.object({ password: z.string().max(128) }).parse(req.body);
  const [page] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.slug, String(req.params.slug)));
  if (
    !page ||
    page.visibility !== 'password' ||
    !page.passwordHash ||
    !(await verifyPassword(password, page.passwordHash))
  )
    throw new HttpError(401, 'The portfolio password is incorrect.');
  res
    .cookie(`rf_portfolio_${page.id}`, signValue(`${page.id}:${page.passwordHash}`), {
      ...cookieOptions,
      maxAge: 3600000,
    })
    .json({ ok: true });
});
publicRouter.get('/public/:slug', async (req, res) => {
  const { page, resume } = await visiblePage(String(req.params.slug), req);
  res.set('Cache-Control', 'no-store').json({
    resume: publicResume(resume),
    theme: page.theme,
    analytics: page.analytics,
    slug: page.slug,
  });
});
publicRouter.post('/public/:slug/view', async (req, res) => {
  const { page } = await visiblePage(String(req.params.slug), req);
  if (page.analytics && req.get('dnt') !== '1') {
    let visitor = req.cookies.rf_visitor;
    if (!visitor) {
      visitor = randomToken();
      res.cookie('rf_visitor', visitor, { ...cookieOptions, maxAge: 90 * 86400000 });
    }
    let referrer = 'Direct';
    try {
      const ref = String(req.body.referrer || '');
      if (ref) referrer = new URL(ref).hostname.slice(0, 150);
    } catch {
      /* invalid referrer omitted */
    }
    const agent = req.get('user-agent') || '';
    await db.insert(resumeViews).values({
      id: crypto.randomUUID(),
      resumeId: page.resumeId,
      visitor: hash(visitor + page.id),
      referrer,
      device: /mobile|android|iphone/i.test(agent)
        ? 'Mobile'
        : /ipad|tablet/i.test(agent)
          ? 'Tablet'
          : 'Desktop',
    });
  }
  res.json({ ok: true });
});
publicRouter.post('/public/:slug/export', async (req, res) => {
  const { page, resume } = await visiblePage(String(req.params.slug), req);
  const pdf = await makePdf(resume);
  if (page.analytics && req.get('dnt') !== '1')
    await db.insert(resumeDownloads).values({ id: crypto.randomUUID(), resumeId: resume.id });
  res
    .set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"',
    })
    .send(Buffer.from(pdf));
});
publicRouter.get('/files/:key', async (req, res) => {
  const key = String(req.params.key);
  if (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(png|jpg)$/.test(key))
    throw new HttpError(404, 'Image not found.');
  if (!req.user || !key.startsWith(`${req.user.id}/`)) {
    const rows = await db
      .select({ page: portfolios, resume: resumes })
      .from(portfolios)
      .innerJoin(resumes, eq(resumes.id, portfolios.resumeId))
      .where(and(ne(portfolios.visibility, 'private'), eq(resumes.status, 'published')));
    if (
      !rows.some(
        (row) =>
          row.resume.personal.photo === key &&
          row.resume.style.showPhoto &&
          (row.page.visibility === 'public' ||
            req.cookies[`rf_portfolio_${row.page.id}`] ===
              signValue(`${row.page.id}:${row.page.passwordHash}`)),
      )
    )
      throw new HttpError(404, 'Image not found.');
  }
  const file = await readImage(key);
  if (!file.Body) throw new HttpError(404, 'Image not found.');
  res
    .set({
      'Content-Type': file.ContentType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
    })
    .send(Buffer.from(await file.Body.transformToByteArray()));
});
