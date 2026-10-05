import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ScanLine,
  Upload,
  Check,
  AlertCircle,
  Target,
  Sparkles,
  FileText,
  X,
  LoaderCircle,
} from 'lucide-react';
import type { Resume } from '../../shared/resume';
import type { Analysis } from '../../shared/analysis';
import { api, post } from '../lib/api';
import { useToast } from '../lib/context';
import {
  PageHeading,
  Button,
  Field,
  ScoreRing,
  Badge,
  ErrorPanel,
  EmptyState,
  Tabs,
} from '../components/ui';
export function ResumeSelect({
  resumes,
  value,
  onChange,
}: {
  resumes: Resume[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Choose a resume">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          Select a resume
        </option>
        {resumes
          .filter((r) => r.status !== 'archived')
          .map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
      </select>
    </Field>
  );
}
export function useResumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<Resume[]>('/resumes')
      .then((data) => {
        setResumes(data);
        setSelected((current) => current || data.find((r) => r.status !== 'archived')?.id || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return { resumes, selected, setSelected, error, loading };
}
export function AnalyzerPage() {
  const { resumes, selected, setSelected, error: loadError, loading } = useResumes();
  const [tab, setTab] = useState('My resumes');
  const [result, setResult] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imported, setImported] = useState<{ text: string; notice: string; name: string } | null>(
    null,
  );
  const notify = useToast();
  const analyze = async () => {
    setBusy(true);
    setError('');
    setImported(null);
    try {
      setResult(await post<Analysis>('/analyzer', { resumeId: selected }));
      notify('Your resume analysis is ready');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <PageHeading
        eyebrow="A FRESH PERSPECTIVE"
        title="Put your best resume forward."
        description="Practical feedback to make your experience clearer and easier to find."
      >
        <Badge tone="blue">
          <ScanLine size={14} />
          ATS RESUME ANALYZER
        </Badge>
      </PageHeading>
      <div className="analysis-layout">
        <section className="panel analysis-input">
          <h2>Start with your resume</h2>
          <p className="muted">Let’s find the details worth improving.</p>
          <Tabs items={['My resumes', 'Upload a file']} value={tab} onChange={setTab} />
          {tab === 'My resumes' ? (
            <>
              {!loading && !resumes.length ? (
                <EmptyState
                  title="A resume comes first"
                  description="Create a resume, then come back for a fresh perspective."
                />
              ) : (
                <ResumeSelect
                  resumes={resumes}
                  value={selected}
                  onChange={(v) => {
                    setSelected(v);
                    setResult(null);
                  }}
                />
              )}
              <Button
                className="full-width"
                loading={busy}
                disabled={!selected}
                onClick={() => void analyze()}
              >
                <ScanLine size={17} />
                {busy ? 'Analyzing your resume…' : 'Analyze resume'}
              </Button>
            </>
          ) : (
            <label className="upload-zone">
              <Upload size={28} />
              <strong>{busy ? 'Reading your document…' : 'Drop in your next chapter'}</strong>
              <span>Choose a PDF or DOCX · up to 5 MB</span>
              <input
                type="file"
                accept=".pdf,.docx"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  setError('');
                  const form = new FormData();
                  form.append('file', file);
                  try {
                    const data = await api<{
                      result: Analysis;
                      text: string;
                      notice: string;
                      name: string;
                    }>('/analyzer/import', { method: 'POST', body: form });
                    setResult(data.result);
                    setImported(data);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          )}
          <div className="analysis-explainer">
            <h3>What we look at</h3>
            {[
              'Complete, readable sections',
              'Clear contact information',
              'Relevant professional skills',
              'Evidence of your impact',
              'Consistent document structure',
            ].map((item) => (
              <p key={item}>
                <Check size={14} />
                {item}
              </p>
            ))}
          </div>
          <div className="privacy-note">
            <AlertCircle size={16} />
            <p>
              This score is an informational checklist, not an actual ATS vendor score or a
              guarantee of interview success.
            </p>
          </div>
        </section>
        <div className="analysis-results">
          {(error || loadError) && <ErrorPanel message={error || loadError} />}{' '}
          {busy ? (
            <div className="panel analysis-loading">
              <LoaderCircle size={32} className="spin" />
              <h2>Looking at the bigger picture…</h2>
              <p>Checking the details that help your experience shine.</p>
            </div>
          ) : result ? (
            <>
              <section className="panel score-overview">
                <ScoreRing score={result.score} size={140} />
                <div>
                  <Badge tone={result.score >= 80 ? 'green' : 'blue'}>
                    {result.score >= 80 ? 'A strong foundation' : 'Room to grow'}
                  </Badge>
                  <h2>
                    {result.score >= 80
                      ? 'Your experience is looking good.'
                      : 'A few changes can make a difference.'}
                  </h2>
                  <p>
                    {result.suggestions.length} opportunities to improve · {result.wordCount} words
                    reviewed
                  </p>
                </div>
              </section>
              <section className="panel">
                <div className="panel-header">
                  <h2>The details behind your score</h2>
                </div>
                <div className="score-breakdown">
                  {result.breakdown.map((b) => (
                    <div key={b.name}>
                      <div>
                        <strong>{b.name}</strong>
                        <span>
                          {b.score}
                          <small> / 100</small>
                        </span>
                      </div>
                      <div className="progress-track">
                        <span
                          style={{
                            width: `${b.score}%`,
                            background: b.score >= 80 ? 'var(--green)' : 'var(--accent)',
                          }}
                        />
                      </div>
                      <p>{b.description}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <div className="panel-header">
                  <h2>Small changes. Stronger story.</h2>
                  <Sparkles size={18} />
                </div>
                {result.suggestions.length ? (
                  result.suggestions.map((s, i) => (
                    <div className="suggestion-row" key={i}>
                      <span className={`suggestion-number ${s.priority}`}>{i + 1}</span>
                      <div>
                        <h3>{s.title}</h3>
                        <p>{s.detail}</p>
                      </div>
                      {!imported && (
                        <Link to={`/resumes/${selected}/edit`} className="text-link">
                          Edit resume
                        </Link>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="success-panel">
                    <Check size={22} />
                    <p>
                      Your resume passes these checks. Tailor it to a specific role with the job
                      matcher.
                    </p>
                  </div>
                )}
              </section>
              {imported && (
                <section className="panel import-result">
                  <h2>{imported.name}</h2>
                  <p className="notice">{imported.notice}</p>
                  <details>
                    <summary>Review extracted text</summary>
                    <pre>{imported.text}</pre>
                  </details>
                </section>
              )}
            </>
          ) : (
            <div className="panel analysis-placeholder">
              <span className="large-soft-icon">
                <ScanLine size={38} />
              </span>
              <h2>A little clarity goes a long way.</h2>
              <p>
                Select a resume to see your score, a detailed breakdown, and actionable next steps.
              </p>
              <div className="placeholder-checks">
                <span>
                  <Check size={14} />
                  Clear feedback
                </span>
                <span>
                  <Check size={14} />
                  No guesswork
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export function JobMatcherPage() {
  const { resumes, selected, setSelected, error: loadError } = useResumes();
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="page">
      <PageHeading
        eyebrow="FIND YOUR COMMON GROUND"
        title="The right words for the right role."
        description="Compare your experience with a job description and find a more focused story."
      >
        <Badge tone="purple">
          <Target size={14} />
          JOB MATCHER
        </Badge>
      </PageHeading>
      <div className="analysis-layout matcher-layout">
        <form
          className="panel analysis-input"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              setResult(await post('/job-matcher', { resumeId: selected, description }));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <ResumeSelect resumes={resumes} value={selected} onChange={setSelected} />
          <Field
            label="Paste the job description"
            hint="Include responsibilities, required skills, and qualifications."
          >
            <textarea
              rows={15}
              value={description}
              minLength={30}
              maxLength={30000}
              required
              placeholder="We’re looking for someone who…"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Button className="full-width" loading={busy} disabled={!selected}>
            <Target size={17} />
            {busy ? 'Comparing your experience…' : 'Find my match'}
          </Button>
          <p className="fine-print">
            Matching uses recognized keywords and does not evaluate your suitability or guarantee an
            interview.
          </p>
        </form>
        <div className="analysis-results">
          {(error || loadError) && <ErrorPanel message={error || loadError} />}{' '}
          {result ? (
            <>
              <section className="panel score-overview">
                {result.score !== null ? (
                  <ScoreRing score={result.score} size={130} />
                ) : (
                  <span className="large-soft-icon">
                    <Target size={35} />
                  </span>
                )}
                <div>
                  <Badge tone="blue">KEYWORD COVERAGE</Badge>
                  <h2>
                    {result.score === null
                      ? 'Let’s look a little closer.'
                      : `${result.matched.length} skills in common.`}
                  </h2>
                  <p>
                    {result.score === null
                      ? 'No recognized skills found. Compare the description manually.'
                      : 'A starting point for a more tailored application.'}
                  </p>
                </div>
              </section>
              <div className="match-columns">
                <section className="panel">
                  <h3>
                    <Check size={17} />
                    Already in your resume
                  </h3>
                  <div className="keyword-chips">
                    {result.matched.length ? (
                      result.matched.map((s: string) => (
                        <Badge key={s} tone="green">
                          <Check size={12} />
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <p className="muted">No recognized matching skills yet.</p>
                    )}
                  </div>
                </section>
                <section className="panel">
                  <h3>
                    <X size={17} />
                    Worth a closer look
                  </h3>
                  <div className="keyword-chips">
                    {result.missing.length ? (
                      result.missing.map((s: string) => (
                        <Badge key={s} tone="orange">
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <p className="muted">No missing recognized skills.</p>
                    )}
                  </div>
                </section>
              </div>
              <section className="panel match-details">
                <h2>Beyond the keywords</h2>
                <div>
                  <FileText size={18} />
                  <p>
                    <strong>Experience</strong>
                    {result.experience}
                  </p>
                </div>
                <div>
                  <Check size={18} />
                  <p>
                    <strong>Education</strong>
                    {result.education}
                  </p>
                </div>
                {result.preferred.length > 0 && (
                  <div>
                    <Sparkles size={18} />
                    <p>
                      <strong>Preferred skills</strong>
                      {result.preferred.join(', ')}
                    </p>
                  </div>
                )}
              </section>
              <section className="panel match-details">
                <h2>Make your application more relevant</h2>
                {result.suggestions.map((s: string) => (
                  <p key={s}>{s}</p>
                ))}
                <Link className="btn btn-secondary" to={`/resumes/${selected}/edit`}>
                  Tailor my resume
                </Link>
              </section>
            </>
          ) : (
            <div className="panel analysis-placeholder">
              <span className="large-soft-icon">
                <Target size={40} />
              </span>
              <h2>See where your story connects.</h2>
              <p>
                Paste a job description to discover shared skills, missing keywords, and useful ways
                to tailor your resume.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
