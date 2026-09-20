import type { NavItem } from 'epubjs'
import { flattenToc } from '../lib/toc'

type Props = {
  open: boolean
  items: NavItem[]
  onClose: () => void
  onSelect: (href: string) => void
}

export function TocPanel({ open, items, onClose, onSelect }: Props) {
  const rows = flattenToc(items)

  return (
    <aside className="toc" data-open={open} hidden={!open}>
      <div className="toc-head">
        <h2>Contents</h2>
        <button type="button" className="text-btn" onClick={onClose}>
          Close
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="toc-empty">This book has no table of contents.</p>
      ) : (
        <nav className="toc-list">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className="toc-item"
              style={{ paddingLeft: `${1 + row.depth * 0.85}rem` }}
              onClick={() => onSelect(row.href)}
            >
              {row.label}
            </button>
          ))}
        </nav>
      )}
    </aside>
  )
}
