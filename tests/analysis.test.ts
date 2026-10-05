import { describe, it, expect } from 'vitest';
import { blankResume, resumeSchema } from '../shared/resume';
import { demoResumes } from '../shared/demo';
import { analyzeResume, matchJob } from '../shared/analysis';
describe('Resume analysis and validation', () => {
  it('provides meaningful, bounded scores for empty and complete resumes', () => {
    const empty = analyzeResume(blankResume());
    const complete = analyzeResume(demoResumes()[0]);
    expect(empty.score).toBeLessThan(complete.score);
    expect(complete.score).toBeLessThanOrEqual(100);
    expect(empty.suggestions.some((s) => s.section === 'experience')).toBe(true);
  });
  it('detects exact technology names, aliases, and missing skills', () => {
    const result = matchJob(
      demoResumes()[0],
      'Required: Amazon Web Services, k8s, Terraform, Helm, ArgoCD and AWS EKS. 5+ years experience. Bachelor degree preferred.',
    );
    expect(result.matched).toEqual(expect.arrayContaining(['AWS', 'Kubernetes', 'Terraform']));
    expect(result.missing).toEqual(expect.arrayContaining(['Helm', 'Argo CD', 'AWS EKS']));
    expect(result.experience).toContain('5+ years');
  });
  it('does not match short skills inside unrelated words', () => {
    const result = matchJob(
      blankResume(),
      'We seek an ongoing, outgoing colleague with excellent organization.',
    );
    expect(result.required).not.toContain('Go');
    expect(result.score).toBeNull();
  });
  it('rejects unsafe links and duplicate section ordering', () => {
    const r = blankResume();
    r.personal.website = 'javascript:alert(1)';
    expect(resumeSchema.safeParse(r).success).toBe(false);
    r.personal.website = '';
    r.sections[1] = r.sections[0];
    expect(resumeSchema.safeParse(r).success).toBe(false);
  });
  it('preserves data when switching templates', () => {
    const r = demoResumes()[0];
    const changed = { ...r, template: 'designer' };
    expect(resumeSchema.parse(changed).entries).toEqual(r.entries);
    expect(changed.personal).toEqual(r.personal);
  });
});
