import { useCallback, useEffect, useRef, useState } from 'react'
import ePub, { type Book as EpubBook, type Contents, type Location, type NavItem, type Rendition } from 'epubjs'
import { paintEpubContents, paintEpubRendition } from '../lib/epubTheme'
import { clearSearchHits, markSearchHits } from '../lib/searchMark'
import type { ResolvedTheme } from '../lib/readerPrefs'

export type ReaderFlow = 'paginated' | 'scrolled'

export type RelocateInfo = {
  cfi: string
  percent: number
}

export type SelectionInfo = {
  cfiRange: string
  text: string
}

type Args = {
  fileUrl: string | null
  container: HTMLDivElement | null
  flow: ReaderFlow
  fontSize: number
  theme: ResolvedTheme
  initialCfi?: string | null
  initialHref?: string | null
  highlightQuery?: string | null
  onRelocate?: (info: RelocateInfo) => void
  onSelect?: (info: SelectionInfo) => void
}

type Status = 'idle' | 'loading' | 'ready' | 'error'

function percentOf(location: Location): number {
  const raw = location.start?.percentage
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.min(100, Math.max(0, Math.round(raw * 100)))
  }
  return 0
}

function pagingFrom(location: Location, book: EpubBook | null): { current: number; total: number } {
  const chapterPage = location.start?.displayed?.page ?? 0
  const chapterTotal = location.start?.displayed?.total ?? 0
  const cfi = location.start?.cfi
  const locations = book?.locations
  const count = locations?.length() ?? 0
  if (locations && count > 1 && cfi) {
    const loc = locations.locationFromCfi(cfi) as unknown as number
    if (typeof loc === 'number' && loc >= 0) {
      return { current: loc + 1, total: Math.max(count - 1, 1) }
    }
  }
  return { current: chapterPage, total: chapterTotal }
}

