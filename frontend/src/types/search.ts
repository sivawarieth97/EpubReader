import type { Book } from './book'

export type SearchPassage = {
  bookId: string
  title: string
  author: string | null
  href: string | null
  snippet: string
}

export type SearchResult = {
  query: string
  books: Book[]
  passages: SearchPassage[]
}
