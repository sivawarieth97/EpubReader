import type { Contents, Rendition } from 'epubjs'
import type { ResolvedTheme } from './readerPrefs'

const PALETTE = {
  light: { bg: '#f3e8cf', fg: '#1a0e08', link: '#c2301c' },
  dark: { bg: '#1a120e', fg: '#f6e7c9', link: '#e0894a' },
} as const

export function epubThemeCss(theme: ResolvedTheme): string {
  const { bg, fg, link } = PALETTE[theme]
  return `
html {
  background-color: ${bg} !important;
}
html, body {
  background: ${bg} !important;
  color: ${fg} !important;
  -webkit-user-select: text !important;
  user-select: text !important;
  -webkit-touch-callout: default !important;
}
body, body * {
  -webkit-user-select: text !important;
  user-select: text !important;
  -webkit-touch-callout: default !important;
}
body, body p, body li, body div, body span, body section, body article,
body header, body footer, body aside, body main, body h1, body h2, body h3,
body h4, body h5, body h6, body td, body th, body blockquote, body figcaption {
  color: ${fg} !important;
  background-color: transparent !important;
  text-shadow: none !important;
  border-color: color-mix(in srgb, ${fg} 22%, transparent) !important;
}
body a, body a:visited {
  color: ${link} !important;
  background-color: transparent !important;
}
body img, body svg, body video, body canvas, body picture {
  background: transparent !important;
}
body mark.epub-search-hit {
  background-color: #f5d76e !important;
  color: #1a0e08 !important;
}
`.trim()
}

export function paintEpubContents(contents: Contents, theme: ResolvedTheme) {
  const doc = contents.document
  if (!doc?.head) return
  let style = doc.getElementById('app-reader-theme') as HTMLStyleElement | null
  if (!style) {
    style = doc.createElement('style')
    style.id = 'app-reader-theme'
    doc.head.appendChild(style)
  }
  style.textContent = epubThemeCss(theme)
  doc.documentElement.style.backgroundColor = PALETTE[theme].bg
  if (doc.body) {
    doc.body.style.backgroundColor = PALETTE[theme].bg
    doc.body.style.color = PALETTE[theme].fg
    doc.body.style.webkitUserSelect = 'text'
    doc.body.style.userSelect = 'text'
  }
}

export function paintEpubRendition(rendition: Rendition | null, theme: ResolvedTheme) {
  if (!rendition) return
  const raw = rendition.getContents() as Contents | Contents[] | undefined
  const list = !raw ? [] : Array.isArray(raw) ? raw : [raw]
  for (const contents of list) {
    paintEpubContents(contents, theme)
  }
}
