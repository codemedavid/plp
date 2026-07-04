import { useEffect, useRef, useState } from 'react';
import { Shield, FileText, ChevronDown } from 'lucide-react';
import type { CoaLink } from '../../types';

type CoaButtonVariant = 'card' | 'pdp';

interface CoaButtonProps {
  links: CoaLink[];
  variant?: CoaButtonVariant;
}

const TRIGGER_CLASS: Record<CoaButtonVariant, string> = {
  card: 'shrink-0 inline-flex items-center gap-1 px-3 py-2.5 sm:py-3 rounded-full border border-gold-500 text-gold-700 text-[10px] sm:text-xs font-semibold tracking-wide uppercase hover:bg-gold-500 hover:text-white transition-colors',
  pdp: 'px-5 py-3 rounded-full border border-charcoal-200 text-charcoal-900 text-sm font-bold hover:bg-charcoal-50 transition-colors inline-flex items-center gap-1.5 flex-shrink-0',
};

const DISABLED_CLASS: Record<CoaButtonVariant, string> = {
  card: 'shrink-0 inline-flex items-center gap-1 px-3 py-2.5 sm:py-3 rounded-full border border-charcoal-200 text-charcoal-400 text-[10px] sm:text-xs font-semibold tracking-wide uppercase cursor-not-allowed',
  pdp: 'px-5 py-3 rounded-full border border-charcoal-200 text-charcoal-400 text-sm font-bold cursor-not-allowed inline-flex items-center gap-1.5 flex-shrink-0',
};

const ICON_CLASS: Record<CoaButtonVariant, string> = {
  card: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
  pdp: 'w-4 h-4',
};

const LABEL: Record<CoaButtonVariant, string> = {
  card: 'COA',
  pdp: 'CoA',
};

/**
 * Certificate of Analysis control.
 *
 * - 0 links  → disabled button (used on the product detail page where the slot is always shown).
 * - 1 link   → a direct external anchor (preserves the original single-COA behavior).
 * - 2+ links → a dropdown menu listing each labeled document.
 *
 * `onClick` is stopped from bubbling so the control works inside a clickable product card.
 */
export function CoaButton({ links, variant = 'card' }: CoaButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const Icon = variant === 'card' ? Shield : FileText;
  const iconClass = ICON_CLASS[variant];
  const label = LABEL[variant];
  const stop = (event: React.MouseEvent) => event.stopPropagation();

  if (links.length === 0) {
    return (
      <button type="button" disabled aria-disabled="true" onClick={stop} className={DISABLED_CLASS[variant]}>
        <Icon className={iconClass} strokeWidth={1.8} />
        {label}
      </button>
    );
  }

  if (links.length === 1) {
    return (
      <a
        href={links[0].url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stop}
        title="View Certificate of Analysis"
        className={TRIGGER_CLASS[variant]}
      >
        <Icon className={iconClass} strokeWidth={1.8} />
        {label}
      </a>
    );
  }

  return (
    <div ref={containerRef} className="relative" onClick={stop}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="View Certificates of Analysis"
        onClick={() => setIsOpen((open) => !open)}
        className={TRIGGER_CLASS[variant]}
      >
        <Icon className={iconClass} strokeWidth={1.8} />
        {label}
        <ChevronDown className={`${iconClass} transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.8} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 min-w-[13rem] rounded-xl border border-charcoal-100 bg-white py-1 shadow-lg"
        >
          {links.map((link) => (
            <a
              key={`${link.label}-${link.url}`}
              role="menuitem"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                stop(event);
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 hover:text-charcoal-900 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 shrink-0 text-gold-600" strokeWidth={1.8} />
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
