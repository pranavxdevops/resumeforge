import React from 'react';
import { sectionLabels, templates, type Resume } from './resume';
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text
        .split('\n')
        .filter(Boolean)
        .map((line, i) => (
          <p key={i} className={/^[-•]/.test(line) ? 'bullet' : ''}>
            {line
              .replace(/^[-•]\s*/, '')
              .split(/(\*\*[^*]+\*\*)/g)
              .map((part, j) =>
                part.startsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part,
              )}
          </p>
        ))}
    </>
  );
}
function safeURL(url: string) {
  return /^https?:\/\//i.test(url) ? url : undefined;
}
function formatDate(value: string) {
  if (!value) return '';
  if (/^\d{4}$/.test(value)) return value;
  const d = new Date(value.length === 7 ? `${value}-01` : value);
  return Number.isNaN(d.valueOf())
    ? value
    : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
export function ResumeDocument({
  resume,
  photoData,
  placeholders = false,
}: {
  resume: Resume;
  photoData?: string;
  placeholders?: boolean;
}) {
  const { personal: p, style: s } = resume;
  const template = templates.find((t) => t.id === resume.template);
  const columns = s.columns === 'two' || (s.columns === 'auto' && template?.columns === 2);
  const entries = Object.fromEntries(
    Object.entries(resume.entries).map(([key, items]) => [
      key,
      items.filter((entry) =>
        key === 'skills'
          ? !!entry.fields.title?.trim()
          : Object.entries(entry.fields).some(
              ([field, value]) => field !== 'current' && !!value.trim(),
            ),
      ),
    ]),
  );
  const css = {
    '--resume-accent': s.accent,
    '--resume-heading': s.heading,
    '--resume-body': s.body,
    '--resume-border': s.border,
    '--resume-spacing': `${s.spacing}px`,
    fontFamily: `"${s.font}", ${s.font === 'Merriweather' ? 'Georgia, serif' : 'Arial, sans-serif'}`,
    fontSize: `${s.fontSize}pt`,
    lineHeight: s.lineHeight,
    padding: `${s.margin}mm`,
    width: s.pageSize === 'A4' ? '210mm' : '215.9mm',
    minHeight: s.pageSize === 'A4' ? '297mm' : '279.4mm',
  } as React.CSSProperties;
  return (
    <article
      className={`resume-document template-${resume.template} columns-${s.columns}`}
      data-layout={columns ? (template?.sidebar ? 'sidebar' : 'columns') : 'single'}
      style={css}
    >
      <header className="resume-header">
        {s.showPhoto && p.photo && (
          <img
            className="resume-photo"
            src={photoData || `/api/files/${encodeURIComponent(p.photo)}`}
            alt={p.name}
          />
        )}
        <div>
          {(p.name || placeholders) && (
            <h1 style={{ fontSize: `${s.headingSize}pt` }}>
              {p.name || (placeholders ? 'Your name' : '')}
            </h1>
          )}
          {(p.title || placeholders) && (
            <div className="resume-title">
              {p.title || (placeholders ? 'Professional title' : '')}
            </div>
          )}
        </div>
        <div className="resume-contact">
          {[p.email, p.phone, p.location].filter(Boolean).map((v, i) => (
            <span key={v}>
              {s.showIcons && <span aria-hidden="true">{['@', '☎', '⌖'][i]} </span>}
              {v}
            </span>
          ))}
          {(['website', 'linkedin', 'github'] as const)
            .filter((k) => p[k])
            .map((k) => (
              <a key={k} href={safeURL(p[k])}>
                {p[k].replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </a>
            ))}
        </div>
      </header>
      <div className="resume-body">
        {resume.sections
          .filter(
            (section) =>
              section.visible &&
              (section.key === 'summary'
                ? resume.summary.trim()
                : (entries[section.key] || []).length),
          )
          .map((section) => (
            <section key={section.key} className={`resume-section resume-section-${section.key}`}>
              <h2>{sectionLabels[section.key]}</h2>
              {section.key === 'summary' ? (
                <RichText text={resume.summary} />
              ) : section.key === 'skills' ? (
                <div className="resume-skills">
                  {Object.entries(
                    (entries.skills || []).reduce<Record<string, string[]>>((acc, e) => {
                      const category = e.fields.category || 'Skills';
                      (acc[category] ??= []).push(e.fields.title);
                      return acc;
                    }, {}),
                  ).map(([category, skills]) => (
                    <p key={category}>
                      {category !== 'Skills' && <strong>{category}: </strong>}
                      {skills.join(' · ')}
                    </p>
                  ))}
                </div>
              ) : (
                entries[section.key]?.map((e) => (
                  <div key={e.id} className="resume-entry">
                    <div className="resume-entry-top">
                      <strong>{e.fields.title}</strong>
                      {s.showDates && (e.fields.start || e.fields.end) && (
                        <span className="resume-date">
                          {formatDate(e.fields.start)}
                          {(e.fields.end || e.fields.current === 'true') &&
                            ` – ${e.fields.current === 'true' ? 'Present' : formatDate(e.fields.end)}`}
                        </span>
                      )}
                    </div>
                    {(e.fields.organization || e.fields.location) && (
                      <div className="resume-entry-sub">
                        {[e.fields.organization, e.fields.location].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {e.fields.field && (
                      <p>
                        {e.fields.field}
                        {e.fields.grade && ` · ${e.fields.grade}`}
                      </p>
                    )}
                    {e.fields.level && <p>{e.fields.level}</p>}
                    {e.fields.description && <RichText text={e.fields.description} />}
                    {e.fields.achievements && (
                      <ul>
                        {e.fields.achievements
                          .split('\n')
                          .filter(Boolean)
                          .map((a, i) => (
                            <li key={i}>{a.replace(/^[-•]\s*/, '')}</li>
                          ))}
                      </ul>
                    )}
                    {e.fields.technologies && (
                      <p className="resume-tech">{e.fields.technologies}</p>
                    )}
                    {e.fields.credentialId && <p>Credential: {e.fields.credentialId}</p>}
                    {['url', 'github']
                      .filter((k) => safeURL(e.fields[k] || ''))
                      .map((k) => (
                        <a key={k} href={safeURL(e.fields[k])}>
                          {e.fields[k].replace(/^https?:\/\//, '')}
                        </a>
                      ))}
                    {(e.fields.email || e.fields.phone) && (
                      <p>{[e.fields.email, e.fields.phone].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                ))
              )}
            </section>
          ))}
      </div>
    </article>
  );
}
