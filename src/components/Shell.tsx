import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Files,
  PanelsTopLeft,
  ScanLine,
  Target,
  Mail,
  MessageSquare,
  Globe,
  ChartNoAxesCombined,
  Settings,
  Search,
  Bell,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Plus,
  Check,
  UserRound,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useAuth, useToast, applyTheme } from '../lib/context';
import { api, post } from '../lib/api';
import { Modal, Button, Badge } from './ui';
export const navigation = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/resumes', label: 'My resumes', icon: Files },
  { to: '/templates', label: 'Templates', icon: PanelsTopLeft },
  { to: '/analyzer', label: 'Resume analyzer', icon: ScanLine },
  { to: '/job-matcher', label: 'Job matcher', icon: Target },
  { to: '/cover-letters', label: 'Cover letters', icon: Mail },
  { to: '/interview-prep', label: 'Interview prep', icon: MessageSquare },
  { to: '/portfolio', label: 'My portfolio', icon: Globe },
  { to: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
];
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark">
        F<span />
      </span>
      {!compact && (
        <>
          Resume<span className="brand-light">Forge</span>
        </>
      )}
    </span>
  );
}
export function Shell() {
  const { user, logout } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'help' | 'notifications' | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);
  useEffect(() => {
    applyTheme(
      String(user?.settings.theme || localStorage.getItem('rf_theme') || 'light'),
      String(user?.settings.accent || '#3154df'),
    );
    const media = matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (user?.settings.theme === 'system') applyTheme('system');
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [user]);
  useEffect(() => {
    api<any[]>('/notifications')
      .then(setNotifications)
      .catch(() => {});
  }, []);
  const current = navigation.find((n) => location.pathname.startsWith(n.to));
  return (
    <div className="app-shell">
      {mobile && <div className="sidebar-scrim" onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <NavLink to="/dashboard" className="sidebar-brand">
          <Brand />
        </NavLink>
        <button
          className="mobile-close icon-button"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav>
          {navigation.map((item, i) => (
            <NavLink
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''} ${i === 3 ? 'nav-divider' : ''}`
              }
              key={item.to}
              to={item.to}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.to === '/job-matcher' && <span className="nav-new">NEW</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon">
              <Sparkles size={17} />
            </div>
            <strong>
              Your next chapter
              <br />
              starts with a great resume.
            </strong>
            <p>A little polish. A lot of possibility.</p>
            <button onClick={() => navigate('/resumes/new')}>
              Create a resume <Plus size={15} />
            </button>
          </div>
          <NavLink className="nav-link" to="/settings">
            <Settings size={18} />
            Settings
          </NavLink>
          <div className="sidebar-user">
            <button className="user-link" onClick={() => navigate('/profile')}>
              <span className="avatar">
                {user?.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <span>
                <strong>{user?.name}</strong>
                <small>Personal account</small>
              </span>
            </button>
            <button
              className="icon-button"
              title="Sign out"
              aria-label="Sign out"
              onClick={() =>
                void logout()
                  .then(() => navigate('/login'))
                  .catch((e) => notify(e.message, 'error'))
              }
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {current?.label || (location.pathname === '/settings' ? 'Settings' : 'Your profile')}
            </strong>
          </div>
          <div className="topbar-actions">
            <form
              className="search-box"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/resumes?q=${encodeURIComponent(search)}`);
              }}
            >
              <Search size={16} />
              <input
                aria-label="Search resumes"
                placeholder="Search resumes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <button className="icon-button" aria-label="Help" onClick={() => setModal('help')}>
              <HelpCircle size={19} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => {
                setModal('notifications');
                void post('/notifications/read')
                  .then(() => setNotifications((v) => v.map((n) => ({ ...n, read: true }))))
                  .catch((error) => notify(error.message, 'error'));
              }}
            >
              <Bell size={19} />
              {notifications.some((n) => !n.read) && <i />}
            </button>
            <button
              className="avatar avatar-small"
              aria-label="Open profile"
              onClick={() => navigate('/profile')}
            >
              {user?.name.charAt(0)}
            </button>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Made for your next opportunity.</span>
          <span>
            <span className="footer-dot" />
            Private by default
          </span>
        </footer>
      </div>
      {modal === 'help' && (
        <Modal title="A little guidance, a big next step" onClose={() => setModal(null)}>
          <div className="modal-body">
            <p>
              Start with a resume, add your experience, and choose a template that feels like you.
            </p>
            {[
              {
                icon: Files,
                title: 'Make it yours',
                text: 'Your changes appear immediately in the editor preview. Save creates a restorable version.',
              },
              {
                icon: ScanLine,
                title: 'Check before you send',
                text: 'Run the analyzer for practical checks and compare your skills with a job description.',
              },
              {
                icon: Globe,
                title: 'Share on your terms',
                text: 'Portfolio settings let you publish, password protect, or disable your public page.',
              },
            ].map((x) => (
              <div className="help-row" key={x.title}>
                <x.icon size={23} />
                <div>
                  <h3>{x.title}</h3>
                  <p>{x.text}</p>
                </div>
              </div>
            ))}
            <Button onClick={() => setModal(null)}>Got it</Button>
          </div>
        </Modal>
      )}
      {modal === 'notifications' && (
        <Modal title="Notifications" onClose={() => setModal(null)}>
          <div className="modal-body">
            {notifications.length ? (
              notifications.map((n) => (
                <div className="help-row" key={n.id}>
                  <span className="soft-icon">
                    <Check size={20} />
                  </span>
                  <div>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                  </div>
                </div>
              ))
            ) : (
              <p>You’re all caught up. Updates about your workspace will appear here.</p>
            )}
            <Badge tone="green">
              <UserRound size={12} />
              Only your account activity
            </Badge>
          </div>
        </Modal>
      )}
    </div>
  );
}
