import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Search, Sparkles, Heart, Minus, Plus, Eye } from 'lucide-react';
import { templates, type Resume } from '../../shared/resume';
import {
  sampleResume,
  hasResumeContent,
  withTemplate,
  templateDetails,
} from '../../shared/templatePreview';
import { api, post, put } from '../lib/api';
import { useAuth, useToast } from '../lib/context';
import { PageHeading, Tabs, Button, Badge, Modal, Field, Skeleton } from '../components/ui';
import { ResumePreview } from '../components/ResumePreview';
export function TemplatesPage({ create = false }: { create?: boolean }) {
  const navigate = useNavigate();
  const notify = useToast();
  const { user } = useAuth();
  const [category, setCategory] = useState('All templates');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('Recommended');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [sourceId, setSourceId] = useState('sample');
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [name, setName] = useState('My professional resume');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const favoriteKey = `resumeforge-template-favorites:${user?.id}`;
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(favoriteKey) || '[]');
      return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });
  const sample = useMemo(sampleResume, []);
  const source = resumes.find((r) => r.id === sourceId) || sample;
  const previews = useMemo(
    () => Object.fromEntries(templates.map((t) => [t.id, withTemplate(source, t.id)])),
    [source],
  );
  useEffect(() => {
    api<Resume[]>('/resumes')
      .then((rows) => {
        const available = rows.filter((r) => r.status !== 'archived');
        setResumes(available);
        const populated = available.find(hasResumeContent);
        if (populated) setSourceId(populated.id);
      })
      .catch((e) => notify(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [notify]);
  const favorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((v) => v !== id) : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem(favoriteKey, JSON.stringify(next));
    } catch {
      notify('Favorites could not be saved on this browser.', 'error');
    }
  };
  const choose = (id: string) => {
    setPreview(null);
    setSelected(id);
    setName('My professional resume');
  };
  const apply = async () => {
    setBusy(true);
    try {
      if (!create && sourceId !== 'sample') {
        // Fetch the current revision so applying a design cannot replace newer content.
        const current = await api<Resume>(`/resumes/${sourceId}`);
        const saved = await put<Resume>(`/resumes/${sourceId}`, withTemplate(current, selected!));
        navigate(`/resumes/${saved.id}/edit`);
      } else {
        const r = await post<Resume>('/resumes', { name, template: selected });
        navigate(`/resumes/${r.id}/edit`);
      }
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const filtered = templates
    .filter(
      (t) =>
        (category === 'All templates' ||
          (category === 'My favorites' ? favorites.includes(t.id) : t.category === category)) &&
        `${t.name} ${t.description} ${templateDetails[t.id].bestFor}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'Name A–Z'
        ? a.name.localeCompare(b.name)
        : sort === 'Name Z–A'
          ? b.name.localeCompare(a.name)
          : sort === 'Favorites first'
            ? Number(favorites.includes(b.id)) - Number(favorites.includes(a.id))
            : 0,
    );
  return (
    <div className="page template-gallery">
      <PageHeading
        eyebrow={create ? 'A NEW BEGINNING' : 'THE TEMPLATE COLLECTION'}
        title={
          create ? 'Let’s build your next opportunity.' : 'Good design. Great first impressions.'
        }
        description={`${templates.length} thoughtful templates. One story that’s entirely yours.`}
      >
        <Badge tone="blue">
          <Check size={13} />
          Every template is customizable
        </Badge>
      </PageHeading>
      <div className="template-intro">
        <span className="soft-icon">
          <Sparkles size={22} />
        </span>
        <p>
          <strong>Your experience stays. Your look evolves.</strong> Compare complete layouts, then
          make one your own.
        </p>
      </div>
      <div className="gallery-source">
        <Field label="Preview content">
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="sample">Alex Morgan · sample resume</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <p>
          {sourceId === 'sample'
            ? 'Illustrative sample content. Your new resume starts with your profile, never the sample.'
            : `Showing your saved content from “${source.name}”. Empty sections stay hidden.`}
        </p>
      </div>
      <div className="filter-bar">
        <Tabs
          items={['All templates', 'ATS', 'Modern', 'Creative', 'Executive', 'My favorites']}
          value={category}
          onChange={setCategory}
        />
      </div>
      <div className="gallery-tools">
        <div className="search-box">
          <Search size={16} />
          <input
            aria-label="Search templates"
            placeholder="Find your style…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label>
          Sort{' '}
          <select
            aria-label="Sort templates"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {['Recommended', 'Name A–Z', 'Name Z–A', 'Favorites first'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <span>{filtered.length} templates</span>
      </div>
      {loading ? (
        <Skeleton cards={4} />
      ) : (
        <div className="template-grid">
          {filtered.map((template, i) => {
            const details = templateDetails[template.id];
            return (
              <article className="template-card" key={template.id} aria-label={template.name}>
                <div className={`template-preview-surface surface-${i % 4}`}>
                  <button
                    className="gallery-preview-button"
                    aria-label={`Preview ${template.name}`}
                    onClick={() => {
                      setPreview(template.id);
                      setZoom(100);
                    }}
                  >
                    <ResumePreview resume={previews[template.id]} thumbnail lazy />
                  </button>
                  <button
                    className={`template-favorite ${favorites.includes(template.id) ? 'is-favorite' : ''}`}
                    aria-label={`Favorite ${template.name}`}
                    aria-pressed={favorites.includes(template.id)}
                    onClick={() => favorite(template.id)}
                  >
                    <Heart
                      size={17}
                      fill={favorites.includes(template.id) ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
                <div className="template-description">
                  <div>
                    <h3>{template.name}</h3>
                    <p>{template.description}</p>
                  </div>
                  <Badge>{template.category}</Badge>
                </div>
                <div className="template-facts">
                  <span>
                    {details.columns} {details.columns === 1 ? 'column' : 'columns'}
                  </span>
                  <span>ATS: {details.ats}</span>
                  <span>Fully customizable</span>
                  <p>Best for: {details.bestFor}</p>
                </div>
                <div className="template-actions">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPreview(template.id);
                      setZoom(100);
                    }}
                  >
                    <Eye size={15} />
                    Preview
                  </Button>
                  <Button onClick={() => choose(template.id)}>Use this template</Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {!loading && !filtered.length && (
        <div className="gallery-empty">
          <Heart size={28} />
          <h2>
            {category === 'My favorites'
              ? 'Your collection starts here.'
              : 'No matching templates.'}
          </h2>
          <p>
            {category === 'My favorites'
              ? 'Tap a heart to save a template on this browser.'
              : 'Try a different search or category.'}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setCategory('All templates');
              setQuery('');
            }}
          >
            Browse all templates
          </Button>
        </div>
      )}
      {preview && (
        <Modal
          wide
          title={`${templates.find((t) => t.id === preview)?.name} · Preview`}
          onClose={() => setPreview(null)}
        >
          <div className="gallery-preview-toolbar">
            <span>{sourceId === 'sample' ? 'Alex Morgan · Sample' : source.name}</span>
            <div>
              <Button
                variant="secondary"
                aria-label="Zoom out"
                disabled={zoom <= 50}
                onClick={() => setZoom((v) => v - 25)}
              >
                <Minus size={16} />
              </Button>
              <output aria-label="Preview zoom">{zoom}%</output>
              <Button
                variant="secondary"
                aria-label="Zoom in"
                disabled={zoom >= 150}
                onClick={() => setZoom((v) => v + 25)}
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>
          <div className="gallery-preview-scroll">
            <div className="gallery-preview-zoom" style={{ width: `${zoom}%` }}>
              <ResumePreview resume={previews[preview]} />
            </div>
          </div>
          <div className="modal-actions gallery-preview-footer">
            <span>All pages · {source.style.pageSize}</span>
            <Button onClick={() => choose(preview)}>Use this template</Button>
          </div>
        </Modal>
      )}
      {selected && (
        <Modal
          title={
            !create && sourceId !== 'sample'
              ? 'Give your story a new look'
              : 'Make room for your next chapter'
          }
          onClose={() => setSelected(null)}
        >
          <form
            className="modal-body"
            onSubmit={(e) => {
              e.preventDefault();
              void apply();
            }}
          >
            <p>
              {!create && sourceId !== 'sample' ? (
                <>
                  Apply <strong>{templates.find((t) => t.id === selected)?.name}</strong> to “
                  {source.name}”. Your content stays exactly the same.
                </>
              ) : (
                <>
                  Your new resume will use{' '}
                  <strong>{templates.find((t) => t.id === selected)?.name}</strong>. Your profile
                  details are filled in automatically.
                </>
              )}
            </p>
            {(create || sourceId === 'sample') && (
              <Field label="Give your resume a name">
                <input
                  autoFocus
                  value={name}
                  required
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            )}
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button loading={busy}>
                {!create && sourceId !== 'sample' ? 'Apply template' : 'Create resume'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
