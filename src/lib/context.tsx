import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, post } from './api';
type User = {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  settings: Record<string, unknown>;
};
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue>(null!);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const result = await api<{ user: User | null }>('/auth/me');
    setUser(result.user);
  }, []);
  useEffect(() => {
    refresh()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [refresh]);
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        refresh,
        logout: async () => {
          await post('/auth/logout');
          setUser(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
type Toast = { id: number; message: string; type: 'success' | 'error' };
const ToastContext = createContext<(message: string, type?: 'success' | 'error') => void>(() => {});
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((v) => [...v, { id, message, type }]);
    setTimeout(() => setToasts((v) => v.filter((t) => t.id !== id)), 5500);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <button
            key={t.id}
            className={`toast ${t.type}`}
            onClick={() => setToasts((v) => v.filter((x) => x.id !== t.id))}
          >
            {t.type === 'success' ? '✓' : '!'}
            <span>{t.message}</span>
            <span>×</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function applyTheme(theme: string, accent?: string) {
  const dark =
    theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  if (accent) document.documentElement.style.setProperty('--accent', accent);
  localStorage.setItem('rf_theme', theme);
}
