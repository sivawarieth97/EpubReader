import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  bookFileUrl,
  createAnnotation,
  deleteAnnotation,
  getBook,
  listAnnotations,
  saveProgress,
} from '../api/books'
import { NotesPanel } from '../components/NotesPanel'
import { TocPanel } from '../components/TocPanel'
import { useEpub, type RelocateInfo, type SelectionInfo } from '../hooks/useEpub'
import { useAppearance } from '../lib/appearance'
import { loadFlow, loadFontSize, saveFlow, saveFontSize } from '../lib/readerPrefs'
import type { Annotation } from '../types/annotation'
import type { Book } from '../types/book'

const MIN_FONT = 80
const MAX_FONT = 160

export function ReaderPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { resolved, setMode } = useAppearance()
  const openHref = searchParams.get('href')
  const highlightQuery = searchParams.get('q')
  const [book, setBook] = useState<Book | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [flow, setFlow] = useState(() => loadFlow())
  const [fontSize, setFontSize] = useState(() => loadFontSize(100))
  const [tocOpen, setTocOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selection, setSelection] = useState<SelectionInfo | null>(null)
  const [draftNote, setDraftNote] = useState('')
  const [noteMode, setNoteMode] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const startCfi = useRef<string | null>(null)
  const progressTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    getBook(id, controller.signal)
      .then((data) => {
        startCfi.current = data.progressCfi
        setBook(data)
        setLoadError(null)
      })
      .catch((cause) => {
        if (controller.signal.aborted) return
        if (cause instanceof ApiError && cause.status === 404) {
          setLoadError('This book is not in the library.')
          return
        }
        setLoadError(cause instanceof Error ? cause.message : 'Could not open this book.')
      })
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    listAnnotations(id, controller.signal)
      .then((data) => setAnnotations(data.annotations))
      .catch((cause) => {
        if (controller.signal.aborted) return
        if (cause instanceof ApiError && cause.status === 404) {
          setAnnotations([])
          return
        }
        setActionError(cause instanceof Error ? cause.message : 'Could not load highlights.')
      })
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    saveFlow(flow)
  }, [flow])

  useEffect(() => {
    saveFontSize(fontSize)
  }, [fontSize])

  const onRelocate = useCallback(
    (info: RelocateInfo) => {
      if (!id) return
      if (progressTimer.current) window.clearTimeout(progressTimer.current)
      progressTimer.current = window.setTimeout(() => {
        void saveProgress(id, info.cfi, info.percent).catch((cause) => {
          if (cause instanceof ApiError && cause.status === 404) return
          setActionError(cause instanceof Error ? cause.message : 'Could not save progress.')
        })
      }, 700)
    },
    [id],
  )

  const fileUrl = id ? bookFileUrl(id) : null
  const epub = useEpub({
    fileUrl: book && fileUrl ? fileUrl : null,
    container: stage,
    flow,
    fontSize,
    theme: resolved,
    initialCfi: openHref ? null : startCfi.current,
    initialHref: openHref,
    highlightQuery,
    onRelocate,
    onSelect: (info) => {
      setSelection(info)
      setDraftNote('')
      setNoteMode(false)
    },
  })

  const paintHighlight = epub.highlight
  const clearHighlight = epub.unhighlight
  const readerReady = epub.status === 'ready'

  useEffect(() => {
    if (!readerReady) return
    for (const item of annotations) {
      paintHighlight(item.cfiRange)
    }
    return () => {
      for (const item of annotations) {
        clearHighlight(item.cfiRange)
      }
    }
  }, [annotations, readerReady, paintHighlight, clearHighlight])

  const goNext = epub.next
  const goPrev = epub.prev

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setTocOpen(false)
        setNotesOpen(false)
        setSelection(null)
        epub.clearSelection()
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault()
        void goNext()
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        void goPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  useEffect(
    () => () => {
      if (progressTimer.current) window.clearTimeout(progressTimer.current)
    },
    [],
  )

  async function saveMark(note: string | null) {
    if (!id || !selection) return
    setActionError(null)
    try {
      const created = await createAnnotation(id, {
        cfiRange: selection.cfiRange,
        text: selection.text,
        note,
      })
      setAnnotations((current) => [created, ...current])
      epub.highlight(selection.cfiRange)
      epub.clearSelection()
      setSelection(null)
      setNoteMode(false)
      setDraftNote('')
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not save the highlight.')
    }
  }

  async function removeMark(item: Annotation) {
    if (!id) return
    setActionError(null)
    try {
      await deleteAnnotation(id, item.id)
      epub.unhighlight(item.cfiRange)
      setAnnotations((current) => current.filter((entry) => entry.id !== item.id))
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not remove the highlight.')
    }
  }

  if (!id || loadError) {
    return (
      <div className="reader reader-message">
        <p>{loadError ?? 'Missing book id.'}</p>
        <Link to="/">Back to library</Link>
      </div>
    )
  }

  const overlayOpen = tocOpen || notesOpen

  return (
    <div className="reader" data-flow={flow}>
      <header className="reader-bar">
        <Link className="text-btn" to="/">
          Library
        </Link>
        <div className="reader-title">
          <h1>{book?.title ?? 'Opening…'}</h1>
          {book?.author ? <p>{book.author}</p> : null}
        </div>
        <div className="reader-actions">
          <button type="button" className="text-btn" aria-pressed={tocOpen} onClick={() => setTocOpen((open) => !open)}>
            Contents
          </button>
          <button
            type="button"
            className="text-btn"
            aria-pressed={notesOpen}
            onClick={() => setNotesOpen((open) => !open)}
          >
            Notes
          </button>
          <div className="seg" role="group" aria-label="Layout">
            <button type="button" aria-pressed={flow === 'paginated'} onClick={() => setFlow('paginated')}>
              Pages
            </button>
            <button type="button" aria-pressed={flow === 'scrolled'} onClick={() => setFlow('scrolled')}>
              Scroll
            </button>
          </div>
          <div className="seg" role="group" aria-label="Text size">
            <button
              type="button"
              disabled={fontSize <= MIN_FONT}
              onClick={() => setFontSize((size) => Math.max(MIN_FONT, size - 10))}
            >
              A−
            </button>
            <button
              type="button"
              disabled={fontSize >= MAX_FONT}
              onClick={() => setFontSize((size) => Math.min(MAX_FONT, size + 10))}
            >
              A+
            </button>
          </div>
          <div className="seg" role="group" aria-label="Appearance">
            <button type="button" aria-pressed={resolved === 'light'} onClick={() => setMode('light')}>
              Light
            </button>
            <button type="button" aria-pressed={resolved === 'dark'} onClick={() => setMode('dark')}>
              Dark
            </button>
          </div>
        </div>
      </header>

      <div className="reader-body">
        {overlayOpen ? (
          <button
            type="button"
            className="toc-scrim"
            aria-label="Close panel"
            onClick={() => {
              setTocOpen(false)
              setNotesOpen(false)
            }}
          />
        ) : null}
        <TocPanel
          open={tocOpen}
          items={epub.toc}
          onClose={() => setTocOpen(false)}
          onSelect={(href) => {
            void epub.goTo(href)
            setTocOpen(false)
          }}
        />
        <NotesPanel
          open={notesOpen}
          items={annotations}
          onClose={() => setNotesOpen(false)}
          onOpen={(item) => {
            void epub.goTo(item.cfiRange)
            setNotesOpen(false)
          }}
          onRemove={(item) => void removeMark(item)}
        />
        <div className="reader-stage">
          {epub.status === 'loading' || !book ? <p className="reader-status">Opening book…</p> : null}
          {epub.status === 'error' ? <p className="reader-status">{epub.error}</p> : null}
          <div className="reader-frame" ref={setStage} />
          {selection ? (
            <div className="annotate-bar">
              <p className="annotate-quote">{selection.text}</p>
              {noteMode ? (
                <>
                  <textarea
                    className="annotate-input"
                    rows={3}
                    value={draftNote}
                    placeholder="Your note"
                    onChange={(event) => setDraftNote(event.target.value)}
                  />
                  <div className="annotate-actions">
                    <button type="button" className="btn" onClick={() => void saveMark(draftNote.trim() || null)}>
                      Save note
                    </button>
                    <button type="button" className="text-btn" onClick={() => setNoteMode(false)}>
                      Back
                    </button>
                  </div>
                </>
              ) : (
                <div className="annotate-actions">
                  <button type="button" className="btn" onClick={() => void saveMark(null)}>
                    Highlight
                  </button>
                  <button type="button" className="text-btn" onClick={() => setNoteMode(true)}>
                    Add note
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      epub.clearSelection()
                      setSelection(null)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {actionError ? <p className="reader-action-error">{actionError}</p> : null}

      <footer className="reader-footer">
        <div className="read-bar reader-track" aria-hidden="true">
          <span style={{ width: `${epub.percent}%` }} />
        </div>
        <div className="reader-footer-row">
          <button type="button" className="text-btn" disabled={epub.atStart} onClick={goPrev}>
            Previous
          </button>
          <span className="reader-progress">
            {epub.pageTotal > 0 ? `Page ${epub.pageCurrent} of ${epub.pageTotal}` : 'Counting pages…'}
          </span>
          <button type="button" className="text-btn" disabled={epub.atEnd} onClick={goNext}>
            Next
          </button>
        </div>
      </footer>
    </div>
  )
}
