import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
  Navigate,
  Outlet,
  Link,
} from 'react-router-dom';
import { AuthProvider, ToastProvider, useAuth } from './lib/context';
import { Shell } from './components/Shell';
import { Skeleton } from './components/ui';
import { Landing } from './pages/Landing';
import { AuthPage } from './pages/Auth';
import { Dashboard, ResumesPage } from './pages/Dashboard';
import { TemplatesPage } from './pages/Templates';
import { Editor } from './pages/Editor';
import { AnalyzerPage, JobMatcherPage } from './pages/Analysis';
import { CoverLettersPage } from './pages/CoverLetters';
import { InterviewPage } from './pages/Interview';
import { PortfolioPage, PublicPortfolio } from './pages/Portfolio';
import { AnalyticsPage } from './pages/Analytics';
import { ProfilePage, SettingsPage } from './pages/Settings';
function Protected() {
  const { user, loading } = useAuth();
  return loading ? <Skeleton /> : user ? <Outlet /> : <Navigate to="/login" replace />;
}
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path="/reset-password" element={<AuthPage mode="reset" />} />
      <Route path="/verify-email" element={<AuthPage mode="verify" />} />
      <Route path="/r/:username" element={<PublicPortfolio />} />
      <Route element={<Protected />}>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resumes" element={<ResumesPage />} />
          <Route path="/resumes/new" element={<TemplatesPage create />} />
          <Route path="/resumes/:id/edit" element={<Editor />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/analyzer" element={<AnalyzerPage />} />
          <Route path="/job-matcher" element={<JobMatcherPage />} />
          <Route path="/cover-letters" element={<CoverLettersPage />} />
          <Route path="/interview-prep" element={<InterviewPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route
        path="*"
        element={
          <div className="not-found">
            <span>404</span>
            <h1>This page is still unwritten.</h1>
            <p>The link may have changed. Let’s get you back to your story.</p>
            <Link className="btn btn-primary" to="/dashboard">
              Back to workspace
            </Link>
          </div>
        }
      />
    </>,
  ),
);
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  );
}
