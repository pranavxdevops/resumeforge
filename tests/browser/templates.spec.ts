import { test, expect } from '@playwright/test';
import { sampleResume } from '../../shared/templatePreview';
import { templates } from '../../shared/resume';
const headers = { 'X-ResumeForge': '1' };
let email = '';
test.beforeEach(async ({ page }) => {
  email = `gallery-${crypto.randomUUID()}@example.com`;
  const res = await page.request.post('/api/auth/register', {
    headers,
    data: { name: 'Gallery Reviewer', email, password: 'ResumeForge!2026' },
  });
  expect(res.status()).toBe(201);
});
test.afterEach(async ({ page }) => {
  await page.request.delete('/api/auth/account', {
    headers,
    data: { confirmation: 'DELETE', password: 'ResumeForge!2026' },
  });
});
test('every sample template shows full paper and complete content; favorites, filters and zoom work', async ({
  page,
}) => {
  await page.goto('/templates');
  await expect(page.locator('.template-card')).toHaveCount(templates.length);
  for (const template of templates) {
    const card = page.getByRole('article', { name: template.name, exact: true });
    await card.scrollIntoViewIfNeeded();
    const paper = card.locator('.preview-scale .resume-paper');
    await expect(paper.first()).toContainText('Alex Morgan');
    await expect(card.locator('.resume-preview')).toHaveAttribute('data-pages', '1');
    for (const text of [
      'TechNova Solutions',
      'CloudWorks Technologies',
      'Terraform',
      'Cloud Infrastructure Automation',
      'University of Technology',
      'Certified Kubernetes Administrator',
    ])
      await expect(paper).toContainText(text);
    const geometry = await paper.evaluate((el) => {
      const p = el.getBoundingClientRect();
      const content = Array.from(
        el.querySelectorAll('.resume-entry,.resume-section h2,.resume-section p'),
      ).map((e) => e.getBoundingClientRect());
      return {
        ratio: p.width / p.height,
        overflow: content.some((r) => r.bottom > p.bottom + 1 || r.right > p.right + 1),
      };
    });
    expect(geometry.ratio).toBeCloseTo(210 / 297, 2);
    expect(geometry.overflow).toBe(false);
    const labelsFit = await card.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return Array.from(
        el.querySelectorAll(
          '.template-description h3,.template-description .badge,.template-actions .btn',
        ),
      ).every((node) => {
        const bounds = node.getBoundingClientRect();
        return bounds.left >= box.left - 1 && bounds.right <= box.right + 1;
      });
    });
    expect(labelsFit).toBe(true);
    await card.screenshot({ path: `test-results/template-${template.id}.png` });
  }
  await page.getByRole('button', { name: 'Favorite Modern Tech', exact: true }).click();
  await page.getByRole('tab', { name: 'My favorites', exact: true }).click();
  await expect(page.locator('.template-card')).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Favorite Modern Tech', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Search templates').fill('minimal');
  await expect(page.locator('.template-card')).toHaveCount(1);
  await page.getByLabel('Search templates').fill('');
  await page.getByLabel('Sort templates').selectOption('Name Z–A');
  await expect(page.locator('.template-card').first()).toHaveAttribute('aria-label', 'Modern Tech');
  await page.getByRole('button', { name: 'Preview Modern Tech', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Certified Kubernetes Administrator');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.getByLabel('Preview zoom')).toHaveText('125%');
  await page.screenshot({ path: 'test-results/template-modal.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Sort templates').selectOption('Recommended');
  await page.locator('.template-card').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/templates-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Preview ATS Classic', exact: true }).click();
  await expect(page.getByRole('dialog').locator('.preview-scale .resume-paper')).toBeVisible();
  await page.screenshot({ path: 'test-results/template-modal-mobile.png', animations: 'disabled' });
});
test('existing user data survives switching and long previews expose every page', async ({
  page,
}) => {
  const created = await (
    await page.request.post('/api/resumes', { headers, data: { name: 'My actual career' } })
  ).json();
  const content = sampleResume();
  content.personal.name = 'Jamie Taylor';
  content.personal.title = 'Platform Engineer';
  content.entries.experience = Array.from({ length: 9 }, (_, i) => ({
    id: `role-${i}`,
    fields: { ...content.entries.experience[0].fields, title: `Platform role ${i + 1}` },
  }));
  const original = { ...content, id: created.id, name: created.name, revision: created.revision };
  expect(
    (await page.request.put(`/api/resumes/${created.id}`, { headers, data: original })).status(),
  ).toBe(200);
  await page.goto('/templates');
  await expect(page.getByLabel('Preview content')).toHaveValue(created.id);
  const card = page.getByRole('article', { name: 'Modern Horizon', exact: true });
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('.preview-scale')).toContainText('Jamie Taylor');
  await expect(card.locator('.preview-scale')).not.toContainText('Alex Morgan');
  await card.getByRole('button', { name: 'Preview Modern Horizon', exact: true }).click();
  const papers = page.getByRole('dialog').locator('.preview-scale .resume-paper');
  expect(await papers.count()).toBeGreaterThan(1);
  await expect(page.getByRole('dialog').locator('.preview-scale')).toContainText('Platform role 9');
  await page.getByRole('dialog').getByRole('button', { name: 'Use this template' }).click();
  await page.getByRole('button', { name: 'Apply template', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/resumes/${created.id}/edit`));
  const saved = await (await page.request.get(`/api/resumes/${created.id}`)).json();
  expect(saved.template).toBe('modern-horizon');
  for (const key of ['personal', 'summary', 'entries', 'sections'])
    expect(saved[key]).toEqual(original[key as keyof typeof original]);
  await expect(page.locator('.preview-scale')).toContainText('Platform role 9');
});

test('a new resume uses the chosen template accent and the user profile without sample content', async ({
  page,
}) => {
  await page.goto('/resumes/new');
  const card = page.getByRole('article', { name: 'Creative Banner', exact: true });
  await card.scrollIntoViewIfNeeded();
  await card.getByRole('button', { name: 'Use this template', exact: true }).click();
  await page.getByLabel('Give your resume a name').fill('My banner resume');
  await page.getByRole('button', { name: 'Create resume', exact: true }).click();
  await expect(page).toHaveURL(/\/resumes\/.+\/edit/);
  const id = page.url().split('/').at(-2);
  const resume = await (await page.request.get(`/api/resumes/${id}`)).json();
  expect(resume.template).toBe('creative-banner');
  expect(resume.style.accent).toBe(templates.find((t) => t.id === 'creative-banner')!.accent);
  expect(resume.personal.name).toBe('Gallery Reviewer');
  expect(resume.summary).toBe('');
  expect(resume.entries.experience).toEqual([]);
  await expect(page.locator('.preview-scale .resume-paper h1')).toHaveText('Gallery Reviewer');
});
