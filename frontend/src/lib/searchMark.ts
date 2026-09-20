function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function termsFromQuery(raw: string): string[] {
  const cleaned = raw.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
  if (!cleaned) return []
  const words = cleaned.split(/\s+/).filter((word) => word.length > 3)
  const unique = [...new Set(words.map((word) => word.toLowerCase()))]
  return unique.length ? unique : [cleaned]
}

export function markSearchHits(doc: Document, rawTerm: string) {
  if (!doc.body) return
  for (const term of termsFromQuery(rawTerm)) {
    markOneTerm(doc, term)
  }
}

function markOneTerm(doc: Document, term: string) {
  if (!term) return
  const pattern = new RegExp(escapeRegExp(term), 'gi')
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let node = walker.nextNode()
  while (node) {
    const el = node.parentElement
    if (el?.closest('mark.epub-search-hit')) {
      node = walker.nextNode()
      continue
    }
    if (node.nodeValue && pattern.test(node.nodeValue)) {
      nodes.push(node as Text)
    }
    pattern.lastIndex = 0
    node = walker.nextNode()
  }
  for (const textNode of nodes) {
    const value = textNode.nodeValue ?? ''
    pattern.lastIndex = 0
    const frag = doc.createDocumentFragment()
    let last = 0
    let match = pattern.exec(value)
    while (match) {
      if (match.index > last) {
        frag.append(value.slice(last, match.index))
      }
      const mark = doc.createElement('mark')
      mark.className = 'epub-search-hit'
      mark.textContent = match[0]
      frag.append(mark)
      last = match.index + match[0].length
      match = pattern.exec(value)
    }
    if (last < value.length) {
      frag.append(value.slice(last))
    }
    textNode.parentNode?.replaceChild(frag, textNode)
  }
}

export function clearSearchHits(doc: Document) {
  const marks = [...doc.querySelectorAll('mark.epub-search-hit')]
  for (const mark of marks) {
    const parent = mark.parentNode
    if (!parent) continue
    parent.replaceChild(doc.createTextNode(mark.textContent ?? ''), mark)
    parent.normalize()
  }
}
