import type { NavItem } from 'epubjs'

export type TocEntry = {
  id: string
  href: string
  label: string
  depth: number
}

export function flattenToc(items: NavItem[] | undefined, depth = 0): TocEntry[] {
  if (!items?.length) return []
  const rows: TocEntry[] = []
  for (const item of items) {
    rows.push({
      id: item.id || `${depth}-${item.href}-${item.label}`,
      href: item.href,
      label: item.label.trim(),
      depth,
    })
    rows.push(...flattenToc(item.subitems, depth + 1))
  }
  return rows
}
