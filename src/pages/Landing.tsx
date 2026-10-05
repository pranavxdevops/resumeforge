import { Link } from 'react-router-dom';
import {
  Check,
  ShieldCheck,
  Files,
  Sparkles,
  ScanLine,
  Target,
  Mail,
  Globe,
  ChartNoAxesCombined,
  Layers,
  Download,
  ChevronRight,
} from 'lucide-react';
import { Brand } from '../components/Shell';
import { useAuth } from '../lib/context';
import { templates, blankResume } from '../../shared/resume';
import { ResumePreview } from '../components/ResumePreview';
export function Landing() {
  const { user } = useAuth();
  const start = user ? '/dashboard' : '/register';
  const preview = blankResume('Your next chapter');
  preview.personal = {
    ...preview.personal,
    name: 'Your name',
    title: 'Your next professional chapter',
    email: 'you@example.com',
    location: 'Your city',
  };
  preview.summary =
    'Your experience has a story to tell. Introduce your strengths, the work you care about, and the value you bring to your next opportunity.';
  preview.entries.experience = [
    {
      id: 'preview-role',
      fields: {
        title: 'Your most recent role',
        organization: 'Your organization',
        start: '2023-01',
        current: 'true',
        description:
          'Show the work that matters. Connect your responsibilities to real outcomes, and let your achievements speak for themselves.',
      },
    },
  ];
  preview.entries.skills = ['Your expertise', 'Your tools', 'Your strengths'].map((title, i) => ({
    id: String(i),
    fields: { title },
  }));
  preview.entries.education = [
    {
      id: 'preview-education',
      fields: { title: 'Your qualification', organization: 'Your institution' },
    },
  ];
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/">
          <Brand />
        </Link>
        <nav>
          <a href="#features">Features</a>
          <a href="#templates">Templates</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div>
          <Link className="landing-login" to={user ? '/dashboard' : '/login'}>
            {user ? 'My workspace' : 'Sign in'}
          </Link>
          <Link className="btn btn-primary" to={start}>
            Get started
          </Link>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="landing-eyebrow">
              <span />
              BUILT FOR YOUR NEXT CHAPTER
            </span>
            <h1>
              Build a resume
              <br />
              that gets
              <br />
              <em>noticed.</em>
            </h1>
            <p>
              Create ATS-friendly resumes, tailor them to any job, and showcase your career with one
              powerful platform.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-primary" to={start}>
                Create resume
              </Link>
              <a className="btn btn-secondary" href="#templates">
                Explore templates
              </a>
            </div>
            <div className="hero-reassurance">
              <Check size={15} />
              Your story, beautifully told. No design skills needed.
            </div>
          </div>
          <div className="landing-editor-demo">
            <div className="demo-window-top">
              <div>
                <i />
                <i />
                <i />
              </div>
              <span>MY NEXT OPPORTUNITY</span>
              <span>
                <Check size={12} />
                Live preview
              </span>
            </div>
            <div className="demo-editor-body">
              <aside>
                <span>YOUR RESUME</span>
                {['Personal info', 'Summary', 'Experience', 'Education', 'Skills'].map((s, i) => (
                  <button
                    key={s}
                    className={i === 1 ? 'active' : ''}
                    onClick={() => document.getElementById('interactive-preview-name')?.focus()}
                  >
                    {s}
                  </button>
                ))}
                <label>
                  Your name
                  <input
                    id="interactive-preview-name"
                    defaultValue="Your name"
                    onChange={(e) => {
                      document.querySelectorAll('.landing-live-name').forEach((n) => {
                        n.textContent = e.target.value || 'Your name';
                      });
                    }}
                  />
                </label>
                <p>Try it. Make this story yours.</p>
              </aside>
              <div className="demo-paper">
                <span className="landing-live-name">Your name</span>
                <h3>Your next professional chapter</h3>
                <div className="demo-contact">you@example.com · Your city</div>
                <h4>PROFESSIONAL SUMMARY</h4>
                <p>
                  Your experience has a story to tell. Introduce your strengths, the work you care
                  about, and the value you bring.
                </p>
                <h4>WORK EXPERIENCE</h4>
                <strong>Your most recent role</strong>
                <small>Your organization · 2023 — Present</small>
                <p>Show the work that matters. Connect your responsibilities to real outcomes.</p>
                <ul>
                  <li>Highlight a result you’re proud of.</li>
                  <li>Show your contribution to a great team.</li>
                  <li>Make your impact clear and specific.</li>
                </ul>
                <h4>SKILLS & EXPERTISE</h4>
                <p>Your expertise · Your tools · Your strengths</p>
                <h4>EDUCATION</h4>
                <strong>Your qualification</strong>
                <small>Your institution</small>
              </div>
            </div>
            <div className="floating-editor-note">
              <span>
                <Sparkles size={18} />
              </span>
              <div>
                <strong>A stronger story starts here.</strong>
                <small>One thoughtful detail at a time.</small>
              </div>
            </div>
          </div>
        </section>
        <div className="trust-strip">
          {[
            { icon: ShieldCheck, text: 'ATS friendly' },
            { icon: Files, text: 'Professional templates' },
            { icon: Sparkles, text: 'AI-powered suggestions' },
            { icon: Download, text: 'PDF export' },
            { icon: ShieldCheck, text: 'Privacy focused' },
          ].map((t) => (
            <span key={t.text}>
              <t.icon size={17} />
              {t.text}
            </span>
          ))}
        </div>
        <section className="landing-features" id="features">
          <div className="landing-section-heading">
            <div className="eyebrow">MORE THAN A RESUME BUILDER</div>
            <h2>
              Everything you need.
              <br />
              For everything that’s next.
            </h2>
            <p>From the first draft to your next interview, make every step more intentional.</p>
          </div>
          <div className="feature-grid">
            {[
              {
                icon: Files,
                title: 'Your story, in real time',
                description:
                  'Build your resume with a live visual editor. Every change, instantly on the page.',
              },
              {
                icon: Sparkles,
                title: 'A thoughtful second pair of eyes',
                description: 'Refine your words with AI suggestions. You decide what stays.',
              },
              {
                icon: ScanLine,
                title: 'Clarity before you apply',
                description:
                  'Check structure, readability, and completeness with actionable ATS feedback.',
              },
              {
                icon: Target,
                title: 'Make the connection',
                description:
                  'Compare your skills to a job description and find the words that matter.',
              },
              {
                icon: Mail,
                title: 'Make it personal',
                description:
                  'Write a cover letter that connects your real experience to the opportunity.',
              },
              {
                icon: Globe,
                title: 'A home for your experience',
                description: 'Turn your resume into a portfolio, and share it on your terms.',
              },
              {
                icon: ChartNoAxesCombined,
                title: 'See your story travel',
                description:
                  'Understand portfolio views and downloads with privacy-minded analytics.',
              },
              {
                icon: Layers,
                title: 'Room for every possibility',
                description:
                  'Create different versions for different roles. Keep every chapter in history.',
              },
            ].map((f) => (
              <div className="feature-card" key={f.title}>
                <f.icon size={23} />
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="landing-how" id="how-it-works">
          <div className="landing-section-heading">
            <div className="eyebrow">A SIMPLE PATH FORWARD</div>
            <h2>From experience to opportunity.</h2>
          </div>
          <div className="steps-grid">
            {[
              {
                title: 'Create your profile',
                text: 'Start with the person behind the experience.',
              },
              { title: 'Build your resume', text: 'Choose your design. Tell your story.' },
              { title: 'Optimize for the job', text: 'Make every word work a little harder.' },
              { title: 'Download or share', text: 'Put your next chapter out into the world.' },
            ].map((s, i) => (
              <div key={s.title}>
                <span>0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="landing-templates" id="templates">
          <div className="landing-section-heading">
            <div className="eyebrow">A FIRST IMPRESSION THAT FEELS LIKE YOU</div>
            <h2>Good design opens doors.</h2>
            <p>{templates.length} distinctive templates. Endless ways to make them yours.</p>
          </div>
          <div className="landing-template-grid">
            {templates
              .filter((_, i) => [0, 1, 4].includes(i))
              .map((t) => (
                <Link
                  key={t.id}
                  to={user ? '/templates' : '/register'}
                  className="landing-template"
                >
                  <div>
                    <ResumePreview
                      thumbnail
                      resume={{
                        ...preview,
                        template: t.id,
                        style: { ...preview.style, accent: t.accent },
                      }}
                    />
                  </div>
                  <h3>{t.name}</h3>
                  <span>
                    {t.category} <ChevronRight size={14} />
                  </span>
                </Link>
              ))}
          </div>
          <Link to={user ? '/templates' : '/register'} className="btn btn-secondary">
            Explore all templates
          </Link>
        </section>
        <section className="landing-final">
          <span className="eyebrow">THE NEXT PAGE IS YOURS</span>
          <h2>Build your next opportunity.</h2>
          <p>You bring the experience. We’ll help you tell the story.</p>
          <Link className="btn btn-primary" to={start}>
            Create my resume
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <span>© {new Date().getFullYear()} ResumeForge. Made for what’s next.</span>
        <Link to={user ? '/settings' : '/register'}>Your privacy matters</Link>
      </footer>
    </div>
  );
}
