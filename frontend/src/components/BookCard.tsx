import { useState } from 'react'
import { Link } from 'react-router-dom'
import { coverTone } from '../lib/coverTone'
import type { Book } from '../types/book'

type Props = {
  book: Book
  deleting?: boolean
  onDelete: (book: Book) => void
}

export function BookCard({ book, deleting = false, onDelete }: Props) {
  const percent = Math.round(book.progressPercent ?? 0)
  const [coverFailed, setCoverFailed] = useState(false)
  const showImage = Boolean(book.coverUrl) && !coverFailed

  return (
    <article className="book-card-wrap">
      <Link className="book-card" to={`/read/${book.id}`} aria-disabled={deleting}>
        <div className="book-cover" data-has-image={showImage} style={{ background: coverTone(book.id) }}>
          {showImage ? (
            <img src={book.coverUrl} alt="" onError={() => setCoverFailed(true)} />
          ) : (
            <span className="book-cover-title">{book.title}</span>
          )}
        </div>
        <div className="book-meta">
          <h2>{book.title}</h2>
          <p>{book.author ?? 'Unknown author'}</p>
          <div className="read-bar" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
      </Link>
      <button
        type="button"
        className="book-delete"
        disabled={deleting}
        aria-label={`Remove ${book.title}`}
        onClick={() => onDelete(book)}
      >
        {deleting ? 'Removing…' : 'Remove'}
      </button>
    </article>
  )
}
