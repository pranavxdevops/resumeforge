import { and, eq, asc, desc } from 'drizzle-orm';
import { db } from './db';
import { resumes, resumeSections, entryTables, versions } from './schema';
import type { Resume } from '../shared/resume';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function getResume(id: string, userId?: string): Promise<Resume> {
  const [r] = await db
    .select()
    .from(resumes)
    .where(userId ? and(eq(resumes.id, id), eq(resumes.userId, userId)) : eq(resumes.id, id));
  if (!r) throw new HttpError(404, 'Resume not found.');
  const sections = await db
    .select()
    .from(resumeSections)
    .where(eq(resumeSections.resumeId, id))
    .orderBy(asc(resumeSections.position));
  const entries: Resume['entries'] = {};
  for (const [key, table] of Object.entries(entryTables)) {
    const rows = await db
      .select()
      .from(table)
      .where(eq(table.resumeId, id))
      .orderBy(asc(table.position));
    entries[key] = rows.map((row) => ({ id: row.id.slice(id.length + 1), fields: row.fields }));
  }
  return {
    id: r.id,
    name: r.name,
    template: r.template,
    status: r.status as Resume['status'],
    personal: r.personal,
    summary: r.summary,
    style: r.style,
    revision: r.revision,
    updatedAt: r.updatedAt.toISOString(),
    sections: sections.map(({ key, visible }) => ({ key, visible })),
    entries,
  };
}
export async function saveResume(resume: Resume, userId: string, create = false): Promise<Resume> {
  const next = { ...resume, revision: resume.revision + 1, updatedAt: new Date().toISOString() };
  await db.transaction(async (tx) => {
    const values = {
      userId,
      name: next.name,
      template: next.template,
      status: next.status,
      personal: next.personal,
      summary: next.summary,
      style: next.style,
      revision: next.revision,
      updatedAt: new Date(next.updatedAt),
    };
    if (create) await tx.insert(resumes).values({ id: next.id, ...values });
    else {
      const updated = await tx
        .update(resumes)
        .set(values)
        .where(
          and(
            eq(resumes.id, resume.id),
            eq(resumes.userId, userId),
            eq(resumes.revision, resume.revision),
          ),
        )
        .returning();
      if (!updated.length)
        throw new HttpError(409, 'This resume changed in another window. Reload it before saving.');
    }
    await tx.delete(resumeSections).where(eq(resumeSections.resumeId, next.id));
    await tx.insert(resumeSections).values(
      next.sections.map((s, position) => ({
        id: crypto.randomUUID(),
        resumeId: next.id,
        ...s,
        position,
      })),
    );
    for (const [key, table] of Object.entries(entryTables)) {
      await tx.delete(table).where(eq(table.resumeId, next.id));
      const data = next.entries[key] || [];
      if (data.length)
        await tx.insert(table).values(
          data.map((e, position) => ({
            id: `${next.id}:${e.id}`,
            resumeId: next.id,
            position,
            fields: e.fields,
          })),
        );
    }
    // Persist stable entry identifiers independently of the storage primary key.
    await tx.insert(versions).values({
      id: crypto.randomUUID(),
      resumeId: next.id,
      number: next.revision,
      snapshot: next,
    });
  });
  return next;
}
export async function listResumes(userId: string) {
  const rows = await db
    .select({ id: resumes.id })
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.updatedAt));
  return Promise.all(rows.map((r) => getResume(r.id, userId)));
}
