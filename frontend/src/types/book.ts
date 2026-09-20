export type Book = {
  id: string
  title: string
  author: string | null
  coverUrl: string
  uploadedAt: string
  progressCfi: string | null
  progressPercent: number
}

export type BookList = {
  books: Book[]
}
