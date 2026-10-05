import { Check } from 'lucide-react';
import { templates, type Resume, type ResumeStyle } from '../../shared/resume';
import { Field, Toggle } from './ui';
import { withTemplate } from '../../shared/templatePreview';
export function DesignPanel({
  resume,
  onChange,
}: {
  resume: Resume;
  onChange: (resume: Resume) => void;
}) {
  const s = resume.style;
  const set = <K extends keyof ResumeStyle>(key: K, value: ResumeStyle[K]) =>
    onChange({ ...resume, style: { ...s, [key]: value } });
  return (
    <div className="design-panel">
      <div className="editor-section-heading">
        <span className="eyebrow">MAKE IT YOURS</span>
        <h2>A little style goes a long way.</h2>
        <p>Every change updates your preview instantly.</p>
      </div>
      <div className="form-section">
        <h3>Template</h3>
        <div className="template-options">
          {templates.map((t) => (
            <button
              key={t.id}
              className={resume.template === t.id ? 'selected' : ''}
              onClick={() => onChange(withTemplate(resume, t.id))}
            >
              <span style={{ background: t.accent }} />
              {t.name}
              {resume.template === t.id && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>
      <div className="form-section">
        <h3>Typography</h3>
        <Field label="Font family">
          <select
            value={s.font}
            onChange={(e) => set('font', e.target.value as ResumeStyle['font'])}
          >
            {['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Merriweather'].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <div className="field-grid">
          {(
            [
              { key: 'fontSize', label: 'Body size', min: 9, max: 18, step: 1 },
              { key: 'headingSize', label: 'Name size', min: 18, max: 42, step: 1 },
              { key: 'lineHeight', label: 'Line height', min: 1, max: 2, step: 0.05 },
              { key: 'spacing', label: 'Section spacing', min: 8, max: 32, step: 1 },
            ] as const
          ).map((f) => (
            <Field key={f.key} label={`${f.label} · ${s[f.key]}`}>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={s[f.key]}
                onChange={(e) => set(f.key, Number(e.target.value))}
              />
            </Field>
          ))}
        </div>
      </div>
      <div className="form-section">
        <h3>Page & layout</h3>
        <div className="field-grid">
          <Field label="Paper size">
            <select
              value={s.pageSize}
              onChange={(e) => set('pageSize', e.target.value as 'A4' | 'Letter')}
            >
              <option>A4</option>
              <option>Letter</option>
            </select>
          </Field>
          <Field label="Columns">
            <select
              value={s.columns}
              onChange={(e) => set('columns', e.target.value as ResumeStyle['columns'])}
            >
              <option value="auto">Template default</option>
              <option value="one">One column</option>
              <option value="two">Two columns</option>
            </select>
          </Field>
        </div>
        <Field label={`Page margins · ${s.margin} mm`}>
          <input
            type="range"
            min="12"
            max="35"
            value={s.margin}
            onChange={(e) => set('margin', Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="form-section">
        <h3>Color palette</h3>
        <div className="accent-swatches">
          {['#3154df', '#147d76', '#263245', '#77553f', '#9d453d', '#7651b0'].map((c) => (
            <button
              aria-label={`Set accent ${c}`}
              key={c}
              style={{ background: c }}
              onClick={() => set('accent', c)}
            >
              {s.accent === c && <Check size={16} />}
            </button>
          ))}
        </div>
        <div className="field-grid">
          {(['accent', 'heading', 'body', 'border'] as const).map((key) => (
            <Field label={`${key.charAt(0).toUpperCase() + key.slice(1)} color`} key={key}>
              <input type="color" value={s[key]} onChange={(e) => set(key, e.target.value)} />
            </Field>
          ))}
        </div>
      </div>
      <div className="form-section">
        <h3>Details</h3>
        <Toggle label="Profile photo" checked={s.showPhoto} onChange={(v) => set('showPhoto', v)} />
        <Toggle label="Contact icons" checked={s.showIcons} onChange={(v) => set('showIcons', v)} />
        <Toggle label="Dates" checked={s.showDates} onChange={(v) => set('showDates', v)} />
      </div>
    </div>
  );
}