export function useEpub({
  fileUrl,
  container,
  flow,
  fontSize,
  theme,
  initialCfi,
  initialHref,
  highlightQuery,
  onRelocate,
  onSelect,
}: Args) {
  const renditionRef = useRef<Rendition | null>(null)
  const fontSizeRef = useRef(fontSize)
  const themeRef = useRef(theme)
  const relocateRef = useRef(onRelocate)
  const selectRef = useRef(onSelect)
  const startCfiRef = useRef(initialCfi)
  const startHrefRef = useRef(initialHref)
  const highlightQueryRef = useRef(highlightQuery)
  fontSizeRef.current = fontSize
  themeRef.current = theme
  relocateRef.current = onRelocate
  selectRef.current = onSelect
  startCfiRef.current = initialCfi
  startHrefRef.current = initialHref
  highlightQueryRef.current = highlightQuery

  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [toc, setToc] = useState<NavItem[]>([])
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)
  const [percent, setPercent] = useState(0)
  const [pageCurrent, setPageCurrent] = useState(0)
  const [pageTotal, setPageTotal] = useState(0)
  const bookRef = useRef<EpubBook | null>(null)

  useEffect(() => {
    if (!fileUrl || !container) return
    const url = fileUrl
    const host = container

    let cancelled = false
    const book = ePub()
    bookRef.current = book
    setStatus('loading')
    setError(null)
    setToc([])
    setPageCurrent(0)
    setPageTotal(0)

    async function open() {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? 'The EPUB is missing on disk. Remove this book from the library and upload it again.'
            : 'Could not load the EPUB.',
        )
      }
      const data = await response.arrayBuffer()
      if (cancelled) return

      await book.open(data)
      if (cancelled) return

      const rendition = book.renderTo(host, {
        width: '100%',
        height: '100%',
        flow: flow === 'scrolled' ? 'scrolled-doc' : 'paginated',
        manager: flow === 'scrolled' ? 'continuous' : 'default',
        spread: 'auto',
        allowScriptedContent: false,
      })
      renditionRef.current = rendition
      rendition.themes.fontSize(`${fontSizeRef.current}%`)
      rendition.hooks.content.register((contents: Contents) => {
        paintEpubContents(contents, themeRef.current)
        const term = highlightQueryRef.current
        if (term && contents.document) {
          markSearchHits(contents.document, term)
        }
      })

      rendition.on('relocated', (location: Location) => {
        setAtStart(location.atStart)
        setAtEnd(location.atEnd)
        const cfi = location.start?.cfi
        const nextPercent = percentOf(location)
        const paging = pagingFrom(location, bookRef.current)
        setPercent(nextPercent)
        setPageCurrent(paging.current)
        setPageTotal(paging.total)
        if (cfi) relocateRef.current?.({ cfi, percent: nextPercent })
      })

      rendition.on('selected', (cfiRange: string, contents: Contents) => {
        const text = contents.window.getSelection()?.toString().trim() ?? ''
        if (!text) return
        // Keep the native selection on phones. Clearing it here drops iOS/Android
        // handles and a layout shift from the annotate bar cancels the gesture.
        selectRef.current?.({ cfiRange, text })
      })

      const start = startHrefRef.current || startCfiRef.current
      try {
        await rendition.display(start || undefined)
      } catch {
        await rendition.display()
      }
      paintEpubRendition(rendition, themeRef.current)
      const navigation = await book.loaded.navigation
      if (cancelled) return
      setToc(navigation.toc ?? [])
      setStatus('ready')
      void book.locations
        .generate(1600)
        .then(() => {
          if (!cancelled) void rendition.reportLocation()
        })
        .catch(() => {
          /* percent stays at spine estimate */
        })
    }

    open().catch((cause: unknown) => {
      if (cancelled) return
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Could not open this EPUB.')
    })

    return () => {
      cancelled = true
      renditionRef.current = null
      bookRef.current = null
      book.destroy()
    }
  }, [fileUrl, container, flow])

  useEffect(() => {
    renditionRef.current?.themes.fontSize(`${fontSize}%`)
  }, [fontSize])

  useEffect(() => {
    paintEpubRendition(renditionRef.current, theme)
  }, [theme])

  useEffect(() => {
    if (status !== 'ready') return
    const term = highlightQuery?.trim()
    if (!term) return
    const rendition = renditionRef.current
    if (!rendition) return
    const raw = rendition.getContents() as Contents | Contents[] | undefined
    const list = !raw ? [] : Array.isArray(raw) ? raw : [raw]
    for (const contents of list) {
      if (contents.document) markSearchHits(contents.document, term)
    }
    const timer = window.setTimeout(() => {
      for (const contents of list) {
        if (contents.document) clearSearchHits(contents.document)
      }
    }, 30_000)
    return () => window.clearTimeout(timer)
  }, [status, highlightQuery, initialHref])

  const next = useCallback(() => renditionRef.current?.next(), [])
  const prev = useCallback(() => renditionRef.current?.prev(), [])
  const goTo = useCallback((href: string) => renditionRef.current?.display(href), [])
  const highlight = useCallback((cfiRange: string) => {
    renditionRef.current?.annotations.highlight(
      cfiRange,
      {},
      undefined,
      'hl-mark',
      { fill: 'rgba(194, 48, 28, 0.32)', 'fill-opacity': '1' },
    )
  }, [])
  const unhighlight = useCallback((cfiRange: string) => {
    renditionRef.current?.annotations.remove(cfiRange, 'highlight')
  }, [])

  const clearSelection = useCallback(() => {
    const raw = renditionRef.current?.getContents() as Contents | Contents[] | undefined
    const list = !raw ? [] : Array.isArray(raw) ? raw : [raw]
    for (const contents of list) {
      contents.window?.getSelection()?.removeAllRanges()
    }
  }, [])

  return {
    status,
    error,
    toc,
    atStart,
    atEnd,
    percent,
    pageCurrent,
    pageTotal,
    next,
    prev,
    goTo,
    highlight,
    unhighlight,
    clearSelection,
  }
}
