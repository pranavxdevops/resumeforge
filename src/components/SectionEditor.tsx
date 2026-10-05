import { useRef } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Bold,
  List,
  UserRound,
} from 'lucide-react';
import {
  entryFields,
  sectionLabels,
  type Resume,
  type SectionKey,
  type Entry,
} from '../../shared/resume';
import { Field, Button, EmptyState } from './ui';
import { api } from '../lib/api';
import { useToast } from '../lib/context';
export function RichEditor({
  value,
  onChange,
  onAI,
}: {
  value: string;
  onChange: (value: string) => void;
  onAI?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const format = (bold: boolean) => {
    const input = ref.current;
    if (!input) return;
    const start = input.selectionStart,
      end = input.selectionEnd;
    const selection = value.slice(start, end);
    onChange(
      value.slice(0, start) +
        (bold ? `**${selection || 'important detail'}**` : `\n- ${selection}`) +
        value.slice(end),
    );
    input.focus();
  };
  return (
    <div className="rich-editor">
      <div className="rich-toolbar">
        <button type="button" aria-label="Bold selected text" onClick={() => format(true)}>
          <Bold size={16} />
        </button>
        <button type="button" aria-label="Add bullet" onClick={() => format(false)}>
          <List size={17} />
        </button>
        <span>Keep it clear. Make it count.</span>
        {onAI && (
          <button className="ai-inline" type="button" onClick={onAI}>
            <Sparkles size={14} />
            Improve
          </button>
        )}
      </div>
      <textarea
        ref={ref}
        aria-label="Professional summary"
        rows={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="A short introduction to your experience, strengths, and what you bring to your next role."
      />
      <div className="rich-footer">
        {value.trim().split(/\s+/).filter(Boolean).length} words · Bold and bullet formatting
        supported
      </div>
    </div>
  );
}
export function SectionEditor({
  resume,
  section,
  onChange,
  onAI,
}: {
  resume: Resume;
  section: 'personal' | SectionKey;
  onChange: (resume: Resume) => void;
  onAI: (value: string, apply: (value: string) => void) => void;
}) {
  const notify = useToast();
  const drag = useRef<number | null>(null);
  if (section === 'personal')
    return (
      <div>
        <div className="editor-section-heading">
          <span className="eyebrow">THE INTRODUCTION</span>
          <h2>Let’s start with you.</h2>
          <p>Make it easy for the right people to reach you.</p>
        </div>
        <div className="photo-row">
          <span className="profile-photo">
            {resume.personal.photo ? (
              <img alt="Profile" src={`/api/files/${encodeURIComponent(resume.personal.photo)}`} />
            ) : (
              <UserRound size={27} />
            )}
          </span>
          <div>
            <label className="btn btn-secondary upload-button">
              Upload photo
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('file', file);
                  void api<{ key: string }>('/profile/photo', { method: 'POST', body: form })
                    .then(({ key }) =>
                      onChange({
                        ...resume,
                        personal: { ...resume.personal, photo: key },
                        style: { ...resume.style, showPhoto: true },
                      }),
                    )
                    .catch((e) => notify(e.message, 'error'));
                }}
              />
            </label>
            <small>Optional · JPG or PNG, up to 2 MB</small>
          </div>
        </div>
        <div className="field-grid">
          {(
            [
              { key: 'name', label: 'Full name', wide: true },
              { key: 'title', label: 'Professional title', wide: true },
              { key: 'email', label: 'Email address', type: 'email' },
              { key: 'phone', label: 'Phone number' },
              { key: 'location', label: 'City, country', wide: true },
              { key: 'website', label: 'Website', type: 'url' },
              { key: 'linkedin', label: 'LinkedIn', type: 'url' },
              { key: 'github', label: 'GitHub', type: 'url' },
            ] as const
          ).map((field) => (
            <Field
              key={field.key}
              label={field.label}
              className={'wide' in field && field.wide ? 'field-wide' : ''}
            >
              <input
                type={'type' in field ? field.type : 'text'}
                value={resume.personal[field.key]}
                placeholder={'type' in field && field.type === 'url' ? 'https://…' : field.label}
                onChange={(e) =>
                  onChange({
                    ...resume,
                    personal: { ...resume.personal, [field.key]: e.target.value },
                  })
                }
              />
            </Field>
          ))}
        </div>
        <div className="editor-tip">
          <Sparkles size={17} />
          <p>
            <strong>A small detail that matters.</strong> Use the same name and professional title
            across your resume, LinkedIn, and portfolio.
          </p>
        </div>
      </div>
    );
  if (section === 'summary')
    return (
      <div>
        <div className="editor-section-heading">
          <span className="eyebrow">YOUR ELEVATOR PITCH</span>
          <h2>A few words. A strong impression.</h2>
          <p>Connect your experience to the value you bring.</p>
        </div>
        <RichEditor
          value={resume.summary}
          onChange={(summary) => onChange({ ...resume, summary })}
          onAI={() => onAI(resume.summary, (summary) => onChange({ ...resume, summary }))}
        />
        <div className="editor-tip">
          <Sparkles size={18} />
          <p>
            Lead with your experience, highlight your strengths, and keep your summary to 3–4
            focused sentences.
          </p>
        </div>
      </div>
    );
  const entries = resume.entries[section] || [];
  const update = (data: Entry[]) =>
    onChange({ ...resume, entries: { ...resume.entries, [section]: data } });
  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= entries.length) return;
    const next = [...entries];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update(next);
  };
  const add = () =>
    update([
      ...entries,
      {
        id: crypto.randomUUID(),
        fields: Object.fromEntries(
          entryFields[section].map((f) => [f.key, f.type === 'checkbox' ? 'false' : '']),
        ),
      },
    ]);
  return (
    <div>
      <div className="editor-section-heading">
        <span className="eyebrow">YOUR STORY, IN DETAIL</span>
        <h2>{sectionLabels[section]}</h2>
        <p>
          {section === 'experience'
            ? 'Focus on what you accomplished, not just what you did.'
            : 'Add the details that make your experience distinct.'}
        </p>
      </div>
      {!entries.length ? (
        <EmptyState
          title={`Add your ${sectionLabels[section].toLowerCase()}`}
          description="Every part of your story counts. Start with one entry."
          action={add}
          label="Add entry"
        />
      ) : (
        entries.map((entry, index) => (
          <div
            className="entry-editor"
            key={entry.id}
            draggable
            onDragStart={(e) => {
              if ((e.target as HTMLElement).closest('input,textarea,select')) {
                e.preventDefault();
                return;
              }
              drag.current = index;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (drag.current !== null) reorder(drag.current, index);
              drag.current = null;
            }}
          >
            <div className="entry-editor-header">
              <GripVertical size={16} />
              <strong>
                {entry.fields.title || entry.fields.organization || `Entry ${index + 1}`}
              </strong>
              <button
                className="icon-button"
                aria-label="Move entry up"
                disabled={index === 0}
                onClick={() => reorder(index, index - 1)}
              >
                <ChevronUp size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Move entry down"
                disabled={index === entries.length - 1}
                onClick={() => reorder(index, index + 1)}
              >
                <ChevronDown size={16} />
              </button>
              <button
                className="icon-button danger-text"
                aria-label="Delete entry"
                onClick={() => update(entries.filter((_, i) => i !== index))}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="field-grid">
              {entryFields[section].map((field) => {
                const set = (value: string) =>
                  update(
                    entries.map((e, i) =>
                      i === index ? { ...e, fields: { ...e.fields, [field.key]: value } } : e,
                    ),
                  );
                if (field.type === 'checkbox')
                  return (
                    <label className="checkbox-field field-wide" key={field.key}>
                      <input
                        type="checkbox"
                        checked={entry.fields[field.key] === 'true'}
                        onChange={(e) => set(String(e.target.checked))}
                      />
                      {field.label}
                    </label>
                  );
                return (
                  <Field
                    key={field.key}
                    label={field.label}
                    className={field.wide ? 'field-wide' : ''}
                  >
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={4}
                        value={entry.fields[field.key] || ''}
                        onChange={(e) => set(e.target.value)}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={entry.fields[field.key] || ''}
                        onChange={(e) => set(e.target.value)}
                      >
                        <option value="">Select proficiency</option>
                        {field.options?.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'date' ? 'month' : field.type || 'text'}
                        disabled={
                          field.key === 'end' &&
                          section === 'experience' &&
                          entry.fields.current === 'true'
                        }
                        value={entry.fields[field.key] || ''}
                        onChange={(e) => set(e.target.value)}
                      />
                    )}
                  </Field>
                );
              })}
            </div>
            {entry.fields.description && (
              <button
                className="text-link ai-link"
                onClick={() =>
                  onAI(entry.fields.description, (value) =>
                    update(
                      entries.map((e, i) =>
                        i === index ? { ...e, fields: { ...e.fields, description: value } } : e,
                      ),
                    ),
                  )
                }
              >
                <Sparkles size={14} />
                Improve with AI
              </button>
            )}
          </div>
        ))
      )}
      {entries.length > 0 && (
        <Button variant="secondary" className="full-width dashed-button" onClick={add}>
          <Plus size={16} />
          Add {section === 'experience' ? 'experience' : section === 'skills' ? 'skill' : 'entry'}
        </Button>
      )}
    </div>
  );
}
