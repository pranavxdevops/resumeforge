import { eq } from 'drizzle-orm';
import { db, migrate, closeDatabase } from './db';
import { users, profiles, templatesTable, notifications } from './schema';
import { hashPassword } from './security';
import { saveResume } from './resumes';
import { demoResumes } from '../shared/demo';
import { templates } from '../shared/resume';
if (process.env.NODE_ENV === 'production')
  throw new Error('Demo seeding is disabled in production.');
await migrate();
const email = 'pranav@example.com';
const [existing] = await db.select().from(users).where(eq(users.email, email));
if (!existing) {
  const id = crypto.randomUUID();
  const demo = demoResumes();
  await db.insert(users).values({
    id,
    email,
    name: 'Pranav Ravichandran',
    passwordHash: await hashPassword('ResumeForge!2026'),
    verified: true,
  });
  await db.insert(profiles).values({
    userId: id,
    personal: demo[0].personal,
    bio: 'Building reliable systems and a meaningful career.',
  });
  for (const resume of demo) await saveResume(resume, id, true);
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    userId: id,
    title: 'Your workspace is ready',
    body: 'These sample resumes are yours to explore. Edit a section to see the preview update instantly.',
  });
  console.log('Development account seeded: pranav@example.com / ResumeForge!2026');
} else console.log('Development account already exists; data preserved.');
for (const t of templates)
  await db
    .insert(templatesTable)
    .values({ id: t.id, name: t.name, category: t.category, layout: t.layout })
    .onConflictDoNothing();
await closeDatabase();
