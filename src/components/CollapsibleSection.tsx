import type { ReactNode } from 'react';

interface CollapsibleSectionProps {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function CollapsibleSection({
  label,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="collapsible-section">
      <button
        type="button"
        className="collapsible-section__toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        {open ? 'Sakrij' : 'Prikaži'} {label}
      </button>
      {open && <div className="collapsible-section__panel">{children}</div>}
    </div>
  );
}
