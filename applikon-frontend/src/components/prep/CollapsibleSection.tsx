import { useState, type CSSProperties, type ReactNode } from 'react'
import './prep.css'

interface Props {
  title: string
  // Emoji / node shown before the title, tinted with `accent`.
  icon?: ReactNode
  // Accent colour for the icon, the left border, and (via `--section-accent`) the
  //  tinting of the Q&A cards inside the expanded body.
  accent?: string
  // Optional control rendered on the right of the header (e.g. an "Edit" link).
  //  Lives outside the toggle button, so clicking it never toggles the section.
  action?: ReactNode
  defaultOpen?: boolean
  // Optional test hook (kept language-independent for E2E).
  dataCy?: string
  children: ReactNode
}

// Accordion section (chevron + icon + title). The accent colours the inside content
//  (not the header bar) so expanded sections are easy to tell apart.
export function CollapsibleSection({ title, icon, accent, action, defaultOpen = false, dataCy, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  const rootStyle = accent
    ? ({ borderLeftColor: accent, '--section-accent': accent } as unknown as CSSProperties)
    : undefined

  return (
    <div className="collapsible" style={rootStyle} data-cy={dataCy}>
      <div className="collapsible-head">
        <button
          type="button"
          className="collapsible-toggle"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <span className="collapsible-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
          {icon && <span className="collapsible-icon" style={accent ? { color: accent } : undefined} aria-hidden="true">{icon}</span>}
          <span className="collapsible-title">{title}</span>
        </button>
        {action && <div className="collapsible-action">{action}</div>}
      </div>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  )
}

export default CollapsibleSection
