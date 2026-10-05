import { blankResume, type Entry } from './resume';
const entry = (fields: Record<string, string>): Entry => ({ id: crypto.randomUUID(), fields });
export function demoResumes() {
  const r = blankResume('Cloud & DevOps Engineer', {
    name: 'Pranav Ravichandran',
    title: 'Cloud & DevOps Engineer',
    email: 'pranav@example.com',
    phone: '+91 98765 43210',
    location: 'Chennai, India',
    website: '',
    linkedin: 'https://linkedin.com/in/pranav-demo',
    github: 'https://github.com',
    photo: '',
  });
  r.summary =
    'Cloud & DevOps Engineer with 3+ years of experience building reliable infrastructure and improving developer workflows. Skilled in AWS, infrastructure as code, and container orchestration. Passionate about turning complex operations into simple, repeatable systems.';
  r.entries.experience = [
    entry({
      title: 'Cloud Support Associate',
      organization: 'Northstar Technologies',
      location: 'Chennai, India',
      start: '2023-06',
      end: '',
      current: 'true',
      description:
        'Support cloud infrastructure and collaborate with engineering teams to deliver reliable services.',
      achievements:
        'Automated infrastructure provisioning with Terraform, reducing setup time by 40%.\nBuilt CI/CD pipelines using Jenkins and Docker for 12 microservices.\nImproved incident response by introducing Prometheus and Grafana monitoring.',
    }),
    entry({
      title: 'Cloud Engineering Intern',
      organization: 'Orbit Systems',
      location: 'Remote',
      start: '2022-07',
      end: '2023-05',
      description:
        'Assisted with AWS infrastructure, Linux administration, and deployment automation.',
      achievements:
        'Created reusable deployment scripts that saved 6 hours of manual work each week.',
    }),
  ];
  r.entries.education = [
    entry({
      title: 'Bachelor of Engineering',
      field: 'Computer Science',
      organization: 'Anna University',
      start: '2018-08',
      end: '2022-05',
      grade: '8.4 / 10',
      description: '',
    }),
  ];
  r.entries.skills = [
    'AWS',
    'Azure',
    'Docker',
    'Kubernetes',
    'Terraform',
    'Jenkins',
    'GitLab CI/CD',
    'Linux',
    'PowerShell',
    'Prometheus',
    'Grafana',
  ].map((title) =>
    entry({
      title,
      category: ['AWS', 'Azure'].includes(title) ? 'Cloud platforms' : 'DevOps & infrastructure',
      level: 'Advanced',
    }),
  );
  r.entries.projects = [
    entry({
      title: 'Cloud Infrastructure Automation',
      description:
        'Reusable Terraform modules and GitLab pipelines for secure, repeatable AWS environments.',
      technologies: 'AWS · Terraform · GitLab CI/CD',
      url: '',
      github: '',
      start: '2025-03',
    }),
  ];
  r.entries.certifications = [
    entry({
      title: 'AWS Certified Solutions Architect – Associate',
      organization: 'Amazon Web Services',
      start: '2024-08',
      end: '2027-08',
      credentialId: '',
      url: '',
    }),
  ];
  const r2 = structuredClone(r);
  r2.id = crypto.randomUUID();
  r2.name = 'Cloud Solutions Architect';
  r2.personal.title = 'Cloud Solutions Architect';
  r2.template = 'modern';
  r2.style.accent = '#147d76';
  const r3 = structuredClone(r);
  r3.id = crypto.randomUUID();
  r3.name = 'Platform Engineer';
  r3.personal.title = 'Platform Engineer';
  r3.template = 'ats-classic';
  r3.style.accent = '#263245';
  r3.summary = '';
  r3.entries.projects = [];
  return [r, r2, r3];
}
