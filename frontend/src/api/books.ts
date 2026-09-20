import type { AskResponse } from '../types/ask'
import type { Annotation, AnnotationList } from '../types/annotation'
import type { Book, BookList } from '../types/book'
import type { SearchResult } from '../types/search'
import { apiGet, apiRequest } from './client'

export async function listBooks(signal?: AbortSignal): Promise<BookList> {
  const data = await apiGet<BookList | Book[]>('/books', signal)
  if (Array.isArray(data)) {
    return { books: data }
  }
  return { books: data?.books ?? [] }
}

export function uploadBook(file: File): Promise<Book> {
  const body = new FormData()
  body.append('file', file)
  return apiRequest<Book>('/books', { method: 'POST', body })
}

export function deleteBook(id: string): Promise<void> {
  return apiRequest<void>(`/books/${id}`, { method: 'DELETE' })
}

export function getBook(id: string, signal?: AbortSignal): Promise<Book> {
  return apiGet<Book>(`/books/${id}`, signal)
}

export function bookFileUrl(id: string): string {
  return `/api/books/${id}/file`
}

export function saveProgress(id: string, cfi: string, percent: number): Promise<Book> {
  return apiRequest<Book>(`/books/${id}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cfi, percent }),
  })
}

export async function listAnnotations(bookId: string, signal?: AbortSignal): Promise<AnnotationList> {
  const data = await apiGet<AnnotationList | Annotation[]>(`/books/${bookId}/annotations`, signal)
  if (Array.isArray(data)) return { annotations: data }
  return { annotations: data?.annotations ?? [] }
}

export function createAnnotation(
  bookId: string,
  body: { cfiRange: string; text: string; note?: string | null },
): Promise<Annotation> {
  return apiRequest<Annotation>(`/books/${bookId}/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function updateAnnotation(bookId: string, annotationId: string, note: string): Promise<Annotation> {
  return apiRequest<Annotation>(`/books/${bookId}/annotations/${annotationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  })
}

export function deleteAnnotation(bookId: string, annotationId: string): Promise<void> {
  return apiRequest<void>(`/books/${bookId}/annotations/${annotationId}`, { method: 'DELETE' })
}

export function searchLibrary(query: string, signal?: AbortSignal): Promise<SearchResult> {
  const q = new URLSearchParams({ q: query })
  return apiGet<SearchResult>(`/search?${q.toString()}`, signal)
}

export function askLibrary(question: string): Promise<AskResponse> {
  return apiRequest<AskResponse>('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
}
