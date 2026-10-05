import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { Resume, Personal, ResumeStyle, SectionKey } from '../shared/resume';
const id = () => text('id').primaryKey();
const time = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  verified: boolean('verified').default(false).notNull(),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: time(),
});
export const profiles = pgTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  personal: jsonb('personal').$type<Personal>().notNull(),
  bio: text('bio').default('').notNull(),
});
export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    agent: text('agent').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: time(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);
export const authTokens = pgTable('auth_tokens', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  hash: text('hash').notNull().unique(),
  type: text('type').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
export const resumes = pgTable(
  'resumes',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    template: text('template').notNull(),
    status: text('status').notNull().default('draft'),
    personal: jsonb('personal').$type<Personal>().notNull(),
    summary: text('summary').notNull().default(''),
    style: jsonb('style').$type<ResumeStyle>().notNull(),
    revision: integer('revision').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: time(),
  },
  (t) => [index('resumes_owner_idx').on(t.userId)],
);
export const resumeSections = pgTable(
  'resume_sections',
  {
    id: id(),
    resumeId: text('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    key: text('key').$type<SectionKey>().notNull(),
    position: integer('position').notNull(),
    visible: boolean('visible').notNull(),
  },
  (t) => [uniqueIndex('sections_resume_key_idx').on(t.resumeId, t.key)],
);
function entries(name: string) {
  return pgTable(
    name,
    {
      id: id(),
      resumeId: text('resume_id')
        .notNull()
        .references(() => resumes.id, { onDelete: 'cascade' }),
      position: integer('position').notNull(),
      fields: jsonb('fields').$type<Record<string, string>>().notNull(),
    },
    (t) => [index(`${name}_resume_idx`).on(t.resumeId)],
  );
}
export const experiences = entries('experiences');
export const education = entries('education');
export const skills = entries('skills');
export const projects = entries('projects');
export const certifications = entries('certifications');
export const languages = entries('languages');
export const achievements = entries('achievements');
export const awards = entries('awards');
export const publications = entries('publications');
export const volunteer = entries('volunteer_experiences');
export const interests = entries('interests');
export const references = entries('resume_references');
export const entryTables = {
  experience: experiences,
  education,
  skills,
  projects,
  certifications,
  languages,
  achievements,
  awards,
  publications,
  volunteer,
  interests,
  references,
};
export const versions = pgTable(
  'resume_versions',
  {
    id: id(),
    resumeId: text('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    snapshot: jsonb('snapshot').$type<Resume>().notNull(),
    createdAt: time(),
  },
  (t) => [uniqueIndex('versions_resume_number_idx').on(t.resumeId, t.number)],
);
export const templatesTable = pgTable('templates', {
  id: id(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  layout: text('layout').notNull(),
});
export const coverLetters = pgTable(
  'cover_letters',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    resumeId: text('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
    company: text('company').notNull(),
    title: text('title').notNull(),
    tone: text('tone').notNull(),
    content: text('content').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: time(),
  },
  (t) => [index('letters_owner_idx').on(t.userId)],
);
export const jobDescriptions = pgTable('job_descriptions', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  resumeId: text('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  result: jsonb('result').notNull(),
  createdAt: time(),
});
export const analyses = pgTable('ats_analyses', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  resumeId: text('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
  result: jsonb('result').notNull(),
  createdAt: time(),
});
export const interviewQuestions = pgTable(
  'interview_questions',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    resumeId: text('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
    category: text('category').notNull(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    completed: boolean('completed').default(false).notNull(),
    saved: boolean('saved').default(false).notNull(),
    createdAt: time(),
  },
  (t) => [index('interview_owner_idx').on(t.userId)],
);
export const portfolios = pgTable('portfolio_pages', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  resumeId: text('resume_id')
    .notNull()
    .references(() => resumes.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  visibility: text('visibility').default('private').notNull(),
  passwordHash: text('password_hash'),
  theme: text('theme').default('studio').notNull(),
  analytics: boolean('analytics').default(true).notNull(),
  createdAt: time(),
});
export const resumeViews = pgTable(
  'resume_views',
  {
    id: id(),
    resumeId: text('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    visitor: text('visitor').notNull(),
    referrer: text('referrer').notNull(),
    device: text('device').notNull(),
    createdAt: time(),
  },
  (t) => [index('views_resume_date_idx').on(t.resumeId, t.createdAt)],
);
export const resumeDownloads = pgTable(
  'resume_downloads',
  {
    id: id(),
    resumeId: text('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    createdAt: time(),
  },
  (t) => [index('downloads_resume_date_idx').on(t.resumeId, t.createdAt)],
);
export const subscriptions = pgTable('subscriptions', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  plan: text('plan').default('free').notNull(),
  status: text('status').default('active').notNull(),
});
export const notifications = pgTable('notifications', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  read: boolean('read').default(false).notNull(),
  createdAt: time(),
});
