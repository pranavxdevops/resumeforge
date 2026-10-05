import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ResumeDocument } from '../../shared/ResumeDocument';
import { paginateResume } from '../../shared/paginate';
import type { Resume } from '../../shared/resume';
export const ResumePreview = memo(function ResumePreview({
  resume,
  thumbnail = false,
  lazy = false,
}: {
  resume: Resume;
  thumbnail?: boolean;
  lazy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const source = useRef<HTMLDivElement>(null);
  const destination = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!lazy);
  const [scale, setScale] = useState(0.5);
  const [pages, setPages] = useState(1);
  const width = resume.style.pageSize === 'Letter' ? 816 : (210 * 96) / 25.4;
  const pageHeight = resume.style.pageSize === 'Letter' ? 1056 : (297 * 96) / 25.4;
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '500px' },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const update = () => {
      if (ref.current) setScale(ref.current.clientWidth / width);
    };
    const observer = new ResizeObserver(update);
    if (ref.current) observer.observe(ref.current);
    update();
    return () => observer.disconnect();
  }, [width]);
  useLayoutEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !source.current || !destination.current) return;
      const article = source.current.querySelector<HTMLElement>('.resume-document')!;
      const result = paginateResume(article);
      setPages(result.children.length);
      destination.current.replaceChildren(result);
    };
    render();
    void document.fonts.ready.then(render);
    return () => {
      cancelled = true;
    };
  }, [resume, visible]);
  const height = thumbnail ? pageHeight : pages * pageHeight + (pages - 1) * 24;
  return (
    <div
      className={`resume-preview paginated-preview ${thumbnail ? 'thumbnail' : ''}`}
      ref={ref}
      style={{ height: height * scale }}
      data-pages={pages}
    >
      {visible && (
        <>
          <div ref={source} className="resume-measure" aria-hidden="true" inert>
            <ResumeDocument resume={resume} />
          </div>
          <div
            ref={destination}
            className={`preview-scale ${thumbnail ? 'first-page-only' : ''}`}
            style={{ transform: `scale(${scale})`, width }}
          />
          {thumbnail && pages > 1 && (
            <span className="preview-page-count">1 / {pages} pages · Open preview</span>
          )}
        </>
      )}
    </div>
  );
});
