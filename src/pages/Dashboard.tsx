import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Files,
  Globe,
  Eye,
  Download,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  Pencil,
  Target,
  Sparkles,
  Check,
  ArrowUpRight,
  ScanLine,
  Mail,
  LayoutGrid,
  List,
  FileText,
  ChevronRight,
} from 'lucide-react';
import type { Resume } from '../../shared/resume';
import { templates } from '../../shared/resume';
import { analyzeResume } from '../../shared/analysis';
import { api, post, put, download, timeAgo } from '../lib/api';
import { useAuth, useToast } from '../lib/context';
import {
  PageHeading,
  Button,
  Badge,
  Skeleton,
  EmptyState,
  Dropdown,
  Modal,
  Field,
  ErrorPanel,
} from '../components/ui';
import { ResumePreview } from '../components/ResumePreview';
export function ResumeCard({
  resume,
  onChange,
  list = false,
}: {
  resume: Resume;
  onChange: () => void;
  list?: boolean;
}) {
  const notify = useToast();
  const [confirm, setConfirm] = useState(false);
  const [rename, setRename] = useState(false);
  const [name, setName] = useState(resume.name);
  const [busy, setBusy] = useState(false);
  const score = analyzeResume(resume).score;
  const action = async (fn: () => Promise<unknown>, message: string) => {
    try {
      setBusy(true);
      await fn();
      notify(message);
      onChange();
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className={`resume-card ${list ? 'list-card' : ''}`}>
      <Link
        to={`/resumes/${resume.id}/edit`}
        className="resume-card-preview"
        aria-label={`Edit ${resume.name}`}
      >
        <ResumePreview resume={resume} thumbnail />
        <div className="preview-hover">
          <Pencil size={18} />
          Open editor
        </div>
        <span className="template-tag">
          {templates.find((t) => t.id === resume.template)?.name}
        </span>
      </Link>
      <div className="resume-card-info">
        <div className="resume-card-title">
          <Link to={`/resumes/${resume.id}/edit`}>
            <h3>{resume.name}</h3>
          </Link>
          <Dropdown label={<MoreHorizontal size={18} />}>
            <button onClick={() => setRename(true)}>
              <Pencil size={15} />
              Rename
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void action(() => post(`/resumes/${resume.id}/duplicate`), 'Resume duplicated')
              }
            >
              <Copy size={15} />
              Duplicate
            </button>
            <button
              onClick={() =>
                void action(
                  () =>
                    put(`/resumes/${resume.id}`, {
                      ...resume,
                      status: resume.status === 'archived' ? 'draft' : 'archived',
                    }),
                  resume.status === 'archived' ? 'Resume restored' : 'Resume archived',
                )
              }
            >
              <Archive size={15} />
              {resume.status === 'archived' ? 'Restore' : 'Archive'}
            </button>
            <button className="danger-text" onClick={() => setConfirm(true)}>
              <Trash2 size={15} />
              Delete
            </button>
          </Dropdown>
        </div>
        <p className="resume-card-meta">Edited {timeAgo(resume.updatedAt)}</p>
        <div className="resume-card-bottom">
          <Badge tone={score >= 80 ? 'green' : 'blue'}>
            <span className="badge-dot" />
            {score} ATS score
          </Badge>
          <Badge tone={resume.status === 'published' ? 'blue' : 'neutral'}>
            {resume.status.charAt(0).toUpperCase() + resume.status.slice(1)}
          </Badge>
          <button
            className="icon-button"
            title="Download PDF"
            aria-label={`Download ${resume.name}`}
            disabled={busy}
            onClick={() =>
              void action(
                () => download(`/resumes/${resume.id}/export`, `${resume.name}.pdf`),
                'PDF downloaded',
              )
            }
          >
            <Download size={16} />
          </button>
        </div>
      </div>
      {confirm && (
        <Modal title="Delete this resume?" onClose={() => setConfirm(false)}>
          <div className="modal-body">
            <p>
              “{resume.name}” and its version history will be permanently deleted. Any public
              portfolio using it will be removed.
            </p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                Keep resume
              </Button>
              <Button
                variant="danger"
                loading={busy}
                onClick={() =>
                  void action(
                    () => api(`/resumes/${resume.id}`, { method: 'DELETE' }),
                    'Resume deleted',
                  ).then(() => setConfirm(false))
                }
              >
                Delete resume
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {rename && (
        <Modal title="Rename resume" onClose={() => setRename(false)}>
          <form
            className="modal-body"
            onSubmit={(e) => {
              e.preventDefault();
              void action(
                () => put(`/resumes/${resume.id}`, { ...resume, name }),
                'Resume renamed',
              ).then(() => setRename(false));
            }}
          >
            <Field label="Resume name">
              <input
                value={name}
                maxLength={120}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div className="modal-actions">
              <Button type="submit" loading={busy}>
                Save name
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </article>
  );
}
export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => {
    Promise.all([api<Resume[]>('/resumes'), api('/analytics'), api('/activity')])
      .then(([r, a, activity]) => {
        setResumes(r);
        setAnalytics({ ...a, ...activity });
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  if (loading) return <Skeleton />;
  if (error) return <ErrorPanel message={error} retry={load} />;
  const active = resumes.filter((r) => r.status !== 'archived');
  const recent = active.slice(0, 3);
  const top = recent[0];
  const steps = [
    { text: 'Create your first resume', done: active.length > 0, to: '/resumes/new' },
    {
      text: 'Add your experience & skills',
      done: !!top?.entries.experience.length && !!top?.entries.skills.length,
      to: top ? `/resumes/${top.id}/edit` : '/resumes/new',
    },
    {
      text: 'Make it match your next role',
      done: (analytics?.jobMatches || 0) > 0,
      to: '/job-matcher',
    },
    {
      text: 'Share your professional story',
      done: resumes.some((r) => r.status === 'published'),
      to: '/portfolio',
    },
  ];
  return (
    <div className="page dashboard-page">
      <PageHeading
        title={`Welcome back, ${user?.name.split(' ')[0]}.`}
        description="Let’s turn your experience into your next opportunity."
      >
        <Button onClick={() => navigate('/resumes/new')}>
          <Plus size={17} />
          Create resume
        </Button>
      </PageHeading>
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">
            <span className="tiny-spark">✦</span> YOUR NEXT CHAPTER
          </div>
          <h2>
            Great experience.
            <br />
            <span>Even better on paper.</span>
          </h2>
          <p>
            Your story deserves a resume that does it justice.
            <br className="desktop-only" /> Pick up where you left off and make your next move.
          </p>
          <Button
            variant="secondary"
            onClick={() => navigate(top ? `/resumes/${top.id}/edit` : '/resumes/new')}
          >
            {top ? 'Continue editing' : 'Build your first resume'}
            <Pencil size={15} />
          </Button>
        </div>
        <div className="hero-documents" aria-hidden="true">
          {top ? (
            <>
              <div className="hero-doc-back" />
              <div className="hero-doc">
                <ResumePreview resume={top} thumbnail />
              </div>
              <div className="hero-score">
                <span className="hero-score-icon">
                  <Check size={17} />
                </span>
                <span>
                  <strong>Designed to stand out</strong>
                  <small>Your experience, beautifully presented</small>
                </span>
              </div>
            </>
          ) : (
            <div className="hero-empty-document">
              <FileText size={64} />
              <strong>
                A fresh page.
                <br />A new possibility.
              </strong>
            </div>
          )}
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
        </div>
      </div>
      <div className="stats-grid">
        {[
          {
            label: 'Total resumes',
            value: active.length,
            icon: Files,
            detail: 'Ready for your next move',
            color: 'blue',
          },
          {
            label: 'Published resumes',
            value: resumes.filter((r) => r.status === 'published').length,
            icon: Globe,
            detail: 'Your story, out in the world',
            color: 'purple',
          },
          {
            label: 'Resume views',
            value: analytics?.views || 0,
            icon: Eye,
            detail: `${analytics?.weeklyViews || 0} views this week`,
            color: 'teal',
          },
          {
            label: 'PDF downloads',
            value: analytics?.downloads || 0,
            icon: Download,
            detail: `${analytics?.weeklyDownloads || 0} downloads this week`,
            color: 'orange',
          },
        ].map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-top">
              <span>{stat.label}</span>
              <span className={`stat-icon ${stat.color}`}>
                <stat.icon size={18} />
              </span>
            </div>
            <strong>{stat.value.toLocaleString()}</strong>
            <p>{stat.detail}</p>
          </div>
        ))}
      </div>
      <div className="section-heading">
        <div>
          <h2>
            Recent resumes <span className="count-pill">{active.length}</span>
          </h2>
          <p>A different opportunity. A resume that fits.</p>
        </div>
        <Link className="text-link" to="/resumes">
          View all resumes <ChevronRight size={15} />
        </Link>
      </div>
      {recent.length ? (
        <div className="resume-grid">
          {recent.map((r) => (
            <ResumeCard key={r.id} resume={r} onChange={load} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your story starts here"
          description="Create your first professional resume in minutes."
          action={() => navigate('/resumes/new')}
        />
      )}
      <div className="dashboard-bottom">
        <section className="panel quick-actions-panel">
          <div className="section-heading">
            <div>
              <h2>Make your next move</h2>
              <p>A few tools. A little more confidence.</p>
            </div>
            <Sparkles size={20} />
          </div>
          <div className="quick-actions">
            {[
              {
                icon: ScanLine,
                title: 'Check your resume',
                text: 'Find opportunities to improve.',
                to: '/analyzer',
                color: 'blue',
              },
              {
                icon: Target,
                title: 'Match a job',
                text: 'See how your skills line up.',
                to: '/job-matcher',
                color: 'purple',
              },
              {
                icon: Mail,
                title: 'Write a cover letter',
                text: 'Make a personal introduction.',
                to: '/cover-letters',
                color: 'teal',
              },
            ].map((a) => (
              <Link to={a.to} key={a.to}>
                <span className={`stat-icon ${a.color}`}>
                  <a.icon size={21} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.text}</p>
                </div>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        </section>
        <section className="panel progress-panel">
          <div className="section-heading">
            <h2>Your career checklist</h2>
            <span className="muted">{steps.filter((s) => s.done).length} of 4</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${steps.filter((s) => s.done).length * 25}%` }} />
          </div>
          {steps.map((step) => (
            <Link
              key={step.text}
              to={step.to}
              className={`checklist-item ${step.done ? 'done' : ''}`}
            >
              <span>{step.done ? <Check size={12} /> : null}</span>
              {step.text}
              <ChevronRight size={14} />
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
export function ResumesPage() {
  const [searchParams] = useSearchParams();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All resumes');
  const [view, setView] = useState('grid');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const navigate = useNavigate();
  const load = () => {
    api<Resume[]>('/resumes')
      .then(setResumes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => setQuery(searchParams.get('q') || ''), [searchParams]);
  const visible = resumes.filter(
    (r) =>
      (filter === 'Archived'
        ? r.status === 'archived'
        : filter === 'Published'
          ? r.status === 'published'
          : r.status !== 'archived') && r.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page">
      <PageHeading
        eyebrow="YOUR DOCUMENTS"
        title="A resume for every opportunity."
        description="Build, refine, and organize your professional story."
      >
        <Button onClick={() => navigate('/resumes/new')}>
          <Plus size={17} />
          Create resume
        </Button>
      </PageHeading>
      <div className="filter-bar">
        <div className="tabs">
          {['All resumes', 'Published', 'Archived'].map((t) => (
            <button key={t} className={filter === t ? 'active' : ''} onClick={() => setFilter(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="filter-controls">
          <input
            aria-label="Filter resumes"
            placeholder="Find a resume…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className={`icon-button ${view === 'grid' ? 'selected' : ''}`}
            aria-label="Grid view"
            onClick={() => setView('grid')}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={`icon-button ${view === 'list' ? 'selected' : ''}`}
            aria-label="List view"
            onClick={() => setView('list')}
          >
            <List size={18} />
          </button>
        </div>
      </div>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <ErrorPanel message={error} retry={load} />
      ) : visible.length ? (
        <div className={view === 'grid' ? 'resume-grid' : 'resume-list'}>
          {visible.map((r) => (
            <ResumeCard key={r.id} resume={r} list={view === 'list'} onChange={load} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            query
              ? 'No matching resumes'
              : filter === 'Archived'
                ? 'No archived resumes'
                : 'A fresh start looks good on you'
          }
          description={
            query
              ? 'Try another name or clear your search.'
              : 'Create a resume and take the first step toward your next role.'
          }
          action={() => navigate('/resumes/new')}
        />
      )}
    </div>
  );
}
