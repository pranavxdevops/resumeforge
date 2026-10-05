import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
import { migrate, closeDatabase } from '../server/db';
import type { Resume } from '../shared/resume';
const app = createApp();
const owner = request.agent(app);
const other = request.agent(app);
const visitor = request.agent(app);
const header = { 'X-ResumeForge': '1' };
let resume: Resume;
let resetToken = '';
let verification = '';
beforeAll(async () => {
  await migrate();
});
afterAll(closeDatabase);
describe.sequential('Authenticated product lifecycle', () => {
  it('registers a user, hashes credentials, and creates a secure session', async () => {
    const result = await owner
      .post('/api/auth/register')
      .set(header)
      .send({ name: 'Test Engineer', email: 'owner@example.com', password: 'StrongPassword!26' });
    expect(result.status).toBe(201);
    expect(result.body.user.passwordHash).toBeUndefined();
    expect(String(result.headers['set-cookie'])).toContain('HttpOnly');
    verification = new URL(result.body.developmentLink).searchParams.get('token')!;
    const me = await owner.get('/api/auth/me');
    expect(me.body.user.email).toBe('owner@example.com');
    await other
      .post('/api/auth/register')
      .set(header)
      .send({ name: 'Other User', email: 'other@example.com', password: 'AnotherPassword!26' })
      .expect(201);
  });
  it('consumes email verification tokens only once', async () => {
    await owner
      .post('/api/auth/verify-email')
      .set(header)
      .send({ token: verification })
      .expect(200);
    await owner
      .post('/api/auth/verify-email')
      .set(header)
      .send({ token: verification })
      .expect(400);
    expect((await owner.get('/api/auth/me')).body.user.verified).toBe(true);
  });
  it('blocks cross-origin writes and missing request verification headers', async () => {
    await owner.post('/api/resumes').send({ name: 'Forbidden' }).expect(403);
    await owner
      .post('/api/resumes')
      .set(header)
      .set('Origin', 'https://evil.example')
      .send({ name: 'Forbidden' })
      .expect(403);
  });
  it('creates a structured resume from the owner profile', async () => {
    const r = await owner
      .post('/api/resumes')
      .set(header)
      .send({ name: 'Engineering resume' })
      .expect(201);
    resume = r.body;
    expect(resume.personal.name).toBe('Test Engineer');
    expect(resume.sections).toHaveLength(13);
    expect(resume.revision).toBe(1);
  });
  it('enforces ownership for read, edit, export, duplicate, versions and deletion', async () => {
    await other.get(`/api/resumes/${resume.id}`).expect(404);
    await other.put(`/api/resumes/${resume.id}`).set(header).send(resume).expect(404);
    await other.post(`/api/resumes/${resume.id}/export`).set(header).expect(404);
    await other.post(`/api/resumes/${resume.id}/duplicate`).set(header).expect(404);
    await other.get(`/api/resumes/${resume.id}/versions`).expect(404);
    await other.delete(`/api/resumes/${resume.id}`).set(header).expect(404);
  });
  it('saves content, ordering, typography and visibility without changing entry identifiers', async () => {
    resume.summary = 'Cloud engineer with experience in automation and dependable systems.';
    resume.entries.experience = [
      {
        id: 'stable-id',
        fields: {
          title: 'Engineer',
          organization: 'Test Co',
          start: '2022-01',
          description: 'Reduced deployment time by 40%.',
        },
      },
    ];
    resume.entries.skills = [
      { id: 'skill-1', fields: { title: 'AWS' } },
      { id: 'skill-2', fields: { title: 'Terraform' } },
    ];
    resume.sections.reverse();
    resume.style.font = 'Merriweather';
    resume.style.accent = '#147d76';
    resume.template = 'modern';
    const r = await owner.put(`/api/resumes/${resume.id}`).set(header).send(resume).expect(200);
    resume = r.body;
    const loaded = (await owner.get(`/api/resumes/${resume.id}`).expect(200)).body;
    expect(loaded.entries.experience[0].id).toBe('stable-id');
    expect(loaded.sections[0].key).toBe('references');
    expect(loaded.style.font).toBe('Merriweather');
    resume = (await owner.put(`/api/resumes/${resume.id}`).set(header).send(resume).expect(200))
      .body;
    expect((await owner.get(`/api/resumes/${resume.id}`)).body.entries.experience[0].id).toBe(
      'stable-id',
    );
  });
  it('detects stale edits instead of overwriting newer data', async () => {
    await owner
      .put(`/api/resumes/${resume.id}`)
      .set(header)
      .send({ ...resume, revision: 1 })
      .expect(409);
  });
  it('rejects a photo belonging to another account', async () => {
    await owner
      .put(`/api/resumes/${resume.id}`)
      .set(header)
      .send({
        ...resume,
        personal: {
          ...resume.personal,
          photo: `${crypto.randomUUID()}/${crypto.randomUUID()}.png`,
        },
      })
      .expect(400);
  });
  it('duplicates independently and restores a saved version', async () => {
    const copy = (await owner.post(`/api/resumes/${resume.id}/duplicate`).set(header).expect(201))
      .body;
    expect(copy.id).not.toBe(resume.id);
    expect(copy.personal).toEqual(resume.personal);
    const versions = (await owner.get(`/api/resumes/${resume.id}/versions`)).body;
    const original = versions.find((v: any) => v.number === 1);
    resume = (
      await owner
        .post(`/api/resumes/${resume.id}/versions/${original.id}/restore`)
        .set(header)
        .expect(200)
    ).body;
    expect(resume.summary).toBe('');
    expect(resume.revision).toBe(4);
    resume = (
      await owner
        .post(`/api/resumes/${resume.id}/versions/${versions[0].id}/restore`)
        .set(header)
        .expect(200)
    ).body;
    expect(resume.entries.experience).toHaveLength(1);
  });
  it('provides actual analyzer and matcher results and protects analysis ownership', async () => {
    const analysis = await owner
      .post('/api/analyzer')
      .set(header)
      .send({ resumeId: resume.id })
      .expect(200);
    expect(analysis.body.breakdown.length).toBeGreaterThan(4);
    const match = await owner
      .post('/api/job-matcher')
      .set(header)
      .send({
        resumeId: resume.id,
        description: 'Required experience with AWS and Terraform. Helm is preferred.',
      })
      .expect(200);
    expect(match.body.matched).toContain('AWS');
    expect(match.body.missing).toContain('Helm');
    await other.post('/api/analyzer').set(header).send({ resumeId: resume.id }).expect(404);
  });
  it('returns an honest recoverable error when AI is unconfigured', async () => {
    await owner
      .post('/api/ai/improve')
      .set(header)
      .send({ resumeId: resume.id, text: 'Managed cloud servers', action: 'Improve' })
      .expect(503);
  });
  it('saves real cover letters and tracks interview progress', async () => {
    const letter = (
      await owner
        .post('/api/cover-letters')
        .set(header)
        .send({
          resumeId: resume.id,
          company: 'Acme',
          title: 'Cloud Engineer',
          tone: 'Professional',
          content: 'Dear Hiring Team,\nI am applying for the cloud engineering role.',
        })
        .expect(201)
    ).body;
    await other
      .put(`/api/cover-letters/${letter.id}`)
      .set(header)
      .send({ company: 'Acme', title: 'Engineer', content: 'Not mine' })
      .expect(404);
    const questions = (
      await owner
        .post('/api/interview-questions')
        .set(header)
        .send({ resumeId: resume.id })
        .expect(200)
    ).body;
    expect(questions.length).toBeGreaterThanOrEqual(3);
    await owner
      .patch(`/api/interview-questions/${questions[0].id}`)
      .set(header)
      .send({ completed: true, saved: true })
      .expect(200);
    const saved = (await owner.get('/api/interview-questions')).body.find(
      (q: any) => q.id === questions[0].id,
    );
    expect(saved.completed).toBe(true);
  });
  it('publishes and tracks a portfolio, then revokes public access', async () => {
    await owner
      .put('/api/portfolio')
      .set(header)
      .send({
        resumeId: resume.id,
        slug: 'test-engineer',
        visibility: 'public',
        theme: 'studio',
        analytics: true,
      })
      .expect(200);
    const r = await visitor.get('/api/public/test-engineer').expect(200);
    expect(r.body.resume.personal.name).toBe('Test Engineer');
    await visitor
      .post('/api/public/test-engineer/view')
      .set(header)
      .send({ referrer: 'https://example.com/path?private=1' })
      .expect(200);
    const a = (await owner.get('/api/analytics')).body;
    expect(a.views).toBe(1);
    expect(a.referrers[0].name).toBe('example.com');
    await owner
      .put('/api/portfolio')
      .set(header)
      .send({
        resumeId: resume.id,
        slug: 'test-engineer',
        visibility: 'private',
        theme: 'studio',
        analytics: true,
      })
      .expect(200);
    await visitor.get('/api/public/test-engineer').expect(404);
    await visitor.post('/api/public/test-engineer/export').set(header).expect(404);
  });
  it('protects portfolio HTML data and exports behind a password', async () => {
    await owner
      .put('/api/portfolio')
      .set(header)
      .send({
        resumeId: resume.id,
        slug: 'test-engineer',
        visibility: 'password',
        password: 'PortfolioSecret26',
        theme: 'minimal',
        analytics: false,
      })
      .expect(200);
    await visitor.get('/api/public/test-engineer').expect(401);
    await visitor.post('/api/public/test-engineer/export').set(header).expect(401);
    await visitor
      .post('/api/public/test-engineer/unlock')
      .set(header)
      .send({ password: 'incorrect' })
      .expect(401);
    await visitor
      .post('/api/public/test-engineer/unlock')
      .set(header)
      .send({ password: 'PortfolioSecret26' })
      .expect(200);
    await visitor.get('/api/public/test-engineer').expect(200);
    await visitor.post('/api/public/test-engineer/view').set(header).send({}).expect(200);
    expect((await owner.get('/api/analytics')).body.views).toBe(1);
  });
  it('rejects disguised uploads', async () => {
    await owner
      .post('/api/analyzer/import')
      .set(header)
      .attach('file', Buffer.from('<script>bad</script>'), {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });
  it('renders a real downloadable PDF from the shared document renderer', async () => {
    const r = await owner.post(`/api/resumes/${resume.id}/export`).set(header).expect(200);
    expect(r.headers['content-type']).toContain('application/pdf');
    expect(r.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(r.body.length).toBeGreaterThan(5000);
  });
  it('resets passwords, invalidates sessions, and rejects token reuse', async () => {
    const r = await owner
      .post('/api/auth/forgot-password')
      .set(header)
      .send({ email: 'owner@example.com' })
      .expect(200);
    resetToken = new URL(r.body.developmentLink).searchParams.get('token')!;
    await owner
      .post('/api/auth/reset-password')
      .set(header)
      .send({ token: resetToken, password: 'UpdatedPassword!26' })
      .expect(200);
    await owner.get('/api/resumes').expect(401);
    await owner
      .post('/api/auth/reset-password')
      .set(header)
      .send({ token: resetToken, password: 'AnotherPassword26' })
      .expect(400);
    await owner
      .post('/api/auth/login')
      .set(header)
      .send({ email: 'owner@example.com', password: 'StrongPassword!26' })
      .expect(401);
    await owner
      .post('/api/auth/login')
      .set(header)
      .send({ email: 'owner@example.com', password: 'UpdatedPassword!26' })
      .expect(200);
  });
  it('requires explicit confirmation and current password to delete an account', async () => {
    await owner
      .delete('/api/auth/account')
      .set(header)
      .send({ confirmation: 'DELETE', password: 'incorrect' })
      .expect(400);
    await owner
      .delete('/api/auth/account')
      .set(header)
      .send({ confirmation: 'DELETE', password: 'UpdatedPassword!26' })
      .expect(200);
    expect((await owner.get('/api/auth/me')).body.user).toBeNull();
    await visitor.get('/api/public/test-engineer').expect(404);
  });
});
