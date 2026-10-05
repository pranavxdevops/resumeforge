import { useEffect, useState } from 'react';
import { MessageSquare, Sparkles, Check, Bookmark, ChevronDown, ChevronUp } from 'lucide-react';
import { useResumes, ResumeSelect } from './Analysis';
import { api, post } from '../lib/api';
import { useToast } from '../lib/context';
import { PageHeading, Button, Field, Tabs, Badge, EmptyState, ErrorPanel } from '../components/ui';
type Question = {
  id: string;
  resumeId: string;
  category: string;
  question: string;
  answer: string;
  completed: boolean;
  saved: boolean;
};
export function InterviewPage() {
  const { resumes, selected, setSelected } = useResumes();
  const notify = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('All questions');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [useAI, setUseAI] = useState(false);
  useEffect(() => {
    api<Question[]>('/interview-questions')
      .then(setQuestions)
      .catch((e) => setError(e.message));
  }, []);
  const update = async (q: Question, patch: Partial<Question>) => {
    try {
      const next = await api<Question>(`/interview-questions/${q.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setQuestions((v) => v.map((i) => (i.id === q.id ? next : i)));
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  };
  const relevant = questions.filter((q) => q.resumeId === selected);
  const visible = relevant.filter(
    (q) =>
      category === 'All questions' || (category === 'Saved' && q.saved) || q.category === category,
  );
  return (
    <div className="page">
      <PageHeading
        eyebrow="A LITTLE PRACTICE. A LOT MORE CONFIDENCE."
        title="Be ready for the conversation."
        description="Turn your experience into answers that feel clear, specific, and like you."
      >
        <Badge tone="purple">
          <MessageSquare size={14} />
          INTERVIEW PREP
        </Badge>
      </PageHeading>
      <div className="interview-layout">
        <section className="panel analysis-input">
          <h2>Build your practice set</h2>
          <ResumeSelect resumes={resumes} value={selected} onChange={setSelected} />
          <Field label="Job description · optional">
            <textarea
              rows={7}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a role to focus your practice…"
            />
          </Field>
          <label className="checkbox-field">
            <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />
            Use AI for tailored questions
          </label>
          <p className="fine-print">
            Without AI, questions use your listed skills and structured coaching prompts. AI mode
            sends your resume to the configured provider.
          </p>
          <Button
            className="full-width"
            loading={busy}
            disabled={!selected}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                const next = await post<Question[]>('/interview-questions', {
                  resumeId: selected,
                  description,
                  ai: useAI,
                });
                setQuestions((v) => [...next, ...v]);
                notify('Your practice set is ready');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Sparkles size={16} />
            Generate questions
          </Button>
          <div className="practice-progress">
            <strong>
              {relevant.filter((q) => q.completed).length}
              <span> / {relevant.length}</span>
            </strong>
            <p>questions practiced</p>
            <div className="progress-track">
              <span
                style={{
                  width: `${relevant.length ? (relevant.filter((q) => q.completed).length / relevant.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </section>
        <section className="interview-questions">
          {error && <ErrorPanel message={error} />}
          <Tabs
            items={['All questions', 'Technical', 'Resume', 'Behavioral', 'Saved']}
            value={category}
            onChange={setCategory}
          />
          {visible.length ? (
            visible.map((q, i) => (
              <article
                key={q.id}
                className={`panel question-card ${q.completed ? 'completed' : ''}`}
              >
                <div className="question-meta">
                  <Badge
                    tone={
                      q.category === 'Technical'
                        ? 'blue'
                        : q.category === 'Behavioral'
                          ? 'purple'
                          : 'neutral'
                    }
                  >
                    {q.category}
                  </Badge>
                  <span className="muted">QUESTION {String(i + 1).padStart(2, '0')}</span>
                  <button
                    className={`icon-button ${q.saved ? 'bookmarked' : ''}`}
                    aria-label={q.saved ? 'Unsave question' : 'Save question'}
                    onClick={() => void update(q, { saved: !q.saved })}
                  >
                    <Bookmark size={17} fill={q.saved ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <h3>{q.question}</h3>
                <div className="question-actions">
                  <button
                    className="text-link"
                    onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                  >
                    {expanded === q.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}{' '}
                    {expanded === q.id ? 'Hide guidance' : 'Reveal answer guidance'}
                  </button>
                  <button
                    className={`practice-button ${q.completed ? 'done' : ''}`}
                    onClick={() => void update(q, { completed: !q.completed })}
                  >
                    <Check size={15} />
                    {q.completed ? 'Practiced' : 'Mark practiced'}
                  </button>
                </div>
                {expanded === q.id && (
                  <div className="answer-guidance">
                    <strong>A way to approach it</strong>
                    <p>{q.answer}</p>
                    <Button
                      variant="ghost"
                      loading={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const next = await post<Question>(`/interview-questions/${q.id}/answer`);
                          setQuestions((v) => v.map((item) => (item.id === q.id ? next : item)));
                        } catch (e) {
                          notify((e as Error).message, 'error');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <Sparkles size={14} />
                      Generate tailored guidance
                    </Button>
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="panel">
              <EmptyState
                title={
                  category === 'Saved'
                    ? 'Keep the questions that matter'
                    : 'Your next interview starts here'
                }
                description={
                  category === 'Saved'
                    ? 'Bookmark a question to return to it later.'
                    : 'Choose your resume and generate a practice set tailored to your experience.'
                }
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
