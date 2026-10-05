import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserRound,
  Save,
  Monitor,
  Sun,
  Moon,
  Lock,
  ShieldCheck,
  LogOut,
  Trash2,
  Check,
  Mail,
} from 'lucide-react';
import { type Personal, emptyPersonal } from '../../shared/resume';
import { api, post, put } from '../lib/api';
import { useAuth, useToast, applyTheme } from '../lib/context';
import {
  PageHeading,
  Button,
  Field,
  Toggle,
  Tabs,
  Badge,
  Modal,
  ErrorPanel,
} from '../components/ui';
export function ProfilePage() {
  const { refresh } = useAuth();
  const notify = useToast();
  const [personal, setPersonal] = useState<Personal>(emptyPersonal);
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/profile')
      .then((p) => {
        setPersonal(p.personal);
        setBio(p.bio);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="page">
      <PageHeading
        eyebrow="THE PERSON BEHIND THE PAPER"
        title="Your professional profile."
        description="Keep the essentials together. Reuse them in every new resume."
      />
      <form
        className="panel profile-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await put('/profile', { personal, bio });
            await refresh();
            notify('Profile updated');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="profile-banner">
          <span className="profile-photo">
            {personal.photo ? (
              <img alt={personal.name} src={`/api/files/${encodeURIComponent(personal.photo)}`} />
            ) : (
              <UserRound size={30} />
            )}
          </span>
          <div>
            <h2>{personal.name || 'Make yourself at home'}</h2>
            <p>{personal.title || 'A few details to introduce yourself.'}</p>
          </div>
          <label className="btn btn-secondary upload-button">
            Change photo
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append('file', file);
                try {
                  const result = await api<{ key: string }>('/profile/photo', {
                    method: 'POST',
                    body: form,
                  });
                  setPersonal({ ...personal, photo: result.key });
                } catch (e) {
                  notify((e as Error).message, 'error');
                }
              }}
            />
          </label>
        </div>
        {error && <ErrorPanel message={error} />}
        <div className="field-grid">
          {(
            [
              { key: 'name', label: 'Full name' },
              { key: 'title', label: 'Professional title' },
              { key: 'email', label: 'Contact email', type: 'email' },
              { key: 'phone', label: 'Phone number' },
              { key: 'location', label: 'Location' },
              { key: 'website', label: 'Website', type: 'url' },
              { key: 'linkedin', label: 'LinkedIn', type: 'url' },
              { key: 'github', label: 'GitHub', type: 'url' },
            ] as const
          ).map((f) => (
            <Field label={f.label} key={f.key}>
              <input
                type={'type' in f ? f.type : 'text'}
                value={personal[f.key]}
                onChange={(e) => setPersonal({ ...personal, [f.key]: e.target.value })}
              />
            </Field>
          ))}
          <Field label="A little about you" className="field-wide">
            <textarea
              rows={4}
              value={bio}
              maxLength={3000}
              onChange={(e) => setBio(e.target.value)}
            />
          </Field>
        </div>
        <div className="form-footer">
          <p>Changes apply to new resumes. Existing resumes keep their own details.</p>
          <Button loading={busy}>
            <Save size={16} />
            Save profile
          </Button>
        </div>
      </form>
    </div>
  );
}
export function SettingsPage() {
  const { user, refresh, setUser } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Appearance');
  const [theme, setTheme] = useState(String(user?.settings.theme || 'light'));
  const [accent, setAccent] = useState(String(user?.settings.accent || '#3154df'));
  const [emailNotifications, setEmailNotifications] = useState(
    user?.settings.emailNotifications !== false,
  );
  const [productUpdates, setProductUpdates] = useState(user?.settings.productUpdates === true);
  const [analytics, setAnalytics] = useState(user?.settings.analytics !== false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [devLink, setDevLink] = useState('');
  useEffect(() => {
    if (tab === 'Security')
      api<any[]>('/auth/sessions')
        .then(setSessions)
        .catch((e) => notify(e.message, 'error'));
  }, [tab, notify]);
  const save = async () => {
    setBusy(true);
    try {
      await put('/settings', { theme, accent, emailNotifications, productUpdates, analytics });
      applyTheme(theme, accent);
      await refresh();
      notify('Preferences saved');
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="A workspace that works for you."
        description="Manage your account, preferences, and privacy."
      />
      <div className="settings-layout">
        <Tabs
          items={['Account', 'Appearance', 'Privacy', 'Notifications', 'Security']}
          value={tab}
          onChange={setTab}
        />
        <div className="panel settings-panel">
          {tab === 'Appearance' ? (
            <>
              <h2>Set the mood.</h2>
              <p className="muted">A comfortable space for your next big step.</p>
              <div className="theme-options">
                {[
                  { id: 'light', name: 'Light', icon: Sun },
                  { id: 'dark', name: 'Dark', icon: Moon },
                  { id: 'system', name: 'System', icon: Monitor },
                ].map((t) => (
                  <button
                    key={t.id}
                    className={`${theme === t.id ? 'selected' : ''} theme-${t.id}`}
                    onClick={() => {
                      setTheme(t.id);
                      applyTheme(t.id, accent);
                    }}
                  >
                    <div className="theme-mini">
                      <span />
                      <div>
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                    <span>
                      <t.icon size={16} />
                      {t.name}
                      {theme === t.id && <Check size={15} />}
                    </span>
                  </button>
                ))}
              </div>
              <h3>Your accent color</h3>
              <div className="accent-swatches">
                {['#3154df', '#147d76', '#7651b0', '#9d453d', '#263245'].map((c) => (
                  <button
                    key={c}
                    aria-label={`Accent ${c}`}
                    style={{ background: c }}
                    onClick={() => {
                      setAccent(c);
                      applyTheme(theme, c);
                    }}
                  >
                    {accent === c && <Check size={16} />}
                  </button>
                ))}
                <input
                  type="color"
                  aria-label="Custom accent color"
                  value={accent}
                  onChange={(e) => {
                    setAccent(e.target.value);
                    applyTheme(theme, e.target.value);
                  }}
                />
              </div>
            </>
          ) : tab === 'Privacy' ? (
            <>
              <h2>Your story. Your choice.</h2>
              <Toggle
                label="Portfolio analytics"
                description="Collect anonymous view and download counts. No IP addresses or location data."
                checked={analytics}
                onChange={setAnalytics}
              />
              <div className="privacy-banner">
                <ShieldCheck size={22} />
                <p>
                  Your resumes are private until you publish a portfolio. Disable public access any
                  time in portfolio settings.
                </p>
              </div>
              <Button variant="secondary" onClick={() => navigate('/portfolio')}>
                Manage portfolio visibility
              </Button>
            </>
          ) : tab === 'Notifications' ? (
            <>
              <h2>Stay in the loop, on your terms.</h2>
              <Toggle
                label="Account email notifications"
                description="Preference for account activity emails when email delivery is configured."
                checked={emailNotifications}
                onChange={setEmailNotifications}
              />
              <Toggle
                label="Product updates"
                description="Opt in to occasional news. Marketing delivery is not enabled in this release."
                checked={productUpdates}
                onChange={setProductUpdates}
              />
              <p className="fine-print">
                Essential verification and security emails are always sent.
              </p>
            </>
          ) : tab === 'Account' ? (
            <>
              <h2>The essentials.</h2>
              <div className="account-details">
                <span className="avatar">{user?.name.charAt(0)}</span>
                <div>
                  <h3>{user?.name}</h3>
                  <p>{user?.email}</p>
                </div>
                <Badge tone={user?.verified ? 'green' : 'orange'}>
                  {user?.verified ? 'Email verified' : 'Verification needed'}
                </Badge>
              </div>
              <Button variant="secondary" onClick={() => navigate('/profile')}>
                Edit profile
              </Button>
              {!user?.verified && (
                <Button
                  variant="ghost"
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const result = await post('/auth/resend-verification');
                      setDevLink(result.developmentLink || '');
                      notify(result.message);
                    } catch (e) {
                      notify((e as Error).message, 'error');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Mail size={15} />
                  Resend verification
                </Button>
              )}
              {devLink && (
                <div className="development-note">
                  Local development email: <a href={devLink}>Verify email</a>
                </div>
              )}
              <div className="danger-zone">
                <h3>Delete account</h3>
                <p>
                  Permanently remove your profile, resumes, versions, cover letters, and portfolio.
                </p>
                <Button variant="danger" onClick={() => setDeleting(true)}>
                  <Trash2 size={15} />
                  Delete my account
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2>Keep your next chapter secure.</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await post('/auth/change-password', { currentPassword, password });
                    setCurrentPassword('');
                    setPassword('');
                    notify('Password changed. Other sessions have been signed out.');
                  } catch (e) {
                    notify((e as Error).message, 'error');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="field-grid">
                  <Field label="Current password">
                    <input
                      type="password"
                      value={currentPassword}
                      autoComplete="current-password"
                      required
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </Field>
                  <Field label="New password">
                    <input
                      type="password"
                      value={password}
                      autoComplete="new-password"
                      minLength={10}
                      required
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                </div>
                <Button variant="secondary" loading={busy}>
                  <Lock size={15} />
                  Update password
                </Button>
              </form>
              <div className="settings-divider" />
              <h3>Active sessions</h3>
              {sessions.map((s) => (
                <div className="session-row" key={s.id}>
                  <Monitor size={20} />
                  <div>
                    <strong>
                      {s.agent.includes('Edg')
                        ? 'Microsoft Edge'
                        : s.agent.includes('Chrome')
                          ? 'Chrome'
                          : s.agent.includes('Firefox')
                            ? 'Firefox'
                            : 'Web browser'}
                    </strong>
                    <p>Signed in {new Date(s.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge tone="green">Active</Badge>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await post('/auth/logout-all');
                    setUser(null);
                    navigate('/login');
                  } catch (e) {
                    notify((e as Error).message, 'error');
                  }
                }}
              >
                <LogOut size={15} />
                Sign out of all sessions
              </Button>
            </>
          )}
          {['Appearance', 'Privacy', 'Notifications'].includes(tab) && (
            <div className="form-footer">
              <Button loading={busy} onClick={() => void save()}>
                <Save size={16} />
                Save preferences
              </Button>
            </div>
          )}
        </div>
      </div>
      {deleting && (
        <Modal title="Permanently delete your account?" onClose={() => setDeleting(false)}>
          <form
            className="modal-body"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api('/auth/account', {
                  method: 'DELETE',
                  body: JSON.stringify({ confirmation: confirm, password: currentPassword }),
                });
                setUser(null);
                navigate('/');
              } catch (e) {
                notify((e as Error).message, 'error');
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              This cannot be undone. All your ResumeForge documents and public pages will be
              removed.
            </p>
            <Field label="Type DELETE to confirm">
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                pattern="DELETE"
              />
            </Field>
            <Field label="Confirm your password">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </Field>
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={() => setDeleting(false)}>
                Keep my account
              </Button>
              <Button variant="danger" loading={busy} disabled={confirm !== 'DELETE'}>
                Delete permanently
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
