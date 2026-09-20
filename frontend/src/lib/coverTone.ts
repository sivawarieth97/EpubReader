const CLOTH = ['#6b1d2a', '#1e3f36', '#243552', '#7a3414', '#3f2a16', '#4a2744']

/** Book-cloth color for placeholder covers. Stable per id. */
export function coverTone(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return CLOTH[hash % CLOTH.length]
}
