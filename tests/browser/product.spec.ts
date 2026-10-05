import { test, expect, type Page } from '@playwright/test';
import { demoResumes } from '../../shared/demo';
let testEmail = '';
test.beforeEach(async ({ page }) => {
  testEmail = `browser-${crypto.randomUUID()}@example.com`;
  const headers = { 'X-ResumeForge': '1' };
  const registered = await page.request.post('/api/auth/register', {
    headers,
    data: { name: 'Pranav Ravichandran', email: testEmail, password: 'ResumeForge!2026' },
  });
  expect(registered.status()).toBe(201);
  for (const demo of demoResumes()) {
    const created = await page.request.post('/api/resumes', { headers, data: { name: demo.name } });
    const record = await created.json();
    const saved = await page.request.put(`/api/resumes/${record.id}`, {
      headers,
      data: { ...demo, id: record.id, revision: record.revision },
    });
    expect(saved.status()).toBe(200);
  }
});
test.afterEach(async ({ page }) => {
  const headers = { 'X-ResumeForge': '1' };
  await page.request.post('/api/auth/login', {
    headers,
    data: { email: testEmail, password: 'ResumeForge!2026' },
  });
  await page.request.delete('/api/auth/account', {
    headers,
    data: { confirmation: 'DELETE', password: 'ResumeForge!2026' },
  });
});
async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill(testEmail);
  await page.getByLabel('Password', { exact: true }).fill('ResumeForge!2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
test('landing and complete editor flow persist structured content and export a PDF', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Build a resume/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true });
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Welcome back, Pranav.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Create resume', exact: true }).click();
  await page
    .getByRole('article', { name: 'ATS Professional', exact: true })
    .getByRole('button', { name: 'Use this template' })
    .click();
  await page.getByLabel('Give your resume a name').fill('Browser test resume');
  await page.getByRole('button', { name: 'Create resume', exact: true }).click();
  await expect(page).toHaveURL(/\/resumes\/.+\/edit/);
  await page.getByLabel('Full name', { exact: true }).fill('Pranav Browser Test');
  await expect(page.locator('.preview-scale .resume-document h1')).toHaveText(
    'Pranav Browser Test',
  );
  // Navigating immediately must flush the edit, not lose the debounce window.
  await page.getByRole('link', { name: 'My resumes', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A resume for every opportunity.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Edit Browser test resume', exact: true }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Pranav Browser Test');
  await page.getByRole('button', { name: 'Professional summary', exact: true }).click();
  await page
    .getByLabel('Professional summary', { exact: true })
    .fill(
      'DevOps engineer who builds reliable cloud systems and helps teams deliver with confidence.',
    );
  await expect(page.getByText('All changes saved')).toBeVisible();
  await page.getByRole('button', { name: 'Work experience', exact: true }).click();
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await page.getByLabel('Job title', { exact: true }).fill('Cloud Engineer');
  await page.getByLabel('Company', { exact: true }).fill('Orbit Engineering');
  await page.getByLabel('Start date', { exact: true }).fill('2024-01');
  await page
    .getByLabel('Responsibilities', { exact: true })
    .fill('Automated deployments, reducing release time by 30%.');
  await page.getByRole('button', { name: 'Add experience', exact: true }).click();
  await expect(page.getByLabel('Job title', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Delete entry', exact: true }).last().click();
  await expect(page.getByLabel('Job title', { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Move Work experience up', exact: true }).click();
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: 'Modern Tech', exact: true }).click();
  await page.getByLabel('Font family', { exact: true }).selectOption('Lato');
  await page.getByLabel('Accent color', { exact: true }).fill('#147d76');
  await expect(page.locator('.preview-scale .resume-document').first()).toHaveClass(
    /template-modern-tech/,
  );
  await expect(page.getByText('All changes saved')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await expect(page.getByLabel('Font family')).toHaveValue('Lato');
  await expect(page.locator('.preview-scale .resume-document h1')).toHaveText(
    'Pranav Browser Test',
  );
  await page.screenshot({ path: 'test-results/editor-desktop.png', fullPage: true });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs('test-results/browser-resume.pdf');
  expect(download.suggestedFilename()).toContain('.pdf');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText('Version history', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('analyzer, matcher, cover letters, interviews and portfolio work end to end', async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Resume analyzer', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze resume', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The details behind your score' })).toBeVisible();
  await page.getByRole('link', { name: /Job matcher/ }).click();
  await page
    .getByLabel('Paste the job description')
    .fill(
      'Required skills: AWS, Docker, Terraform, Helm, Kubernetes. We need a cloud engineer with 3 years of experience.',
    );
  await page.getByRole('button', { name: 'Find my match' }).click();
  await expect(page.getByRole('heading', { name: 'Already in your resume' })).toBeVisible();
  await page.screenshot({ path: 'test-results/job-matcher-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Cover letters', exact: true }).click();
  await page.getByLabel('Company', { exact: true }).fill('Orbit Engineering');
  await page.getByLabel('Job title', { exact: true }).fill('Cloud Engineer');
  await page
    .getByLabel('Cover letter content')
    .fill(
      'Dear Hiring Team,\n\nI am excited to apply for the Cloud Engineer role. My experience building reliable infrastructure will help your team deliver with confidence.\n\nSincerely,\nPranav',
    );
  await page.getByRole('button', { name: 'Save letter', exact: true }).click();
  await page.getByRole('tab', { name: 'Saved letters' }).click();
  await expect(
    page.getByRole('heading', { name: 'Orbit Engineering', exact: true }).first(),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Interview prep', exact: true }).click();
  await page.getByRole('button', { name: 'Generate questions', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal answer guidance', exact: true }).first().click();
  await expect(page.getByText('A way to approach it')).toBeVisible();
  await page.getByRole('button', { name: 'Mark practiced', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Practiced', exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'My portfolio', exact: true }).click();
  await page.getByLabel('Public address').fill(testEmail.split('@')[0]);
  await page.getByLabel('Who can view your portfolio?').selectOption('public');
  await page.getByRole('button', { name: 'Publish portfolio', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open', exact: true })).toBeVisible();
  const publicPage = await page.context().newPage();
  await publicPage.goto('/r/' + testEmail.split('@')[0]);
  await expect(publicPage.getByRole('heading', { name: /Hi, I’m/ })).toBeVisible();
  await publicPage.close();
  await page.getByLabel('Who can view your portfolio?').selectOption('private');
  await page.getByRole('button', { name: 'Save portfolio settings' }).click();
  await expect(page.getByText('Portfolio saved privately')).toBeVisible();
});
test('mobile navigation, editor tabs and dark appearance are usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Welcome back, Pranav.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Continue editing', exact: true }).click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.editor-preview-panel')).toBeVisible();
  await expect(page.locator('.editor-form-panel')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/editor-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'test-results/settings-mobile-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/login/);
});
