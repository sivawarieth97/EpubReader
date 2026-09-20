import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { deleteBook, listBooks, searchLibrary, uploadBook } from '../api/books'
import { AskPanel } from '../components/AskPanel'
import { BookCard } from '../components/BookCard'
import { UploadDropzone } from '../components/UploadDropzone'
import type { Book } from '../types/book'
import { readerLink } from '../lib/readerLink'
import type { SearchPassage } from '../types/search'

export function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [query, setQuery] = useState('')
  const [passages, setPassages] = useState<SearchPassage[]>([])
  const [searching, setSearching] = useState(false)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await listBooks(signal)
      setBooks(data.books)
      setError(null)
    } catch (cause) {
      if (signal?.aborted) return
      if (cause instanceof ApiError && cause.status === 404) {
        setBooks([])
        setError(null)
        return
      }
      setError(cause instanceof Error ? cause.message : 'Could not load the library.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const trimmed = query.trim()
    if (!trimmed) {
      setPassages([])
      void refresh(controller.signal)
      return () => controller.abort()
    }

    const timer = window.setTimeout(() => {
      setSearching(true)
      searchLibrary(trimmed, controller.signal)
        .then((data) => {
          setBooks(data.books)
          setPassages(data.passages)
          setError(null)
        })
        .catch((cause) => {
          if (controller.signal.aborted) return
          setError(cause instanceof Error ? cause.message : 'Search failed.')
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setSearching(false)
            setLoading(false)
          }
        })
    }, 280)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, refresh])

  async function onFiles(files: File[]) {
    setUploading(true)
    setError(null)
    try {
      const uploaded: Book[] = []
      for (const file of files) {
        uploaded.push(await uploadBook(file))
      }
      setBooks((current) => {
        const seen = new Set(uploaded.map((book) => book.id))
        return [...uploaded, ...current.filter((book) => !seen.has(book.id))]
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function onDelete(book: Book) {
    const ok = window.confirm(`Remove “${book.title}” from the library?`)
    if (!ok) return
    setDeletingId(book.id)
    setError(null)
    try {
      await deleteBook(book.id)
      setBooks((current) => current.filter((item) => item.id !== book.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove the book.')
    } finally {
      setDeletingId(null)
    }
  }

  const emptyLibrary = !loading && !query.trim() && books.length === 0

  const shelfBooks = (() => {
    const byId = new Map(books.map((book) => [book.id, book]))
    for (const passage of passages) {
      if (byId.has(passage.bookId)) continue
      byId.set(passage.bookId, {
        id: passage.bookId,
        title: passage.title,
        author: passage.author,
        coverUrl: `/api/books/${passage.bookId}/cover`,
        uploadedAt: '',
        progressCfi: null,
        progressPercent: 0,
      })
    }
    return [...byId.values()]
  })()

  return (
    <div
      className="library"
      data-dragging={dragging}
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return
        setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const files = [...event.dataTransfer.files].filter((file) => file.name.toLowerCase().endsWith('.epub'))
        if (files.length) void onFiles(files)
      }}
    >
      {error ? (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button type="button" className="text-btn" onPointerDown={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : null}

      {emptyLibrary ? (
        <section className="empty" aria-labelledby="empty-title">
          <h2 id="empty-title">No books yet</h2>
          <p>Drop an EPUB anywhere on this page, or browse to add one.</p>
          <UploadDropzone disabled={uploading} onFiles={onFiles} />
          {uploading ? <p className="quiet">Adding…</p> : null}
        </section>
      ) : (
        <>
          <AskPanel />
          <div className="library-head">
            <p className="quiet">
              {searching || loading
                ? 'Searching…'
                : query.trim()
                  ? `${shelfBooks.length} ${shelfBooks.length === 1 ? 'book' : 'books'} · ${passages.length} ${passages.length === 1 ? 'passage' : 'passages'}`
                  : `${books.length} ${books.length === 1 ? 'book' : 'books'}`}
            </p>
            <div className="library-tools">
              <label className="search">
                <span className="visually-hidden">Search library</span>
                <input
                  type="search"
                  value={query}
                  placeholder="Search titles, authors, or text inside books"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <UploadDropzone compact disabled={uploading} onFiles={onFiles} />
            </div>
          </div>
          {uploading ? <p className="quiet">Adding…</p> : null}
          {query.trim() && shelfBooks.length === 0 && passages.length === 0 && !searching ? (
            <p className="quiet">No matches in this library.</p>
          ) : null}
          {passages.length > 0 ? (
            <section className="block">
              <h2 className="section-label">In the text</h2>
              <ul className="passage-list">
                {passages.map((passage, index) => (
                  <li key={`${passage.bookId}-${passage.href ?? 'none'}-${index}`}>
                    <Link
                      className="passage"
                      to={readerLink(passage.bookId, passage.href, query.trim())}
                    >
                      <p className="passage-book">
                        {passage.title}
                        {passage.author ? ` · ${passage.author}` : ''}
                      </p>
                      <p className="passage-snippet" dangerouslySetInnerHTML={{ __html: passage.snippet }} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="block">
            <h2 className="section-label">On the shelf</h2>
          <ul className="shelf">
            {shelfBooks.map((book) => (
              <li key={book.id}>
                <BookCard book={book} deleting={deletingId === book.id} onDelete={onDelete} />
              </li>
            ))}
          </ul>
          </section>
        </>
      )}
    </div>
  )
}
