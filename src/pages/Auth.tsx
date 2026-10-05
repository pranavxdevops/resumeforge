import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Eye, EyeOff, Lock, Sparkles } from 'lucide-react';
import { useAuth, useToast } from '../lib/context';
import { api, post } from '../lib/api';
import { Brand } from '../components/Shell';
import { Button, Field, ErrorPanel, Badge } from '../components/ui';
export function AuthPage({ mode }: { mode: 'login' | 'register' | 'forgot' | 'reset' | 'verify' }) {
  const { setUser, refresh } = useAuth();
  const navigate = useNavigate();
  const notify = useToast();
  const [params] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [developmentLink, setDevelopmentLink] = useState('');
  const [config, setConfig] = useState<{ google: boolean; development: boolean } | null>(null);
  useEffect(() => {
    api('/auth/config')
      .then(setConfig)
      .catch(() => {});
    setError('');
    setMessage('');
  }, [mode]);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (mode === 'login' || mode === 'register') {
        const result = await post(`/auth/${mode}`, { name, email, password });
        setUser(result.user);
        if (result.developmentLink)
          sessionStorage.setItem('rf_verify_link', result.developmentLink);
        navigate('/dashboard');
      } else if (mode === 'forgot') {
        const result = await post('/auth/forgot-password', { email });
        setMessage(result.message);
        setDevelopmentLink(result.developmentLink || '');
      } else if (mode === 'reset') {
        await post('/auth/reset-password', { password, token: params.get('token') });
        notify('Password reset. Sign in with your new password.');
        navigate('/login');
      } else {
        await post('/auth/verify-email', { token: params.get('token') });
        await refresh();
        setMessage('Your email is verified. You’re ready for your next chapter.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const titles = {
    login: 'Good to have you back.',
    register: 'Your next chapter starts here.',
    forgot: 'Let’s get you back in.',
    reset: 'A fresh start, securely.',
    verify: 'One last introduction.',
  };
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Link to="/">
          <Brand />
        </Link>
        <div className="auth-story-content">
          <Badge tone="blue">
            <Sparkles size={13} />
            YOUR EXPERIENCE DESERVES MORE
          </Badge>
          <h1>
            You’ve done
            <br />
            the work.
            <br />
            <span>Let it show.</span>
          </h1>
          <p>
            Build a resume that opens doors.
            <br />
            And a career story that’s entirely yours.
          </p>
          <div className="auth-benefits">
            {[
              'Beautiful, professional templates',
              'A live editor that keeps up with you',
              'Practical tools for your next opportunity',
            ].map((s) => (
              <span key={s}>
                <Check size={16} />
                {s}
              </span>
            ))}
          </div>
        </div>
        <span className="auth-story-footer">Thoughtfully built for what comes next.</span>
      </section>
      <section className="auth-form-side">
        <Link to="/" className="auth-mobile-brand">
          <Brand />
        </Link>
        <div className="auth-form-wrap">
          <div className="eyebrow">
            {mode === 'login'
              ? 'WELCOME BACK'
              : mode === 'register'
                ? 'MAKE YOUR NEXT MOVE'
                : 'YOUR ACCOUNT'}
          </div>
          <h2>{titles[mode]}</h2>
          <p>
            {mode === 'login'
              ? 'Sign in to pick up where you left off.'
              : mode === 'register'
                ? 'Create your workspace. Make your experience count.'
                : mode === 'forgot'
                  ? 'Enter your email and we’ll send a password reset link.'
                  : mode === 'reset'
                    ? 'Choose a strong password with at least 10 characters.'
                    : 'Verify your email address to complete your account.'}
          </p>
          {error && <ErrorPanel message={error} />}{' '}
          {message ? (
            <div className="success-panel">
              <Check size={22} />
              <p>{message}</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {mode === 'register' && (
                <Field label="Full name">
                  <input
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    minLength={2}
                  />
                </Field>
              )}
              {['login', 'register', 'forgot'].includes(mode) && (
                <Field label="Email address">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </Field>
              )}
              {['login', 'register', 'reset'].includes(mode) && (
                <Field
                  label="Password"
                  hint={
                    mode !== 'login'
                      ? 'At least 10 characters. Make it memorable, not predictable.'
                      : undefined
                  }
                >
                  <div className="password-input">
                    <input
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      minLength={10}
                      maxLength={128}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      aria-label={show ? 'Hide password' : 'Show password'}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>
              )}
              {mode === 'login' && (
                <Link className="forgot-link" to="/forgot-password">
                  Forgot password?
                </Link>
              )}
              <Button className="full-width auth-submit" loading={busy}>
                {mode === 'login'
                  ? 'Sign in'
                  : mode === 'register'
                    ? 'Create account'
                    : mode === 'forgot'
                      ? 'Send reset link'
                      : mode === 'reset'
                        ? 'Set new password'
                        : 'Verify my email'}
              </Button>
            </form>
          )}
          {developmentLink && (
            <div className="development-note">
              Email delivery is in local development mode.{' '}
              <a href={developmentLink}>Open the password reset link</a>.
            </div>
          )}
          {config?.google && ['login', 'register'].includes(mode) && (
            <>
              <div className="auth-divider">
                <span>or continue with</span>
              </div>
              <a className="btn btn-secondary full-width" href="/api/auth/google">
                <span className="google-g">G</span>Google
              </a>
            </>
          )}
          {mode === 'login' ? (
            <p className="auth-switch">
              New to ResumeForge? <Link to="/register">Create an account</Link>
            </p>
          ) : mode === 'register' ? (
            <p className="auth-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          ) : (
            <p className="auth-switch">
              <Link to={mode === 'verify' && message ? '/dashboard' : '/login'}>
                {mode === 'verify' && message ? 'Open your workspace' : 'Back to sign in'}
              </Link>
            </p>
          )}
          {config?.development && mode === 'login' && (
            <div className="demo-login-note">
              <strong>Development workspace</strong>
              <p>
                Run the demo seed to explore with
                <br />
                pranav@example.com / ResumeForge!2026
              </p>
              <button
                type="button"
                onClick={() => {
                  setEmail('pranav@example.com');
                  setPassword('ResumeForge!2026');
                }}
              >
                Fill demo credentials
              </button>
            </div>
          )}
          <div className="auth-security">
            <Lock size={13} />
            <span>Your story stays yours. Private by default.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
