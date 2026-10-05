import { z } from 'zod';

export const sectionNames = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'achievements',
  'awards',
  'publications',
  'volunteer',
  'interests',
  'references',
] as const;
export type SectionKey = (typeof sectionNames)[number];
export const sectionLabels: Record<SectionKey, string> = {
  summary: 'Professional summary',
  experience: 'Work experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  achievements: 'Achievements',
  awards: 'Awards',
  publications: 'Publications',
  volunteer: 'Volunteer experience',
  interests: 'Interests',
  references: 'References',
};
const safeLink = z
  .string()
  .max(2000)
  .refine((v) => !v || /^https?:\/\//i.test(v), 'Use a full http:// or https:// URL');
export const personalSchema = z.object({
  name: z.string().max(150),
  title: z.string().max(200),
  email: z.union([z.email(), z.literal('')]),
  phone: z.string().max(50),
  location: z.string().max(150),
  website: safeLink,
  linkedin: safeLink,
  github: safeLink,
  photo: z.string().max(500).default(''),
});
export const styleSchema = z.object({
  font: z.enum(['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Merriweather']),
  fontSize: z.number().min(9).max(18),
  headingSize: z.number().min(18).max(42),
  lineHeight: z.number().min(1).max(2),
  margin: z.number().min(12).max(35),
  spacing: z.number().min(8).max(32),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  heading: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  body: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  border: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  pageSize: z.enum(['A4', 'Letter']),
  columns: z.enum(['auto', 'one', 'two']),
  showPhoto: z.boolean(),
  showIcons: z.boolean(),
  showDates: z.boolean(),
});
export const entrySchema = z.object({
  id: z.string().max(100),
  fields: z.record(z.string().max(80), z.string().max(10000)),
});
export const resumeSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  template: z.string().max(40),
  status: z.enum(['draft', 'published', 'archived']),
  personal: personalSchema,
  summary: z.string().max(10000),
  sections: z
    .array(z.object({ key: z.enum(sectionNames), visible: z.boolean() }))
    .length(sectionNames.length)
    .refine(
      (items) => new Set(items.map((i) => i.key)).size === sectionNames.length,
      'Every section must appear once',
    ),
  entries: z.record(z.string(), z.array(entrySchema).max(100)),
  style: styleSchema,
  updatedAt: z.string(),
  revision: z.number().int().nonnegative(),
});
export type Resume = z.infer<typeof resumeSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type Personal = z.infer<typeof personalSchema>;
export type ResumeStyle = z.infer<typeof styleSchema>;
export const defaultStyle: ResumeStyle = {
  font: 'Inter',
  fontSize: 11,
  headingSize: 28,
  lineHeight: 1.5,
  margin: 20,
  spacing: 16,
  accent: '#3154df',
  heading: '#182132',
  body: '#424b5c',
  border: '#dfe3ec',
  pageSize: 'A4',
  columns: 'auto',
  showPhoto: false,
  showIcons: true,
  showDates: true,
};
export const emptyPersonal: Personal = {
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  website: '',
  linkedin: '',
  github: '',
  photo: '',
};
export function blankResume(name = 'Untitled resume', personal: Personal = emptyPersonal): Resume {
  return {
    id: crypto.randomUUID(),
    name,
    template: 'ats-professional',
    status: 'draft',
    personal: { ...personal },
    summary: '',
    sections: sectionNames.map((key) => ({
      key,
      visible: [
        'summary',
        'experience',
        'education',
        'skills',
        'projects',
        'certifications',
      ].includes(key),
    })),
    entries: Object.fromEntries(sectionNames.filter((k) => k !== 'summary').map((k) => [k, []])),
    style: { ...defaultStyle },
    updatedAt: new Date().toISOString(),
    revision: 0,
  };
}
export const templates = (
  [
    {
      id: 'ats-classic',
      name: 'ATS Classic',
      category: 'ATS',
      description: 'Timeless, clear, and effortlessly readable.',
      accent: '#263245',
      layout: 'classic',
    },
    {
      id: 'ats-professional',
      name: 'ATS Professional',
      category: 'ATS',
      description: 'A confident first impression for any role.',
      accent: '#3154df',
      layout: 'professional',
    },
    {
      id: 'ats-minimal',
      name: 'ATS Minimal',
      category: 'ATS',
      description: 'Space for the things that matter.',
      accent: '#343d48',
      layout: 'minimal',
    },
    {
      id: 'ats-executive',
      name: 'ATS Executive',
      category: 'ATS',
      description: 'A distinguished look for your next move.',
      accent: '#77553f',
      layout: 'executive',
    },
    {
      id: 'modern',
      name: 'Modern',
      category: 'Modern',
      description: 'Fresh structure. Lasting impression.',
      accent: '#147d76',
      layout: 'modern',
    },
    {
      id: 'modern-tech',
      name: 'Modern Tech',
      category: 'Modern',
      description: 'Built for the people building what’s next.',
      accent: '#3154df',
      layout: 'tech',
    },
    {
      id: 'modern-split',
      name: 'Modern Split',
      category: 'Modern',
      description: 'A thoughtful balance of skills and story.',
      accent: '#284c64',
      layout: 'split',
      columns: 2,
      sidebar: true,
    },
    {
      id: 'creative',
      name: 'Creative',
      category: 'Creative',
      description: 'A little personality goes a long way.',
      accent: '#9d453d',
      layout: 'creative',
    },
    {
      id: 'designer',
      name: 'Designer',
      category: 'Creative',
      description: 'Expressive typography, purposeful detail.',
      accent: '#7651b0',
      layout: 'designer',
    },
    {
      id: 'executive',
      name: 'Executive',
      category: 'Executive',
      description: 'Let your experience lead the conversation.',
      accent: '#2b5244',
      layout: 'leadership',
    },
    {
      id: 'ats-compact',
      name: 'ATS Compact',
      category: 'ATS',
      description: 'A precise, compact layout for a substantial career.',
      accent: '#334155',
      layout: 'compact',
    },
    {
      id: 'ats-scholar',
      name: 'ATS Scholar',
      category: 'ATS',
      description: 'An academic-inspired layout with a measured hierarchy.',
      accent: '#33496b',
      layout: 'scholar',
    },
    {
      id: 'ats-timeline',
      name: 'ATS Timeline',
      category: 'ATS',
      description: 'A clear career narrative with a subtle experience timeline.',
      accent: '#37474f',
      layout: 'timeline',
    },
    {
      id: 'modern-horizon',
      name: 'Modern Horizon',
      category: 'Modern',
      description: 'An open header and a softly shaded skills sidebar.',
      accent: '#166d82',
      layout: 'horizon',
      columns: 2,
      sidebar: true,
    },
    {
      id: 'modern-mono',
      name: 'Modern Mono',
      category: 'Modern',
      description: 'Monospaced headings and crisp detail for technical careers.',
      accent: '#3d477d',
      layout: 'mono',
    },
    {
      id: 'modern-grid',
      name: 'Modern Grid',
      category: 'Modern',
      description: 'Balanced columns and structured panels for every detail.',
      accent: '#246b55',
      layout: 'grid',
      columns: 2,
    },
    {
      id: 'creative-atelier',
      name: 'Creative Atelier',
      category: 'Creative',
      description: 'An editorial composition with warm, expressive typography.',
      accent: '#92543a',
      layout: 'atelier',
    },
    {
      id: 'creative-banner',
      name: 'Creative Banner',
      category: 'Creative',
      description: 'A bold opening and distinctive section labels.',
      accent: '#70446f',
      layout: 'banner',
    },
    {
      id: 'executive-ledger',
      name: 'Executive Ledger',
      category: 'Executive',
      description: 'A refined label column that lets your achievements lead.',
      accent: '#4b4c46',
      layout: 'ledger',
    },
    {
      id: 'executive-summit',
      name: 'Executive Summit',
      category: 'Executive',
      description: 'A corporate masthead with a dedicated credentials column.',
      accent: '#273c59',
      layout: 'summit',
      columns: 2,
      sidebar: true,
    },
  ] as const
).map((template) => ({ columns: 1, sidebar: false, ...template }));
export type FieldDefinition = {
  key: string;
  label: string;
  type?: 'textarea' | 'date' | 'url' | 'checkbox' | 'select';
  options?: string[];
  wide?: boolean;
};
export const entryFields: Record<Exclude<SectionKey, 'summary'>, FieldDefinition[]> = {
  experience: [
    { key: 'title', label: 'Job title' },
    { key: 'organization', label: 'Company' },
    { key: 'location', label: 'Location' },
    { key: 'start', label: 'Start date', type: 'date' },
    { key: 'end', label: 'End date', type: 'date' },
    { key: 'current', label: 'I currently work here', type: 'checkbox' },
    { key: 'description', label: 'Responsibilities', type: 'textarea', wide: true },
    { key: 'achievements', label: 'Achievements · one per line', type: 'textarea', wide: true },
  ],
  education: [
    { key: 'organization', label: 'Institution' },
    { key: 'title', label: 'Degree' },
    { key: 'field', label: 'Field of study' },
    { key: 'grade', label: 'Grade' },
    { key: 'start', label: 'Start date', type: 'date' },
    { key: 'end', label: 'End date', type: 'date' },
    { key: 'description', label: 'Description', type: 'textarea', wide: true },
  ],
  skills: [
    { key: 'title', label: 'Skill' },
    { key: 'category', label: 'Category' },
    {
      key: 'level',
      label: 'Proficiency',
      type: 'select',
      options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    },
  ],
  projects: [
    { key: 'title', label: 'Project name' },
    { key: 'technologies', label: 'Technologies' },
    { key: 'url', label: 'Project URL', type: 'url' },
    { key: 'github', label: 'GitHub URL', type: 'url' },
    { key: 'start', label: 'Date', type: 'date' },
    { key: 'description', label: 'Description', type: 'textarea', wide: true },
  ],
  certifications: [
    { key: 'title', label: 'Certification' },
    { key: 'organization', label: 'Issuing organization' },
    { key: 'start', label: 'Issue date', type: 'date' },
    { key: 'end', label: 'Expiry date', type: 'date' },
    { key: 'credentialId', label: 'Credential ID' },
    { key: 'url', label: 'Credential URL', type: 'url' },
  ],
  languages: [
    { key: 'title', label: 'Language' },
    {
      key: 'level',
      label: 'Proficiency',
      type: 'select',
      options: ['Native', 'Fluent', 'Professional', 'Conversational', 'Basic'],
    },
  ],
  achievements: [
    { key: 'title', label: 'Achievement' },
    { key: 'description', label: 'Description', type: 'textarea', wide: true },
  ],
  awards: [
    { key: 'title', label: 'Award' },
    { key: 'organization', label: 'Organization' },
    { key: 'start', label: 'Date', type: 'date' },
    { key: 'description', label: 'Description', type: 'textarea', wide: true },
  ],
  publications: [
    { key: 'title', label: 'Publication' },
    { key: 'organization', label: 'Publisher' },
    { key: 'url', label: 'URL', type: 'url' },
    { key: 'start', label: 'Publication date', type: 'date' },
    { key: 'description', label: 'Description', type: 'textarea', wide: true },
  ],
  volunteer: [
    { key: 'title', label: 'Role' },
    { key: 'organization', label: 'Organization' },
    { key: 'start', label: 'Start date', type: 'date' },
    { key: 'end', label: 'End date', type: 'date' },
    { key: 'description', label: 'Contribution', type: 'textarea', wide: true },
  ],
  interests: [
    { key: 'title', label: 'Interest' },
    { key: 'description', label: 'Description', type: 'textarea', wide: true },
  ],
  references: [
    { key: 'title', label: 'Full name' },
    { key: 'organization', label: 'Company and role' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
  ],
};
export function plainText(resume: Resume) {
  return [
    Object.values(resume.personal).join(' '),
    resume.sections.some((section) => section.key === 'summary' && section.visible)
      ? resume.summary
      : '',
    ...resume.sections
      .filter((s) => s.visible)
      .flatMap((s) => (resume.entries[s.key] || []).map((e) => Object.values(e.fields).join(' '))),
  ].join('\n');
}
