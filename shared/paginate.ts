/** Self-contained DOM pagination shared by React previews and Chromium export. */
export function paginateResume(source: HTMLElement): HTMLElement {
  const output = document.createElement('div');
  output.className = 'resume-pages';
  source.after(output);
  const padding = parseFloat(getComputedStyle(source).paddingBottom);
  const split = source.dataset.layout === 'sidebar';
  const two = split || source.dataset.layout === 'columns';
  const pages: { page: HTMLElement; lanes: HTMLElement[] }[] = [];
  const makePage = () => {
    const page = source.cloneNode(false) as HTMLElement;
    page.classList.add('resume-paper');
    page.style.height = source.style.minHeight;
    page.removeAttribute('aria-hidden');
    output.append(page);
    if (!pages.length) {
      const header = source.querySelector('.resume-header')!.cloneNode(true) as HTMLElement;
      page.append(header);
      if (split) header.querySelector('.resume-contact')?.remove();
    }
    const body = document.createElement('div');
    body.className = `resume-page-body${two ? ' resume-page-columns' : ''}${split ? ' resume-page-split' : ''}`;
    page.append(body);
    const lanes = Array.from({ length: two ? 2 : 1 }, () => {
      const lane = document.createElement('div');
      lane.className = 'resume-page-lane';
      body.append(lane);
      return lane;
    });
    pages.push({ page, lanes });
  };
  makePage();
  const sidebar = ['skills', 'education', 'certifications', 'languages', 'interests', 'references'];
  const sections = Array.from(
    source.querySelectorAll<HTMLElement>('.resume-body > .resume-section'),
  );
  const secondary = (s: HTMLElement) =>
    sidebar.some((k) => s.classList.contains(`resume-section-${k}`));
  const groups = two
    ? [sections.filter((s) => !secondary(s)), sections.filter(secondary)]
    : [sections];
  if (split && source.querySelector('.resume-contact')!.children.length) {
    const section = document.createElement('section');
    section.className = 'resume-section resume-section-contact';
    section.innerHTML = '<h2>Contact</h2>';
    section.append(source.querySelector('.resume-contact')!.cloneNode(true));
    groups[1].unshift(section);
  }
  groups.forEach((group, laneIndex) => {
    let pageIndex = 0;
    const lane = () => pages[pageIndex].lanes[laneIndex];
    const overflow = () =>
      lane().getBoundingClientRect().bottom >
      pages[pageIndex].page.getBoundingClientRect().bottom - padding + 0.5;
    const advance = () => {
      pageIndex++;
      if (!pages[pageIndex]) makePage();
    };
    group.forEach((section) => {
      const heading = section.querySelector('h2')!;
      const newFragment = () => {
        const fragment = section.cloneNode(false) as HTMLElement;
        fragment.append(heading.cloneNode(true));
        lane().append(fragment);
        return fragment;
      };
      let fragment = newFragment();
      Array.from(section.children)
        .filter((e) => e !== heading)
        .forEach((child) => {
          const copy = child.cloneNode(true) as HTMLElement;
          fragment.append(copy);
          if (!overflow()) return;
          const oversized =
            copy.getBoundingClientRect().height + heading.getBoundingClientRect().height >
            pages[pageIndex].page.getBoundingClientRect().height - padding * 2;
          copy.remove();
          if (fragment.children.length === 1) fragment.remove();
          if (!oversized && (lane().children.length || pageIndex === 0)) {
            advance();
            fragment = newFragment();
          } else if (!fragment.isConnected) lane().append(fragment);
          fragment.append(copy);
          if (!overflow()) return;
          // Keep ordinary entries together. Split oversized entries at blocks and
          // oversized paragraphs at words, so arbitrary user content never clips.
          copy.remove();
          const parts = copy.children.length ? Array.from(copy.children) : [copy];
          const containerShell = () =>
            copy.children.length
              ? (copy.cloneNode(false) as HTMLElement)
              : document.createElement('div');
          let container = containerShell();
          fragment.append(container);
          const next = () => {
            advance();
            fragment = newFragment();
            container = containerShell();
            fragment.append(container);
          };
          parts.forEach((part) => {
            const units = part.tagName === 'UL' ? Array.from(part.children) : [part];
            units.forEach((unit) => {
              let block = unit.cloneNode(true) as HTMLElement;
              if (unit.tagName === 'LI') {
                const list = document.createElement('ul');
                list.append(block);
                block = list;
              }
              container.append(block);
              if (!overflow()) return;
              block.remove();
              if (container.childNodes.length) next();
              container.append(block);
              if (!overflow()) return;
              const words = (block.textContent || '').split(/\s+/);
              block.textContent = '';
              for (const word of words) {
                const before = block.textContent;
                block.textContent = `${before} ${word}`.trim();
                if (overflow() && before) {
                  block.textContent = before;
                  next();
                  block = document.createElement('p');
                  block.textContent = word;
                  container.append(block);
                }
              }
            });
          });
        });
    });
  });
  pages.forEach(({ page }, i) => {
    page.dataset.page = String(i + 1);
  });
  return output;
}
