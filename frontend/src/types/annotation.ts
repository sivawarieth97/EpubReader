export type Annotation = {
  id: string
  bookId: string
  cfiRange: string
  text: string
  note: string | null
  createdAt: string
}

export type AnnotationList = {
  annotations: Annotation[]
}
