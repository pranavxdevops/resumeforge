import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Globe,
  Lock,
  Copy,
  ExternalLink,
  Check,
  Download,
  Mail,
  MapPin,
  Briefcase,
  ArrowUpRight,
  Github,
  Linkedin,
} from 'lucide-react';
import { useResumes, ResumeSelect } from './Analysis';
import { api, post, put, download, ApiError } from '../lib/api';
import { useAuth, useToast } from '../lib/context';
import {
  PageHeading,
  Button,
  Field,
  Toggle,
  Badge,
  ErrorPanel,
  Skeleton,
  Tabs,
} from '../components/ui';
import { Brand } from '../components/Shell';
import { ResumePreview } from '../components/ResumePreview';
import { RichText } from '../../shared/ResumeDocument';
import type { Resume } from '../../shared/resume';
export function PortfolioPage() {
  const { resumes, selected, setSelected } = useResumes();
  const { user } = useAuth();
  const notify = useToast();
  const [slug, setSlug] = useState(user?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '');
  const [visibility, setVisibility] = useState('private');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [theme, setTheme] = useState('studio');
  const [analytics, setAnalytics] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/portfolio')
      .then((p) => {
        if (p) {
          setSelected(p.resumeId);
          setSlug(p.slug);
          setVisibility(p.visibility);
          setTheme(p.theme);
          setAnalytics(p.analytics);
          setHasPassword(p.hasPassword);
          setSaved(p);
        }
      })
      .catch((e) => setError(e.message));
  }, []);
  const resume = resumes.find((r) => r.id === selected);
  return (
    <div className="page">
      <PageHeading
        eyebrow="YOUR STORY, OUT IN THE WORLD"
        title="Give your experience a home."
        description="A personal portfolio, built from your resume and shared on your terms."
      >
        <Badge tone={saved?.visibility === 'public' ? 'green' : 'neutral'}>
          {saved?.visibility === 'public' ? <Globe size={13} /> : <Lock size={13} />}{' '}
          {saved?.visibility === 'public'
            ? 'Published'
            : saved?.visibility === 'password'
              ? 'Password protected'
              : 'Private'}
        </Badge>
      </PageHeading>
      <div className="portfolio-workspace">
        <form
          className="panel analysis-input"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              const data = await put('/portfolio', {
                resumeId: selected,
                slug,
                visibility,
                password: password || undefined,
                theme,
                analytics,
              });
              setSaved(data);
              setHasPassword(data.hasPassword);
              setPassword('');
              notify(
                visibility === 'private'
                  ? 'Portfolio saved privately'
                  : 'Your portfolio is ready to share',
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Your page, your rules.</h2>
          <ResumeSelect resumes={resumes} value={selected} onChange={setSelected} />
          <Field label="Public address">
            <div className="input-prefix">
              <span>/r/</span>
              <input
                value={slug}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                minLength={3}
                maxLength={50}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
              />
            </div>
          </Field>
          <Field label="Who can view your portfolio?">
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="private">Private · only you</option>
              <option value="public">Public · anyone with the link</option>
              <option value="password">Password protected</option>
            </select>
          </Field>
          {visibility === 'password' && (
            <Field
              label={hasPassword ? 'Set a new portfolio password · optional' : 'Portfolio password'}
            >
              <input
                type="password"
                minLength={10}
                required={!hasPassword}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 10 characters"
              />
            </Field>
          )}
          <Field label="Portfolio style">
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="studio">Studio · bold and structured</option>
              <option value="editorial">Editorial · classic and thoughtful</option>
              <option value="minimal">Minimal · just the essentials</option>
            </select>
          </Field>
          <Toggle
            label="Portfolio analytics"
            description="Count views and downloads. No IP addresses or precise location collected."
            checked={analytics}
            onChange={setAnalytics}
          />
          {error && <ErrorPanel message={error} />}
          <Button loading={busy} disabled={!selected} className="full-width">
            <Check size={16} />
            {visibility === 'private' ? 'Save portfolio settings' : 'Publish portfolio'}
          </Button>
          {saved && saved.visibility !== 'private' && (
            <div className="share-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(`${location.origin}/r/${saved.slug}`)
                    .then(() => notify('Portfolio link copied'))
                    .catch(() => notify('Copy the address from the open portfolio page.', 'error'))
                }
              >
                <Copy size={15} />
                Copy link
              </Button>
              <a
                className="btn btn-secondary"
                href={`/r/${saved.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={15} />
                Open
              </a>
            </div>
          )}
        </form>
        <div className="portfolio-preview-wrap">
          <div className="browser-chrome">
            <span />
            <span />
            <span />
            <div>resumeforge / r / {slug || 'your-name'}</div>
            <Lock size={12} />
          </div>
          {resume ? (
            <PortfolioContent resume={resume} theme={theme} preview />
          ) : (
            <div className="panel">
              <p>Create a resume to preview your portfolio.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function PortfolioContent({
  resume,
  theme,
  preview = false,
}: {
  resume: Resume;
  theme: string;
  preview?: boolean;
}) {
  const p = resume.personal;
  const visible = (key: string) => resume.sections.some((s) => s.key === key && s.visible);
  return (
    <div className={`portfolio-content portfolio-${theme} ${preview ? 'is-preview' : ''}`}>
      <div className="portfolio-nav">
        <strong>
          {p.name.split(' ')[0] || 'Your name'}
          <span>.</span>
        </strong>
        <span>Experience & perspective</span>
      </div>
      <header className="portfolio-hero">
        <Badge tone="blue">
          <Briefcase size={12} />
          {p.title || 'Your professional title'}
        </Badge>
        <h1>
          Hi, I’m {p.name.split(' ')[0] || 'you'}.<br />
          <span>I make things happen.</span>
        </h1>
        {visible('summary') && (
          <div className="portfolio-summary">
            <RichText text={resume.summary} />
          </div>
        )}
        <div className="portfolio-contact">
          <span>
            <MapPin size={15} />
            {p.location || 'Your location'}
          </span>
          {p.email && (
            <a href={`mailto:${p.email}`}>
              <Mail size={15} />
              Let’s connect
            </a>
          )}
        </div>
      </header>
      {visible('experience') && !!resume.entries.experience?.length && (
        <section>
          <div className="portfolio-section-title">
            <span>01 /</span>
            <h2>Where I’ve made an impact.</h2>
          </div>
          {resume.entries.experience.map((e) => (
            <div className="portfolio-experience" key={e.id}>
              <div>
                <small>
                  {e.fields.start?.slice(0, 4)} —{' '}
                  {e.fields.current === 'true' ? 'Present' : e.fields.end?.slice(0, 4)}
                </small>
                <h3>{e.fields.organization}</h3>
              </div>
              <div>
                <h3>{e.fields.title}</h3>
                <RichText text={e.fields.description || ''} />
                {e.fields.achievements && <RichText text={e.fields.achievements} />}
              </div>
            </div>
          ))}
        </section>
      )}
      {visible('skills') && !!resume.entries.skills?.length && (
        <section>
          <div className="portfolio-section-title">
            <span>02 /</span>
            <h2>Tools of my trade.</h2>
          </div>
          <div className="portfolio-skill-list">
            {resume.entries.skills.map((e) => (
              <span key={e.id}>{e.fields.title}</span>
            ))}
          </div>
        </section>
      )}
      {visible('projects') && !!resume.entries.projects?.length && (
        <section>
          <div className="portfolio-section-title">
            <span>03 /</span>
            <h2>Selected work.</h2>
          </div>
          {resume.entries.projects.map((e) => (
            <div className="portfolio-project" key={e.id}>
              <span>
                <Briefcase size={22} />
              </span>
              <h3>{e.fields.title}</h3>
              <p>{e.fields.description}</p>
              <small>{e.fields.technologies}</small>
              {/^https?:\/\//.test(e.fields.url || '') && (
                <a href={e.fields.url} target="_blank" rel="noreferrer">
                  View project <ArrowUpRight size={16} />
                </a>
              )}
            </div>
          ))}
        </section>
      )}
      {(['certifications', 'education'] as const).filter(visible).map(
        (key) =>
          resume.entries[key]?.length > 0 && (
            <section key={key}>
              <div className="portfolio-section-title">
                <span>{key === 'certifications' ? '04' : '05'} /</span>
                <h2>{key === 'certifications' ? 'Always learning.' : 'A strong foundation.'}</h2>
              </div>
              {resume.entries[key].map((e) => (
                <div className="portfolio-credential" key={e.id}>
                  <Check size={19} />
                  <div>
                    <h3>{e.fields.title}</h3>
                    <p>
                      {e.fields.organization}
                      {e.fields.field && ` · ${e.fields.field}`}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          ),
      )}
      <footer className="portfolio-contact-footer">
        <h2>Let’s build something meaningful.</h2>
        {p.email && (
          <a href={`mailto:${p.email}`}>
            {p.email}
            <ArrowUpRight size={18} />
          </a>
        )}
        <div>
          {p.linkedin && (
            <a href={p.linkedin} target="_blank" rel="noreferrer">
              <Linkedin size={18} />
              LinkedIn
            </a>
          )}
          {p.github && (
            <a href={p.github} target="_blank" rel="noreferrer">
              <Github size={18} />
              GitHub
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
export function PublicPortfolio() {
  const { username } = useParams();
  const [data, setData] = useState<{ resume: Resume; theme: string; analytics: boolean } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('Portfolio');
  const tracked = useRef(false);
  const notify = useToast();
  const load = () => {
    api<any>(`/public/${username}`)
      .then((d) => {
        setData(d);
        setLocked(false);
        setError('');
        if (!tracked.current) {
          tracked.current = true;
          void post(`/public/${username}/view`, { referrer: document.referrer }).catch(() => {});
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) setLocked(true);
        else setError(e.message);
      });
  };
  useEffect(load, [username]);
  return (
    <div className="public-page">
      <header className="public-topbar">
        <Link to="/">
          <Brand />
        </Link>
        {data && (
          <>
            <Tabs items={['Portfolio', 'Resume']} value={tab} onChange={setTab} />
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await download(
                    `/public/${username}/export`,
                    `${data.resume.personal.name}-resume.pdf`,
                  );
                } catch (e) {
                  notify((e as Error).message, 'error');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Download size={15} />
              Download resume
            </Button>
          </>
        )}
      </header>
      {locked ? (
        <form
          className="panel public-locked"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await post(`/public/${username}/unlock`, { password });
              load();
            } catch (e) {
              notify((e as Error).message, 'error');
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="large-soft-icon">
            <Lock size={30} />
          </span>
          <h1>A story shared with a select few.</h1>
          <p>Enter the portfolio password to continue.</p>
          <Field label="Portfolio password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Button loading={busy}>View portfolio</Button>
        </form>
      ) : error ? (
        <div className="public-locked">
          <ErrorPanel message={error} />
          <Link to="/">Explore ResumeForge</Link>
        </div>
      ) : data ? (
        <>
          {tab === 'Portfolio' ? (
            <PortfolioContent resume={data.resume} theme={data.theme} />
          ) : (
            <div className="public-resume-paper">
              <ResumePreview resume={data.resume} />
            </div>
          )}
          <div className="public-privacy">
            Built with ResumeForge.
            {data.analytics
              ? ' This page uses a first-party cookie to count visits anonymously. Do Not Track is respected.'
              : ''}
          </div>
        </>
      ) : (
        <Skeleton />
      )}
    </div>
  );
}
