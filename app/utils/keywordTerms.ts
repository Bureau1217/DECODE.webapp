// Finds the site's keywords in a text's HTML and wraps each mention in a link
// (.keyword-term, main.css). The HTML keeps its tags; only the text between them is
// searched, and never inside a link that's already there.

export interface TermMatcher {
  id: string
  pattern: RegExp
  length: number
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Not part of a longer word: a letter or digit on either side rules it out, an
// apostrophe doesn't (French's "l'astroturfing").
const matcher = (id: string, text: string): TermMatcher => {
  // "AI" isn't "ai": a short or all-caps name only counts as written.
  const exact = text.length <= 3 || text === text.toUpperCase()
  // Singular or plural, whichever the keyword's name is: "Deepfake" finds
  // "deepfakes", "Platforms" finds "platform".
  const stem = !exact && /\p{L}$/u.test(text) ? text.replace(/s$/i, '') : text
  const plural = stem === text && exact ? '' : 's?'
  return {
    id,
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(stem)}${plural}(?![\\p{L}\\p{N}])`, exact ? 'u' : 'iu'),
    length: text.length,
  }
}

// One or more per keyword, the longest first so "Echo chamber" wins over anything
// inside it. "X (Twitter)" also counts as "Twitter", never as a lone "X".
export function termMatchers(tags: { id: string, title: string }[]): TermMatcher[] {
  return tags
    .flatMap(({ id, title }) => {
      const inBrackets = title.match(/\(([^)]+)\)/)?.[1]
      return [title, inBrackets].filter((text): text is string => !!text && text.length > 1).map((text) => matcher(id, text.trim()))
    })
    .sort((a, b) => b.length - a.length)
}

// `seen`: the keywords already marked, shared across a page's texts, so each is
// marked once. A text full of underlines would be hard to read.
export function markTerms(html: string, matchers: TermMatcher[], seen: Set<string>, href: (id: string) => string): string {
  if (!html) return html
  // Text and tags, in turn. Marked pieces become tags, so nothing searches them again.
  const parts = html.split(/(<[^>]*>)/)
  for (const { id, pattern } of matchers) {
    if (seen.has(id)) continue
    let inLink = 0
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index]!
      if (part.startsWith('<')) {
        if (/^<a[\s>]/i.test(part)) inLink++
        else if (/^<\/a>/i.test(part)) inLink = Math.max(0, inLink - 1)
        continue
      }
      if (inLink) continue
      const found = pattern.exec(part)
      if (!found) continue
      parts.splice(
        index,
        1,
        part.slice(0, found.index),
        `<a href="${href(id)}" class="keyword-term" data-keyword="${id}">`,
        found[0],
        '</a>',
        part.slice(found.index + found[0].length),
      )
      seen.add(id)
      break
    }
  }
  return parts.join('')
}
