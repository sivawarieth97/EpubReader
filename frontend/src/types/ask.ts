export type AskSource = {
  bookId: string
  title: string
  author: string | null
  href: string | null
  snippet: string
}

export type AskResponse = {
  question: string
  answer: string
  sources: AskSource[]
}
