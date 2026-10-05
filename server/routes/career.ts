import { Router } from 'express';
import { z } from 'zod';
import { and, eq, desc } from 'drizzle-orm';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { db } from '../db';
import { analyses, jobDescriptions, coverLetters, interviewQuestions } from '../schema';
import { getResume, HttpError } from '../resumes';
import { aiGenerate, makePdf } from '../services';
import { analyzeResume, matchJob, analyzeImportedText } from '../../shared/analysis';
import { blankResume, plainText } from '../../shared/resume';
export const careerRouter = Router();
const selected = z.object({ resumeId: z.string().min(1) });
const job = selected.extend({
  description: z
    .string()
    .min(30, 'Paste at least 30 characters from the job description.')
    .max(30000),
});
careerRouter.post('/analyzer', async (req, res) => {
  const { resumeId } = selected.parse(req.body);
  const resume = await getResume(resumeId, req.user!.id);
  const result = analyzeResume(resume);
  await db
    .insert(analyses)
    .values({ id: crypto.randomUUID(), userId: req.user!.id, resumeId, result });
  res.json(result);
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
careerRouter.post('/analyzer/import', upload.single('file'), async (req, res) => {
  const f = req.file;
  if (!f) throw new HttpError(400, 'Choose a PDF or DOCX file.');
  let text = '';
  const ext = f.originalname.split('.').pop()?.toLowerCase();
  if (
    ext === 'pdf' &&
    f.mimetype === 'application/pdf' &&
    f.buffer.subarray(0, 5).toString() === '%PDF-'
  ) {
    const parser = new PDFParse({ data: f.buffer });
    try {
      text = (await parser.getText({ first: 20 })).text;
    } finally {
      await parser.destroy();
    }
  } else if (
    ext === 'docx' &&
    f.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
    f.buffer.length >= 4 &&
    f.buffer.readUInt32LE(0) === 0x04034b50
  ) {
    let expanded = 0;
    for (let i = 0; i < f.buffer.length - 46; i++) {
      if (f.buffer.readUInt32LE(i) === 0x02014b50) {
        expanded += f.buffer.readUInt32LE(i + 24);
        if (expanded > 30 * 1024 * 1024)
          throw new HttpError(400, 'This document expands beyond the safe import size.');
      }
    }
    text = (await mammoth.extractRawText({ buffer: f.buffer })).value;
  } else throw new HttpError(400, 'The file content, extension, and type must match PDF or DOCX.');
  if (text.trim().length < 50)
    throw new HttpError(
      400,
      'No readable resume text found. Scanned PDFs need text recognition before import.',
    );
  text = text.slice(0, 50000);
  const imported = blankResume(f.originalname.replace(/\.[^.]+$/, ''));
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  imported.personal.name = lines[0]?.slice(0, 150) || '';
  imported.personal.email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || '';
  imported.personal.phone =
    text.match(/(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/)?.[0] || '';
  imported.summary = text.slice(0, 10000);
  const result = analyzeImportedText(text);
  res.json({
    text,
    result,
    notice:
      'Text was extracted successfully. Uploaded formatting and section structure are not fully inferred; review the text before building a resume.',
    name: imported.name,
  });
});
careerRouter.post('/job-matcher', async (req, res) => {
  const data = job.parse(req.body);
  const result = matchJob(await getResume(data.resumeId, req.user!.id), data.description);
  await db.insert(jobDescriptions).values({
    id: crypto.randomUUID(),
    userId: req.user!.id,
    resumeId: data.resumeId,
    content: data.description,
    result,
  });
  res.json(result);
});
careerRouter.post('/ai/improve', async (req, res) => {
  const data = selected
    .extend({
      text: z.string().min(3).max(10000),
      action: z.enum([
        'Improve',
        'Rewrite',
        'Make concise',
        'Make professional',
        'Add measurable impact',
        'Generate alternatives',
        'Fix grammar',
      ]),
    })
    .parse(req.body);
  const resume = await getResume(data.resumeId, req.user!.id);
  const suggestion = await aiGenerate(
    `Return only the suggested text. Action: ${data.action}. Preserve facts and meaning. For measurable impact, ask for missing real metrics with [add verified metric] instead of inventing numbers.`,
    { text: data.text, title: resume.personal.title },
  );
  res.json({ suggestion });
});
careerRouter.get('/cover-letters', async (req, res) =>
  res.json(
    await db
      .select()
      .from(coverLetters)
      .where(eq(coverLetters.userId, req.user!.id))
      .orderBy(desc(coverLetters.updatedAt)),
  ),
);
const letterSchema = selected.extend({
  company: z.string().min(1).max(150),
  title: z.string().min(1).max(150),
  tone: z.enum(['Professional', 'Formal', 'Concise', 'Confident']),
  description: z.string().max(30000).default(''),
});
careerRouter.post('/ai/cover-letter', async (req, res) => {
  const data = letterSchema.parse(req.body);
  const resume = await getResume(data.resumeId, req.user!.id);
  const content = await aiGenerate(
    'Write a tailored cover letter in plain text, around 300 words. Use the selected tone. Do not invent experience or familiarity with the company.',
    { ...data, resume: plainText(resume) },
  );
  res.json({ content });
});
careerRouter.post('/cover-letters', async (req, res) => {
  const data = letterSchema
    .omit({ description: true })
    .extend({ content: z.string().min(1).max(20000) })
    .parse(req.body);
  await getResume(data.resumeId, req.user!.id);
  const [letter] = await db
    .insert(coverLetters)
    .values({ id: crypto.randomUUID(), userId: req.user!.id, ...data })
    .returning();
  res.status(201).json(letter);
});
careerRouter.put('/cover-letters/:id', async (req, res) => {
  const data = z
    .object({
      content: z.string().min(1).max(20000),
      company: z.string().min(1).max(150),
      title: z.string().min(1).max(150),
    })
    .parse(req.body);
  const [letter] = await db
    .update(coverLetters)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(coverLetters.id, String(req.params.id)), eq(coverLetters.userId, req.user!.id)))
    .returning();
  if (!letter) throw new HttpError(404, 'Cover letter not found.');
  res.json(letter);
});
careerRouter.delete('/cover-letters/:id', async (req, res) => {
  const [letter] = await db
    .delete(coverLetters)
    .where(and(eq(coverLetters.id, String(req.params.id)), eq(coverLetters.userId, req.user!.id)))
    .returning();
  if (!letter) throw new HttpError(404, 'Cover letter not found.');
  res.json({ ok: true });
});
careerRouter.post('/cover-letters/:id/export', async (req, res) => {
  const [letter] = await db
    .select()
    .from(coverLetters)
    .where(and(eq(coverLetters.id, String(req.params.id)), eq(coverLetters.userId, req.user!.id)));
  if (!letter) throw new HttpError(404, 'Cover letter not found.');
  const pdf = await makePdf(null, { content: letter.content, name: req.user!.name });
  res
    .set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="cover-letter.pdf"',
    })
    .send(Buffer.from(pdf));
});
careerRouter.get('/interview-questions', async (req, res) =>
  res.json(
    await db
      .select()
      .from(interviewQuestions)
      .where(eq(interviewQuestions.userId, req.user!.id))
      .orderBy(desc(interviewQuestions.createdAt)),
  ),
);
careerRouter.post('/interview-questions', async (req, res) => {
  const data = selected
    .extend({ description: z.string().max(30000).default(''), ai: z.boolean().default(false) })
    .parse(req.body);
  const resume = await getResume(data.resumeId, req.user!.id);
  let questions: { category: string; question: string; answer: string }[];
  if (data.ai) {
    const output = await aiGenerate(
      'Return ONLY valid JSON: an array of 6 objects with category (Technical, Resume, or Behavioral), question, and answer. Answers should be coaching frameworks, not fabricated personal experiences.',
      { resume: plainText(resume), job: data.description },
    );
    try {
      questions = z
        .array(
          z.object({
            category: z.enum(['Technical', 'Resume', 'Behavioral']),
            question: z.string().max(1500),
            answer: z.string().max(5000),
          }),
        )
        .min(1)
        .max(20)
        .parse(JSON.parse(output.replace(/^```(?:json)?\s*|\s*```$/g, '')));
    } catch {
      throw new HttpError(502, 'The AI returned an invalid question set. Please try again.');
    }
  } else {
    const matched = data.description ? matchJob(resume, data.description).matched : [];
    const tools = [
      ...new Set([...matched, ...(resume.entries.skills || []).map((e) => e.fields.title)]),
    ].slice(0, 3);
    questions = tools.map((skill) => ({
      category: 'Technical',
      question: `How have you used ${skill} in a real project, and what tradeoffs did you consider?`,
      answer: `Start with the problem, explain why you chose ${skill}, describe your implementation, and discuss a limitation or alternative. Finish with a result you can verify.`,
    }));
    questions.push(
      {
        category: 'Resume',
        question: `Walk me through your contribution as ${resume.entries.experience?.[0]?.fields.title || resume.personal.title || 'a professional'} and the impact of your work.`,
        answer:
          'Use one specific example. Separate your own contribution from the team’s work and support your result with accurate evidence.',
      },
      {
        category: 'Behavioral',
        question: 'Tell me about a challenging problem you resolved with a team.',
        answer:
          'Use STAR: explain the Situation, your Task, the Actions you took, and the Result. Include what you learned and would do differently.',
      },
      {
        category: 'Behavioral',
        question: 'How do you prioritize competing deadlines?',
        answer:
          'Describe how you evaluated impact and urgency, communicated tradeoffs, and adjusted your plan. Use a real example.',
      },
    );
  }
  const rows = await db
    .insert(interviewQuestions)
    .values(
      questions.map((q) => ({
        ...q,
        id: crypto.randomUUID(),
        userId: req.user!.id,
        resumeId: resume.id,
      })),
    )
    .returning();
  res.json(rows);
});
careerRouter.patch('/interview-questions/:id', async (req, res) => {
  const data = z
    .object({ completed: z.boolean().optional(), saved: z.boolean().optional() })
    .parse(req.body);
  const [row] = await db
    .update(interviewQuestions)
    .set(data)
    .where(
      and(
        eq(interviewQuestions.id, String(req.params.id)),
        eq(interviewQuestions.userId, req.user!.id),
      ),
    )
    .returning();
  if (!row) throw new HttpError(404, 'Question not found.');
  res.json(row);
});
careerRouter.post('/interview-questions/:id/answer', async (req, res) => {
  const [q] = await db
    .select()
    .from(interviewQuestions)
    .where(
      and(
        eq(interviewQuestions.id, String(req.params.id)),
        eq(interviewQuestions.userId, req.user!.id),
      ),
    );
  if (!q) throw new HttpError(404, 'Question not found.');
  const resume = q.resumeId ? await getResume(q.resumeId, req.user!.id) : null;
  const answer = await aiGenerate(
    'Provide an interview answer framework using only known resume facts. Clearly mark where the user should add a real example.',
    { question: q.question, resume: resume ? plainText(resume) : '' },
  );
  await db.update(interviewQuestions).set({ answer }).where(eq(interviewQuestions.id, q.id));
  res.json({ ...q, answer });
});
