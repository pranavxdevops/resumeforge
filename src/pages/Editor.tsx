import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams, useNavigate, useBlocker } from 'react-router-dom';
import {
  ChevronLeft,
  Download,
  Check,
  Cloud,
  LoaderCircle,
  Settings2,
  FileText,
  History,
  UserRound,
  GripVertical,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Sparkles,
  X,
  RotateCcw,
  Save,
  ExternalLink,
} from 'lucide-react';
import { sectionLabels, type Resume, type SectionKey } from '../../shared/resume';
import { analyzeResume } from '../../shared/analysis';
import { api, post, put, download } from '../lib/api';
import { useToast } from '../lib/context';
import { Button, Badge, Skeleton, ErrorPanel, Modal, Field } from '../components/ui';
import { ResumePreview } from '../components/ResumePreview';
import { SectionEditor } from '../components/SectionEditor';
import { DesignPanel } from '../components/DesignPanel';
function fingerprint(r: Resume) {
  return JSON.stringify({ ...r, revision: 0, updatedAt: '' });
}
export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const [resume, setResume] = useState<Resume | null>(null);
  const latest = useRef<Resume | null>(null);
  const saved = useRef('');
  const inFlight = useRef<Promise<Resume> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const [section, setSection] = useState<'personal' | SectionKey>('personal');
  const [tab, setTab] = useState<'content' | 'design' | 'history'>('content');
  const [mobileTab, setMobileTab] = useState('Editor');
  const [versions, setVersions] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [ai, setAI] = useState<{ original: string; apply: (text: string) => void } | null>(null);
  const [aiAction, setAIAction] = useState('Improve');
  const [suggestion, setSuggestion] = useState('');
  const [aiBusy, setAIBusy] = useState(false);
  const [aiError, setAIError] = useState('');
  const drag = useRef<number | null>(null);
  const update = (r: Resume) => {
    const next = {
      ...r,
      revision: latest.current?.revision ?? r.revision,
      updatedAt: latest.current?.updatedAt ?? r.updatedAt,
    };
    latest.current = next;
    setResume(next);
    setSaveState('unsaved');
  };
  const load = useCallback(() => {
    setLoading(true);
    api<Resume>(`/resumes/${id}`)
      .then((r) => {
        latest.current = r;
        saved.current = fingerprint(r);
        setResume(r);
        setError('');
        setSaveState('saved');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(load, [load]);
  const save = useCallback(async (): Promise<Resume | undefined> => {
    while (inFlight.current) await inFlight.current;
    const r = latest.current;
    if (!r) return;
    const content = fingerprint(r);
    if (content === saved.current) return r;
    setSaveState('saving');
    const operation = put<Resume>(`/resumes/${id}`, r);
    inFlight.current = operation;
    try {
      const result = await operation;
      saved.current = content;
      const next = {
        ...latest.current!,
        revision: result.revision,
        updatedAt: result.updatedAt,
        status: result.status,
      };
      latest.current = next;
      setResume(next);
      setSaveState(fingerprint(next) === content ? 'saved' : 'unsaved');
      return result;
    } catch (e) {
      setSaveState('error');
      throw e;
    } finally {
      inFlight.current = null;
    }
  }, [id]);
  const navigating = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname &&
      !!latest.current &&
      fingerprint(latest.current) !== saved.current,
  );
  useEffect(() => {
    if (blocker.state === 'blocked' && !navigating.current) {
      navigating.current = true;
      void save()
        .then(() => {
          if (latest.current && fingerprint(latest.current) !== saved.current) return save();
        })
        .then(() => blocker.proceed())
        .catch((e) => {
          notify((e as Error).message, 'error');
          blocker.reset();
        })
        .finally(() => {
          navigating.current = false;
        });
    }
  }, [blocker, save, notify]);
  useEffect(() => {
    if (!resume || saveState === 'error') return;
    const timer = setTimeout(() => {
      void save().catch((e) => notify(e.message, 'error'));
    }, 1400);
    return () => clearTimeout(timer);
  }, [resume, save, saveState, notify]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (latest.current && fingerprint(latest.current) !== saved.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  useEffect(() => {
    if (tab === 'history')
      void api<any[]>(`/resumes/${id}/versions`)
        .then(setVersions)
        .catch((e) => notify(e.message, 'error'));
  }, [tab, id, notify]);
  const generate = async () => {
    if (!ai) return;
    setAIBusy(true);
    setAIError('');
    try {
      const result = await post<{ suggestion: string }>('/ai/improve', {
        resumeId: id,
        text: ai.original,
        action: aiAction,
      });
      setSuggestion(result.suggestion);
    } catch (e) {
      setAIError((e as Error).message);
    } finally {
      setAIBusy(false);
    }
  };
  if (loading) return <Skeleton />;
  if (error || !resume)
    return (
      <div className="page">
        <ErrorPanel message={error || 'Resume not found.'} retry={load} />
        <Link to="/resumes">Back to resumes</Link>
      </div>
    );
  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= resume.sections.length) return;
    const sections = [...resume.sections];
    const [item] = sections.splice(from, 1);
    sections.splice(to, 0, item);
    update({ ...resume, sections });
  };
  const score = analyzeResume(resume).score;
  return (
    <div className="editor-page">
      <div className="editor-topbar">
        <Link className="icon-button" to="/resumes" aria-label="Back to resumes">
          <ChevronLeft size={20} />
        </Link>
        <div className="editor-name">
          <input
            aria-label="Resume name"
            value={resume.name}
            onChange={(e) => update({ ...resume, name: e.target.value })}
          />
          <span className={`save-status ${saveState === 'error' ? 'danger-text' : ''}`}>
            {saveState === 'saving' ? (
              <LoaderCircle size={12} className="spin" />
            ) : saveState === 'saved' ? (
              <Cloud size={13} />
            ) : (
              <span className="unsaved-dot" />
            )}
            {saveState === 'saving'
              ? 'Saving changes…'
              : saveState === 'saved'
                ? 'All changes saved'
                : saveState === 'error'
                  ? 'Save failed · retry below'
                  : 'Unsaved changes'}
          </span>
        </div>
        <div className="editor-actions">
          <Badge tone="green">{score} ATS score</Badge>
          <Button
            variant="secondary"
            title="Save resume"
            aria-label="Save resume"
            loading={saveState === 'saving'}
            onClick={() =>
              void save()
                .then(() => notify('Resume saved'))
                .catch((e) => notify(e.message, 'error'))
            }
          >
            <Save size={16} />
            <span>Save</span>
          </Button>
          <Button
            loading={exporting}
            disabled={saveState === 'saving'}
            onClick={async () => {
              setExporting(true);
              try {
                await save();
                await download(`/resumes/${id}/export`, `${resume.name}.pdf`);
                notify('Your PDF is ready');
              } catch (e) {
                notify((e as Error).message, 'error');
              } finally {
                setExporting(false);
              }
            }}
          >
            <Download size={16} />
            <span>Download PDF</span>
          </Button>
        </div>
      </div>
      <div className="mobile-editor-tabs">
        {['Editor', 'Preview'].map((t) => (
          <button
            key={t}
            className={mobileTab === t ? 'active' : ''}
            onClick={() => setMobileTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className={`editor-layout mobile-${mobileTab.toLowerCase()}`}>
        <aside className="editor-navigation">
          <div className="editor-mode-tabs">
            {[
              { key: 'content', label: 'Content', icon: FileText },
              { key: 'design', label: 'Design', icon: Settings2 },
              { key: 'history', label: 'History', icon: History },
            ].map((t) => (
              <button
                key={t.key}
                className={tab === t.key ? 'active' : ''}
                onClick={() => setTab(t.key as typeof tab)}
              >
                <t.icon size={17} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          {tab === 'content' ? (
            <>
              <div className="editor-nav-caption">RESUME SECTIONS</div>
              <button
                className={`section-nav ${section === 'personal' ? 'active' : ''}`}
                onClick={() => setSection('personal')}
              >
                <UserRound size={15} />
                <span>Personal information</span>
                <Check size={12} />
              </button>
              {resume.sections.map((s, i) => (
                <div
                  className={`section-nav-row ${section === s.key ? 'active' : ''} ${!s.visible ? 'hidden-section' : ''}`}
                  key={s.key}
                  draggable
                  onDragStart={() => {
                    drag.current = i;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (drag.current !== null) reorder(drag.current, i);
                    drag.current = null;
                  }}
                >
                  <GripVertical size={13} />
                  <button className="section-name" onClick={() => setSection(s.key)}>
                    {sectionLabels[s.key]}
                  </button>
                  <button
                    className="section-visibility"
                    aria-label={`${s.visible ? 'Hide' : 'Show'} ${sectionLabels[s.key]}`}
                    onClick={() =>
                      update({
                        ...resume,
                        sections: resume.sections.map((x) =>
                          x.key === s.key ? { ...x, visible: !x.visible } : x,
                        ),
                      })
                    }
                  >
                    {s.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  <div className="section-movers">
                    <button
                      aria-label={`Move ${sectionLabels[s.key]} up`}
                      disabled={i === 0}
                      onClick={() => reorder(i, i - 1)}
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      aria-label={`Move ${sectionLabels[s.key]} down`}
                      disabled={i === resume.sections.length - 1}
                      onClick={() => reorder(i, i + 1)}
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>
                </div>
              ))}
              <p className="section-drag-tip">
                <GripVertical size={14} />
                Drag to reorder your story.
              </p>
            </>
          ) : (
            <div className="editor-nav-note">
              <Sparkles size={24} />
              <strong>
                {tab === 'design' ? 'Your story. Your style.' : 'Room to experiment.'}
              </strong>
              <p>
                {tab === 'design'
                  ? 'Fine-tune the details until your resume feels right.'
                  : 'Each save creates a version. You can always come back to an earlier chapter.'}
              </p>
            </div>
          )}
          <button className="editor-portfolio-link" onClick={() => navigate('/portfolio')}>
            <ExternalLink size={15} />
            Share as a portfolio
          </button>
        </aside>
        <section className="editor-form-panel">
          {tab === 'content' ? (
            <SectionEditor
              resume={resume}
              section={section}
              onChange={update}
              onAI={(original, apply) => {
                setAI({ original, apply });
                setSuggestion('');
                setAIError('');
              }}
            />
          ) : tab === 'design' ? (
            <DesignPanel resume={resume} onChange={update} />
          ) : (
            <div>
              <div className="editor-section-heading">
                <span className="eyebrow">EVERY CHAPTER, KEPT</span>
                <h2>Version history</h2>
                <p>Restore a previous version. Your current version stays in history.</p>
              </div>
              {versions.map((v) => (
                <div className="version-row" key={v.id}>
                  <span className="soft-icon">
                    <History size={18} />
                  </span>
                  <div>
                    <strong>Version {v.number}</strong>
                    <p>{new Date(v.createdAt).toLocaleString()}</p>
                  </div>
                  <Button
                    variant="ghost"
                    disabled={v.number === resume.revision || saveState === 'saving'}
                    onClick={async () => {
                      try {
                        await save();
                        const r = await post<Resume>(`/resumes/${id}/versions/${v.id}/restore`);
                        latest.current = r;
                        saved.current = fingerprint(r);
                        setResume(r);
                        setSaveState('saved');
                        setVersions(await api(`/resumes/${id}/versions`));
                        notify('Previous version restored');
                      } catch (e) {
                        notify((e as Error).message, 'error');
                      }
                    }}
                  >
                    {v.number === resume.revision ? 'Current' : 'Restore'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="editor-preview-panel">
          <div className="preview-toolbar">
            <span>
              <Eye size={15} />
              LIVE PREVIEW
            </span>
            <span>
              {resume.style.pageSize} ·{' '}
              {resume.style.columns === 'two' ? 'Two columns' : 'Print ready'}
            </span>
          </div>
          <div className="preview-paper">
            <ResumePreview resume={resume} />
          </div>
          <div className="preview-caption">
            <Check size={13} />
            Your PDF uses this exact content and styling.
          </div>
        </section>
      </div>
      {ai && (
        <Modal title="Give your words a little polish" onClose={() => setAI(null)} wide>
          <div className="modal-body ai-modal">
            <Badge tone="purple">
              <Sparkles size={12} />
              AI RESUME ASSISTANT
            </Badge>
            <Field label="What would you like to do?">
              <select value={aiAction} onChange={(e) => setAIAction(e.target.value)}>
                {[
                  'Improve',
                  'Rewrite',
                  'Make concise',
                  'Make professional',
                  'Add measurable impact',
                  'Generate alternatives',
                  'Fix grammar',
                ].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
            <div className="ai-comparison">
              <div>
                <h3>Your original</h3>
                <p>{ai.original || 'Add some content to the section first.'}</p>
              </div>
              <div>
                <h3>Suggested revision</h3>
                {aiBusy ? (
                  <div className="generating">
                    <LoaderCircle className="spin" size={20} />
                    Generating suggestions…
                  </div>
                ) : suggestion ? (
                  <textarea
                    aria-label="Suggested revision"
                    rows={7}
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                  />
                ) : (
                  <p className="muted">
                    Your suggestion will appear here. Nothing changes until you accept.
                  </p>
                )}
              </div>
            </div>
            {aiError && <ErrorPanel message={aiError} />}
            <p className="fine-print">
              Review suggestions for accuracy. Your content is sent to the configured AI provider
              when you generate.
            </p>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setAI(null)}>
                <X size={15} />
                Reject
              </Button>
              <Button
                variant="secondary"
                loading={aiBusy}
                disabled={!ai.original.trim()}
                onClick={() => void generate()}
              >
                {suggestion ? <RotateCcw size={15} /> : <Sparkles size={15} />}{' '}
                {suggestion ? 'Regenerate' : 'Generate suggestion'}
              </Button>
              {suggestion && (
                <Button
                  onClick={() => {
                    ai.apply(suggestion);
                    setAI(null);
                    notify('Suggestion accepted');
                  }}
                >
                  <Check size={16} />
                  Accept suggestion
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
