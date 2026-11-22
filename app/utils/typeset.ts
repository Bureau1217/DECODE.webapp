// Typesetting of the text coming from the CMS (ported from jat.website's
// utils/noWidows.ts and utils/frenchSpacing.ts): no widow or orphan
// (« veuves et orphelines »), and in French the narrow no-break space
// (« espace fine ») before ; : ! ? » % and after «. Body text only, never
// titles. Done with no-break characters in the text between tags, never in
// attributes or URLs; works on plain text too (no tag).
//
// decipherHtml() and the v-decipher directive keep whitespace as it is, in
// inline spans, so the no-break spaces still hold once the text is split
// into words; keywordTerms.ts matches a keyword's spaces as any whitespace.

const NBSP = ' '
const NNBSP = ' ' // narrow no-break space (French typography)

/** Closing tags that end a line of text: the last words before them are kept together. */
const BLOCK_END = /^<\/(?:p|li|h[1-6]|blockquote|figcaption|dd|dt|td|th)\s*>$|^<br\s*\/?>$/i

const BLOCK_START = /^<(?:p|li|h[1-6]|div|ul|ol|blockquote|figcaption|dd|dt|td|th)\b/i

/**
 * Longest group of words held together at the end of a block (the last word,
 * the no-break space and everything glued before it): beyond that it could be
 * wider than a phone's line in large type, and the page would scroll sideways.
 */
const MAX_HELD = 20

/**
 * French punctuation spacing: the space before ; : ! ? » % and after «
 * becomes a narrow no-break space, so the sign never wraps alone onto the
 * next line. Only text between tags is touched (`https://…` has no space
 * before its colon anyway).
 */
export function frenchSpacing(html: string): string {
  return html
    .split(/(<[^>]*>)/)
    .map((part) => (part.startsWith('<')
      ? part
      : part
          .replace(/(?:[   ]|&nbsp;)+([;:!?»%])/g, `${NNBSP}$1`)
          .replace(/«(?:[   ]|&nbsp;)+/g, `«${NNBSP}`)))
    .join('')
}

/**
 * No widow or orphan:
 * - a short word (1 or 2 letters: à, de, la, un, et, of, to…) never ends a
 *   line, it is held with the word after it;
 * - the last word of a paragraph or list item never sits alone on its line,
 *   it is held with the word before it.
 */
export function noWidows(html: string): string {
  const parts = html.split(/(<[^>]*>)/)

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index]!
    if (part.startsWith('<')) continue
    parts[index] = part.replace(/(?<=^|[\s(«“"'’])([\p{L}\p{N}]{1,2}['’]?)[ \t\r\n]+(?=[^ \t\r\n])/gu, `$1${NBSP}`)
  }

  // Walks back from the end of a block to its last breakable space (a
  // regular one: no-break spaces already hold), across inline tags
  // (<em>, <strong>, <a>…), and makes it a no-break space.
  const isBlockTag = (part: string): boolean => BLOCK_END.test(part) || BLOCK_START.test(part)

  // Length of the unbreakable run of text ending at parts[index][0, before),
  // across inline tags: what would be glued in front of the no-break space.
  const runBefore = (index: number, before: number): number => {
    let length = 0
    for (let i = index; i >= 0; i--) {
      const part = parts[i]!
      if (part.startsWith('<')) {
        if (isBlockTag(part)) return length
        continue
      }
      const text = i === index ? part.slice(0, before) : part
      const word = /[^ \t\r\n]*$/.exec(text)![0]
      length += word.length
      if (word.length < text.length || length > MAX_HELD) return length
    }
    return length
  }

  const holdLastWord = (end: number): void => {
    let tail = 0
    for (let index = end - 1; index >= 0; index--) {
      const part = parts[index]!
      if (part.startsWith('<')) {
        if (isBlockTag(part)) return
        continue
      }
      // Spaces right before the end of the block are not a line break.
      const head = tail === 0 ? part.replace(/[ \t\r\n]+$/, '') : part
      const space = /[ \t\r\n]+(?=[^ \t\r\n]*$)/.exec(head)
      if (!space) {
        tail += head.length
        if (tail > MAX_HELD) return
        continue
      }
      const lastWord = head.slice(space.index + space[0].length)
      if (runBefore(index, space.index) + 1 + lastWord.length + tail > MAX_HELD) return
      parts[index] = head.slice(0, space.index) + NBSP + lastWord + part.slice(head.length)
      return
    }
  }

  for (let index = 0; index < parts.length; index++) {
    if (BLOCK_END.test(parts[index]!)) holdLastWord(index)
  }
  holdLastWord(parts.length)

  return parts.join('')
}

/** Both, French spacing only in French. */
export function typeset(html: string | null | undefined, language: string): string {
  if (!html) return ''
  return noWidows(language === 'fr' ? frenchSpacing(html) : html)
}
