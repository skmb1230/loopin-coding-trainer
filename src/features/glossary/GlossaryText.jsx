import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { findGlossaryParts } from '../../core/glossary/findGlossaryParts.js';
import { glossaryEntries } from '../../data/glossary.js';

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.2 10.2 3.1 3.1" />
    </svg>
  );
}

function GlossaryTerm({ children, entry }) {
  const anchorRef = useRef(null);
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [position, setPosition] = useState(null);
  const open = hovered || focused;

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const width = Math.min(300, window.innerWidth - 24);
    const halfWidth = width / 2;
    const left = Math.min(window.innerWidth - halfWidth - 12, Math.max(halfWidth + 12, rect.left + rect.width / 2));
    const above = rect.top > 170;
    setPosition({ left, top: above ? rect.top - 10 : rect.bottom + 10, width, above });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className="glossary-term"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        aria-label={`${children}: 용어 설명 보기`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.currentTarget.blur();
        }}
      >
        <span>{children}</span>
        <span className="glossary-lens"><SearchIcon /></span>
      </button>
      {open && position && createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          className={`glossary-tooltip ${position.above ? 'above' : 'below'}`}
          style={{ left: position.left, top: position.top, width: position.width }}
        >
          <strong>{entry.label}</strong>
          <span>{entry.definition}</span>
        </span>,
        document.body,
      )}
    </>
  );
}

export default function GlossaryText({ text, entries = glossaryEntries }) {
  return findGlossaryParts(text, entries).map((part, index) => (
    <Fragment key={`${part.type}-${index}-${part.text}`}>
      {part.type === 'term' ? <GlossaryTerm entry={part.entry}>{part.text}</GlossaryTerm> : part.text}
    </Fragment>
  ));
}

export function GlossaryGuide({ compact = false }) {
  return (
    <div className={`glossary-guide ${compact ? 'compact' : ''}`}>
      <span><SearchIcon /></span>
      <p><strong>모르는 용어가 있나요?</strong> 돋보기가 붙은 단어에 마우스를 올리거나 탭해보세요.</p>
    </div>
  );
}
