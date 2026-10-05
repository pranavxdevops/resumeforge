import { useEffect, useState } from 'react';
import { Sparkles, Plus, Copy, Download, Save, Mail, Trash2 } from 'lucide-react';
import { useResumes, ResumeSelect } from './Analysis';
import { api, post, put, download } from '../lib/api';
import { useToast } from '../lib/context';
import {
  PageHeading,
  Button,
  Field,
  Tabs,
  Badge,
  EmptyState,
  ErrorPanel,
  Modal,
} from '../components/ui';
type Letter = {
  id: string;
  resumeId: string;
  company: string;
  title: string;
  tone: string;
  content: string;
  updatedAt: string;
};
export function CoverLettersPage() {
  const { resumes, selected, setSelected } = useResumes();
  const notify = useToast();
  const [tab, setTab] = useState('Write a letter');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [tone, setTone] = useState('Professional');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const refresh = () =>
    api<Letter[]>('/cover-letters')
      .then(setLetters)
      .catch((e) => notify(e.message, 'error'));
  useEffect(() => {
    void refresh();
  }, []);
  const reset = () => {
    setEditing(null);
    setCompany('');
    setTitle('');
    setContent('');
    setDescription('');
    setTab('Write a letter');
  };
  const save = async () => {
    setBusy(true);
    try {
      const data = { resumeId: selected, company, title, tone, content };
      const letter = editing
        ? await put<Letter>(`/cover-letters/${editing}`, data)
        : await post<Letter>('/cover-letters', data);
      setEditing(letter.id);
      await refresh();
      notify('Cover letter saved');
      return letter;
    } catch (e) {
      notify((e as Error).message, 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <PageHeading
        eyebrow="MAKE A PERSONAL INTRODUCTION"
        title="More than a resume. A conversation."
        description="Tell them why this role, this company, and this next step matter to you."
      >
        <Button variant="secondary" onClick={reset}>
          <Plus size={16} />
          New letter
        </Button>
      </PageHeading>
      <Tabs items={['Write a letter', 'Saved letters']} value={tab} onChange={setTab} />
      {tab === 'Saved letters' ? (
        letters.length ? (
          <div className="letter-grid">
            {letters.map((letter) => (
              <article className="panel letter-card" key={letter.id}>
                <span className="soft-icon">
                  <Mail size={22} />
                </span>
                <h2>{letter.company}</h2>
                <p>{letter.title}</p>
                <p className="letter-excerpt">{letter.content.slice(0, 180)}…</p>
                <div className="letter-actions">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditing(letter.id);
                      setSelected(letter.resumeId);
                      setCompany(letter.company);
                      setTitle(letter.title);
                      setTone(letter.tone);
                      setContent(letter.content);
                      setTab('Write a letter');
                    }}
                  >
                    Edit letter
                  </Button>
                  <button
                    className="icon-button danger-text"
                    aria-label={`Delete letter for ${letter.company}`}
                    onClick={() => setDeleteId(letter.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your next introduction starts here"
            description="Write a letter that connects your experience to an opportunity."
            label="Write a letter"
            action={reset}
          />
        )
      ) : (
        <div className="letter-workspace">
          <form
            className="panel analysis-input"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                const data = await post<{ content: string }>('/ai/cover-letter', {
                  resumeId: selected,
                  company,
                  title,
                  tone,
                  description,
                });
                setContent(data.content);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2>The right context makes all the difference.</h2>
            <ResumeSelect resumes={resumes} value={selected} onChange={setSelected} />
            <Field label="Company">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                placeholder="Where would you like to work?"
              />
            </Field>
            <Field label="Job title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Your next role"
              />
            </Field>
            <Field label="Tone">
              <select value={tone} onChange={(e) => setTone(e.target.value)}>
                {['Professional', 'Formal', 'Concise', 'Confident'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Job description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Add the role’s responsibilities and requirements…"
              />
            </Field>
            <Button loading={busy} disabled={!selected} className="full-width">
              <Sparkles size={16} />
              {busy ? 'Creating your cover letter…' : 'Generate with AI'}
            </Button>
            <p className="fine-print">
              Your resume and job description are shared with your configured AI provider. You can
              also write your own letter in the editor.
            </p>
          </form>
          <section className="panel letter-editor">
            <div className="panel-header">
              <h2>{editing ? 'Your saved letter' : 'Your cover letter'}</h2>
              <Badge>EDITABLE DRAFT</Badge>
            </div>
            {error && <ErrorPanel message={error} />}
            <textarea
              aria-label="Cover letter content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                'Dear Hiring Team,\n\nEvery great introduction starts with a few thoughtful words. Write your letter here, or use the assistant to help you get started.\n\nTell them what interests you about the role, connect it to your real experience, and finish with a clear invitation to talk.'
              }
            />
            <div className="letter-editor-footer">
              <span>{content.trim().split(/\s+/).filter(Boolean).length} words</span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Copy letter"
                  disabled={!content}
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(content)
                      .then(() => notify('Letter copied'))
                      .catch(() =>
                        notify(
                          'Could not access the clipboard. Select and copy the letter manually.',
                          'error',
                        ),
                      )
                  }
                >
                  <Copy size={18} />
                </button>
                <Button
                  variant="secondary"
                  disabled={!content || !company || !title || !selected}
                  loading={busy}
                  onClick={async () => {
                    const letter = await save();
                    if (letter) {
                      try {
                        await download(`/cover-letters/${letter.id}/export`, 'cover-letter.pdf');
                      } catch (e) {
                        notify((e as Error).message, 'error');
                      }
                    }
                  }}
                >
                  <Download size={16} />
                  PDF
                </Button>
                <Button
                  disabled={!content || !company || !title || !selected}
                  loading={busy}
                  onClick={() => void save()}
                >
                  <Save size={16} />
                  Save letter
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
      {deleteId && (
        <Modal title="Delete this cover letter?" onClose={() => setDeleteId(null)}>
          <div className="modal-body">
            <p>This removes the saved letter permanently.</p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    await api(`/cover-letters/${deleteId}`, { method: 'DELETE' });
                    setDeleteId(null);
                    await refresh();
                    notify('Cover letter deleted');
                  } catch (e) {
                    notify((e as Error).message, 'error');
                  }
                }}
              >
                Delete letter
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
