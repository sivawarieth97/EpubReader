import type { Annotation } from '../types/annotation'

type Props = {
  open: boolean
  items: Annotation[]
  onClose: () => void
  onOpen: (item: Annotation) => void
  onRemove: (item: Annotation) => void
}

export function NotesPanel({ open, items, onClose, onOpen, onRemove }: Props) {
  return (
    <aside className="toc notes-panel" hidden={!open}>
      <div className="toc-head">
        <h2>Highlights</h2>
        <button type="button" className="text-btn" onClick={onClose}>
          Close
        </button>
      </div>
      {items.length === 0 ? (
        <p className="toc-empty">Select text in the book to highlight it or add a note.</p>
      ) : (
        <ul className="note-list">
          {items.map((item) => (
            <li key={item.id} className="note-item" data-has-note={Boolean(item.note)}>
              <button type="button" className="note-open" onClick={() => onOpen(item)}>
                {item.note ? <p className="note-body">{item.note}</p> : null}
                <p className="note-quote">{item.text}</p>
              </button>
              <button type="button" className="text-btn" onClick={() => onRemove(item)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
