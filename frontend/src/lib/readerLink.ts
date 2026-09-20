export function readerLink(bookId: string, href?: string | null, query?: string | null) {
  const params = new URLSearchParams()
  if (href) params.set('href', href)
  if (query?.trim()) params.set('q', query.trim())
  const qs = params.toString()
  return qs ? `/read/${bookId}?${qs}` : `/read/${bookId}`
}
