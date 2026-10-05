import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import { makePdf } from '../server/services';
import { demoResumes } from '../shared/demo';
import { templates } from '../shared/resume';
import { sampleResume } from '../shared/templatePreview';
describe('Shared renderer PDF fidelity', () => {
  it('renders every template with selectable names and complete experience', async () => {
    for (const template of templates) {
      const r = sampleResume();
      r.template = template.id;
      r.style.accent = template.accent;
      const bytes = await makePdf(r);
      const parser = new PDFParse({ data: bytes });
      try {
        const result = await parser.getText();
        expect(result.total).toBe(1);
        for (const text of [
          'Alex Morgan',
          'TechNova Solutions',
          'CloudWorks Technologies',
          'Terraform',
          'Cloud Infrastructure Automation',
          'University of Technology',
          'Certified Kubernetes Administrator',
        ])
          expect(result.text.replace(/\s+/g, ' ').toLowerCase()).toContain(text.toLowerCase());
      } finally {
        await parser.destroy();
      }
    }
  }, 60000);
  it('flows long content onto multiple A4 pages without dropping the final role', async () => {
    const r = demoResumes()[0];
    r.entries.experience = Array.from({ length: 8 }, (_, i) => ({
      id: crypto.randomUUID(),
      fields: {
        ...r.entries.experience[0].fields,
        title: `Infrastructure Engineer ${i + 1}`,
        organization: `Career chapter ${i + 1}`,
      },
    }));
    const bytes = await makePdf(r);
    const parser = new PDFParse({ data: bytes.slice() });
    try {
      const result = await parser.getText();
      expect(result.total).toBeGreaterThan(1);
      expect(result.text).toContain('Infrastructure Engineer 8');
      expect(result.text).toContain('Anna University');
      await fs.mkdir('.data/qa', { recursive: true });
      await fs.writeFile('.data/qa/multipage-resume.pdf', bytes);
      await fs.writeFile(
        '.data/qa/pdf-report.json',
        JSON.stringify(
          {
            pages: result.total,
            finalRolePresent: result.text.includes('Infrastructure Engineer 8'),
          },
          null,
          2,
        ),
      );
    } finally {
      await parser.destroy();
    }
  });
  it('splits an oversized summary without leaving a header-only first page', async () => {
    const r = sampleResume();
    r.summary = Array.from(
      { length: 90 },
      (_, i) => `Improved service reliability and documented incident response outcome ${i}.`,
    ).join(' ');
    const bytes = await makePdf(r);
    const parser = new PDFParse({ data: bytes });
    try {
      const result = await parser.getText();
      expect(result.total).toBeGreaterThan(1);
      expect(result.pages[0].text.replace(/\s+/g, ' ')).toContain('outcome 0.');
      expect(result.text.replace(/\s+/g, ' ')).toContain('outcome 89.');
      expect(result.text.replace(/\s+/g, ' ')).toContain('Certified Kubernetes Administrator');
    } finally {
      await parser.destroy();
    }
  });
});
