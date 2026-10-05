import { plainText, type Resume } from './resume';
export type Analysis = {
  score: number;
  breakdown: { name: string; score: number; description: string }[];
  suggestions: {
    priority: 'high' | 'medium' | 'low';
    title: string;
    detail: string;
    section: string;
  }[];
  wordCount: number;
};
export function analyzeResume(resume: Resume): Analysis {
  const text = plainText(resume);
  const words = text.split(/\s+/).filter(Boolean).length;
  const visible = new Set(resume.sections.filter((s) => s.visible).map((s) => s.key));
  const experience = visible.has('experience') ? resume.entries.experience || [] : [];
  const skills = visible.has('skills') ? resume.entries.skills || [] : [];
  const summary = visible.has('summary') ? resume.summary : '';
  const contact =
    [
      resume.personal.name,
      resume.personal.email,
      resume.personal.phone,
      resume.personal.location,
    ].filter(Boolean).length * 25;
  const completeness =
    [
      !!summary,
      experience.length > 0,
      visible.has('education') && (resume.entries.education || []).length > 0,
      skills.length >= 3,
      !!resume.personal.title,
    ].filter(Boolean).length * 20;
  const quantified = experience.filter((e) =>
    /\d+[%+]?/.test((e.fields.achievements || '') + ' ' + (e.fields.description || '')),
  ).length;
  const experienceScore = experience.length
    ? Math.min(
        100,
        45 +
          (quantified / experience.length) * 35 +
          (experience.every((e) => e.fields.start && e.fields.title && e.fields.organization)
            ? 20
            : 0),
      )
    : 0;
  const format =
    100 -
    (resume.style.fontSize < 10 ? 15 : 0) -
    (resume.style.columns === 'two' ? 15 : 0) -
    (['creative', 'designer', 'modern-split'].includes(resume.template) ? 10 : 0);
  const skillsScore = Math.min(100, skills.length * 12);
  const readability = words < 120 ? 35 : words > 1000 ? 55 : words > 750 ? 80 : 95;
  const breakdown = [
    {
      name: 'Completeness',
      score: completeness,
      description: 'Summary, experience, education, skills, and title',
    },
    {
      name: 'Formatting',
      score: format,
      description: 'Readable typography and predictable structure',
    },
    {
      name: 'Experience',
      score: Math.round(experienceScore),
      description: 'Complete roles and measurable achievements',
    },
    { name: 'Skills', score: skillsScore, description: 'Clearly listed professional skills' },
    { name: 'Contact details', score: contact, description: 'Name, email, phone, and location' },
    { name: 'Readability', score: readability, description: `${words} words in your resume` },
  ];
  const suggestions: Analysis['suggestions'] = [];
  if (!summary)
    suggestions.push({
      priority: 'high',
      title: 'Introduce your professional story',
      detail: 'Add a short summary describing your experience, strengths, and next career step.',
      section: 'summary',
    });
  if (!experience.length)
    suggestions.push({
      priority: 'high',
      title: 'Add your work experience',
      detail: 'Include a role, organization, dates, and the work you contributed.',
      section: 'experience',
    });
  if (experience.length > quantified)
    suggestions.push({
      priority: 'high',
      title: 'Make your impact measurable',
      detail:
        'Where accurate, add a number, time saving, or measurable outcome to each role. Never invent results.',
      section: 'experience',
    });
  if (skills.length < 8)
    suggestions.push({
      priority: 'medium',
      title: 'Make your skills easier to find',
      detail: 'List relevant tools and capabilities as individual skills. Tailor them to the role.',
      section: 'skills',
    });
  if (contact < 100)
    suggestions.push({
      priority: 'high',
      title: 'Complete your contact details',
      detail: 'Include your name, email, phone, and location so hiring teams can reach you.',
      section: 'personal',
    });
  if (!visible.has('experience') || !visible.has('skills'))
    suggestions.push({
      priority: 'medium',
      title: 'Check hidden sections',
      detail: 'Your experience or skills section is hidden from the exported resume.',
      section: 'experience',
    });
  if (words > 750)
    suggestions.push({
      priority: 'low',
      title: 'Give your content room to breathe',
      detail: 'Prioritize your most relevant achievements and shorten repetitive descriptions.',
      section: 'summary',
    });
  if (format < 100)
    suggestions.push({
      priority: 'low',
      title: 'Consider a simpler layout',
      detail: 'A single-column ATS template can improve parsing by automated tools.',
      section: 'design',
    });
  return {
    score: Math.round(breakdown.reduce((s, b) => s + b.score, 0) / breakdown.length),
    breakdown,
    suggestions,
    wordCount: words,
  };
}
const dictionary = [
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'Terraform',
  'Jenkins',
  'GitLab CI/CD',
  'GitHub Actions',
  'Linux',
  'PowerShell',
  'Python',
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'SQL',
  'PostgreSQL',
  'Redis',
  'Helm',
  'Argo CD',
  'AWS EKS',
  'Ansible',
  'Prometheus',
  'Grafana',
  'CI/CD',
  'Java',
  'Go',
  'REST',
  'GraphQL',
  'Agile',
  'Scrum',
  'Figma',
  'Excel',
  'Leadership',
  'Communication',
  'Project management',
  'Data analysis',
  'Machine learning',
  'Networking',
  'Security',
  'Bash',
  'SRE',
  'DevOps',
];
const aliases: Record<string, string[]> = {
  AWS: ['amazon web services'],
  Kubernetes: ['k8s'],
  'Argo CD': ['argocd'],
  'AWS EKS': ['eks'],
  GCP: ['google cloud'],
  'Node.js': ['nodejs', 'node js'],
  'CI/CD': ['continuous integration', 'continuous delivery'],
};
export function analyzeImportedText(text: string): Analysis {
  const wordCount = text.trim().split(/\s+/).length;
  const email = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text);
  const phone = /(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/.test(text);
  const sections = [
    /\b(summary|profile|about me|objective)\b/i,
    /\b(experience|employment|work history)\b/i,
    /\b(education|qualifications)\b/i,
    /\b(skills|competencies|technologies)\b/i,
  ];
  const found = sections.filter((p) => p.test(text)).length;
  const detectedSkills = dictionary.filter((t) => hasTerm(text, t));
  const quantified = /\d+\s*(%|percent|hours|days|users|clients|projects|services)/i.test(text);
  const dated = /\b(?:19|20)\d{2}\b/.test(text);
  const unusual = (text.match(/�/g) || []).length;
  const breakdown = [
    {
      name: 'Sections',
      score: found * 25,
      description: `${found} of 4 common section headings detected`,
    },
    {
      name: 'Contact details',
      score: (email ? 50 : 0) + (phone ? 50 : 0),
      description: 'Email and phone detected in extracted text',
    },
    {
      name: 'Recognized skills',
      score: Math.min(100, detectedSkills.length * 12),
      description: `${detectedSkills.length} terms recognized; custom skills may not be detected`,
    },
    {
      name: 'Impact evidence',
      score: (quantified ? 65 : 10) + (dated ? 35 : 0),
      description: 'Dates and quantified results in extracted text',
    },
    {
      name: 'Text extraction',
      score: Math.max(0, 100 - unusual * 5),
      description: 'Readable text only; original visual layout is not scored',
    },
    {
      name: 'Readability',
      score: wordCount < 120 ? 35 : wordCount > 1000 ? 55 : wordCount > 750 ? 80 : 95,
      description: `${wordCount} words extracted`,
    },
  ];
  const suggestions: Analysis['suggestions'] = [];
  if (found < 4)
    suggestions.push({
      priority: 'high',
      title: 'Make your sections explicit',
      detail:
        'Use recognizable Summary, Experience, Education, and Skills headings. Check that the extracted text retained them.',
      section: 'summary',
    });
  if (!quantified)
    suggestions.push({
      priority: 'high',
      title: 'Show an outcome you can verify',
      detail: 'Add a real measure of impact, such as a percentage improvement or time saved.',
      section: 'experience',
    });
  if (!email || !phone)
    suggestions.push({
      priority: 'high',
      title: 'Check your contact details',
      detail:
        'An email address or phone number was not detected. Ensure it appears as readable text.',
      section: 'personal',
    });
  suggestions.push({
    priority: 'low',
    title: 'Review the original layout',
    detail:
      'Text extraction cannot reliably assess columns, fonts, or visual reading order. Confirm these manually before submitting.',
    section: 'design',
  });
  return {
    score: Math.round(breakdown.reduce((s, b) => s + b.score, 0) / breakdown.length),
    breakdown,
    suggestions,
    wordCount,
  };
}
function hasTerm(text: string, term: string) {
  return [term, ...(aliases[term] || [])].some((t) =>
    new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`, 'i').test(
      text,
    ),
  );
}
export function matchJob(resume: Resume, description: string) {
  const text = plainText(resume);
  const required = dictionary.filter((t) => hasTerm(description, t));
  const matched = required.filter((t) => hasTerm(text, t));
  const missing = required.filter((t) => !hasTerm(text, t));
  const years = description.match(/(\d+)\+?\s*(?:years|yrs)/i)?.[1];
  const degree = description.match(/(?:bachelor|master|doctorate|degree)[^.!\n]{0,75}/i)?.[0];
  return {
    score: required.length ? Math.round((matched.length / required.length) * 100) : null,
    matched,
    missing,
    required: required.filter(
      (t) =>
        !new RegExp(
          `(?:preferred|nice to have|bonus)[^\n.]*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
          'i',
        ).test(description),
    ),
    preferred: required.filter((t) =>
      new RegExp(
        `(?:preferred|nice to have|bonus)[^\n.]*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        'i',
      ).test(description),
    ),
    experience: years
      ? `${years}+ years requested. Review your relevant experience against this requirement.`
      : 'No explicit years-of-experience requirement detected.',
    education: degree || 'No explicit education requirement detected.',
    suggestions: missing.length
      ? [
          'Include missing keywords only when they reflect your actual experience.',
          'Emphasize relevant achievements in your summary and recent roles.',
        ]
      : [
          'Your listed skills cover the recognized terms. Review responsibilities and seniority manually.',
        ],
  };
}
