import { blankResume, templates, type Resume, type Entry } from './resume';

/** Gallery-only content. Never persisted into a user's resume. */
export function sampleResume(): Resume {
  const resume = blankResume('Alex Morgan · sample resume', {
    name: 'Alex Morgan',
    title: 'Senior Cloud & DevOps Engineer',
    email: 'alex.morgan@email.com',
    phone: '+1 555 123 4567',
    location: 'New York, USA',
    linkedin: 'https://linkedin.com/in/alexmorgan',
    github: 'https://github.com/alexmorgan',
    website: '',
    photo: '',
  });
  let next = 0;
  const entry = (fields: Record<string, string>): Entry => ({ id: `sample-${next++}`, fields });
  resume.id = 'gallery-sample';
  resume.style = {
    ...resume.style,
    fontSize: 9.5,
    lineHeight: 1.3,
    margin: 15,
    spacing: 12,
    showIcons: false,
  };
  resume.summary =
    'Cloud and DevOps Engineer with 6+ years of experience designing, automating, and operating scalable cloud infrastructure across AWS and Azure. Experienced in Kubernetes, Terraform, Docker, CI/CD, monitoring, and infrastructure automation.';
  resume.entries.experience = [
    entry({
      title: 'Senior Cloud & DevOps Engineer',
      organization: 'TechNova Solutions',
      start: '2022',
      current: 'true',
      achievements:
        'Designed and maintained AWS infrastructure supporting 50+ production services.\nAutomated infrastructure provisioning using Terraform and reusable modules.\nBuilt CI/CD pipelines using GitHub Actions and Jenkins.\nManaged Kubernetes workloads across production environments.\nImplemented Prometheus and Grafana monitoring and alerting.',
    }),
    entry({
      title: 'Cloud Engineer',
      organization: 'CloudWorks Technologies',
      start: '2019',
      end: '2022',
      achievements:
        'Managed AWS EC2, VPC, IAM, S3 and RDS environments.\nAutomated operational tasks using Python and PowerShell.\nReduced deployment time through CI/CD automation.\nImplemented centralized logging and monitoring.',
    }),
  ];
  resume.entries.skills = [
    'AWS',
    'Azure',
    'Kubernetes',
    'Docker',
    'Terraform',
    'Jenkins',
    'GitHub Actions',
    'Linux',
    'Python',
    'PowerShell',
    'Prometheus',
    'Grafana',
  ].map((title) => entry({ title }));
  resume.entries.projects = [
    entry({
      title: 'Cloud Infrastructure Automation',
      description: 'Terraform-based infrastructure platform for automated AWS provisioning.',
    }),
    entry({
      title: 'Kubernetes Production Platform',
      description:
        'Containerized microservices platform deployed using Kubernetes, Helm and GitOps.',
    }),
  ];
  resume.entries.education = [
    entry({
      title: 'Bachelor of Computer Science',
      organization: 'University of Technology',
      start: '2018',
      end: '2021',
    }),
  ];
  resume.entries.certifications = [
    'AWS Certified Solutions Architect',
    'Microsoft Azure Administrator',
    'Certified Kubernetes Administrator',
  ].map((title) => entry({ title }));
  const order = ['summary', 'experience', 'skills', 'projects', 'education', 'certifications'];
  resume.sections.sort(
    (a, b) =>
      (order.indexOf(a.key) < 0 ? 99 : order.indexOf(a.key)) -
      (order.indexOf(b.key) < 0 ? 99 : order.indexOf(b.key)),
  );
  return resume;
}

export function hasResumeContent(resume: Resume) {
  return !!(
    resume.summary.trim() ||
    Object.values(resume.entries).some((entries) =>
      entries.some((e) => Object.values(e.fields).some((v) => v.trim())),
    )
  );
}

/** The same presentation-only change is used in the gallery and editor. */
export function withTemplate(resume: Resume, templateId: string): Resume {
  const template = templates.find((t) => t.id === templateId)!;
  return { ...resume, template: template.id, style: { ...resume.style, accent: template.accent } };
}

export const templateDetails: Record<string, { columns: number; bestFor: string; ats: string }> = {
  'ats-classic': { columns: 1, bestFor: 'Traditional roles & public service', ats: 'Strong' },
  'ats-professional': { columns: 1, bestFor: 'Experienced professionals', ats: 'Strong' },
  'ats-minimal': { columns: 1, bestFor: 'Career starters & general applications', ats: 'Strong' },
  'ats-executive': { columns: 1, bestFor: 'Senior specialists & management', ats: 'Strong' },
  modern: { columns: 1, bestFor: 'Product & business professionals', ats: 'Good' },
  'modern-tech': { columns: 1, bestFor: 'Developers, engineers & IT', ats: 'Good' },
  'modern-split': {
    columns: 2,
    bestFor: 'Technical & multidisciplinary roles',
    ats: 'Check reading order',
  },
  creative: { columns: 1, bestFor: 'Marketing & creative professionals', ats: 'Good' },
  designer: { columns: 1, bestFor: 'Designers & portfolio-led careers', ats: 'Good' },
  executive: { columns: 1, bestFor: 'Directors & business leaders', ats: 'Strong' },
  'ats-compact': {
    columns: 1,
    bestFor: 'Experienced specialists & detailed careers',
    ats: 'Strong',
  },
  'ats-scholar': { columns: 1, bestFor: 'Researchers, academics & educators', ats: 'Strong' },
  'ats-timeline': { columns: 1, bestFor: 'Progressive careers & project leadership', ats: 'Good' },
  'modern-horizon': {
    columns: 2,
    bestFor: 'Consultants & technical specialists',
    ats: 'Check reading order',
  },
  'modern-mono': { columns: 1, bestFor: 'Software, data & platform engineers', ats: 'Good' },
  'modern-grid': {
    columns: 2,
    bestFor: 'Operations & multidisciplinary careers',
    ats: 'Check reading order',
  },
  'creative-atelier': { columns: 1, bestFor: 'Writers, strategists & art directors', ats: 'Good' },
  'creative-banner': { columns: 1, bestFor: 'Brand, communications & marketing', ats: 'Good' },
  'executive-ledger': { columns: 1, bestFor: 'Business leaders & senior consultants', ats: 'Good' },
  'executive-summit': {
    columns: 2,
    bestFor: 'Directors & senior management',
    ats: 'Check reading order',
  },
};
