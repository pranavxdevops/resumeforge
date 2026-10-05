import React, { useEffect, useId, useRef, useState } from 'react';
import { X, LoaderCircle, FileText, Plus, Check, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
function labelControl(element: React.ReactElement, id: string): React.ReactElement {
  const props = element.props as any;
  if (typeof element.type === 'string' && ['input', 'textarea', 'select'].includes(element.type))
    return React.cloneElement(element as React.ReactElement<any>, { id });
  return React.cloneElement(
    element as React.ReactElement<any>,
    {},
    React.Children.map(props.children, (child) =>
      React.isValidElement(child) ? labelControl(child, id) : child,
    ),
  );
}
export function Button({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
}) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      {...props}
      disabled={loading || props.disabled}
    >
      {loading && <LoaderCircle size={16} className="spin" />}
      {children}
    </button>
  );
}
export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: React.ReactElement;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {labelControl(children, id)}
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const list = focusable();
        const first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handle);
    return () => {
      document.removeEventListener('keydown', handle);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
export function EmptyState({
  title,
  description,
  action,
  label = 'Create resume',
}: {
  title: string;
  description: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <FileText size={28} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <Button onClick={action}>
          <Plus size={16} />
          {label}
        </Button>
      )}
    </div>
  );
}
export function Skeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="skeleton-layout" aria-label="Loading" aria-busy="true">
      <div className="skeleton skeleton-heading" />
      <div className="skeleton-grid">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item}
          role="tab"
          aria-selected={value === item}
          className={value === item ? 'active' : ''}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="toggle-row">
      <div>
        <strong>{label}</strong>
        {description && <p>{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        className={`toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span>{checked && <Check size={10} />}</span>
      </button>
    </div>
  );
}
export function Dropdown({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('click', outside);
      document.removeEventListener('keydown', key);
    };
  }, []);
  return (
    <div className="dropdown" ref={ref}>
      <button
        className="dropdown-trigger"
        aria-expanded={open}
        aria-label={typeof label === 'string' ? label : 'More options'}
        onClick={() => setOpen(!open)}
      >
        {label}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="dropdown-menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}
export function ErrorPanel({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-panel" role="alert">
      <strong>We couldn’t complete that.</strong>
      <p>{message}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="43" fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r="43"
          fill="none"
          stroke={score >= 80 ? 'var(--green)' : 'var(--accent)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${score * 2.702} 270.2`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div>
        <strong>{score}</strong>
        <small>/ 100</small>
      </div>
    </div>
  );
}
