/**
 * Site search (SiteIndexBar's SEARCH field -> pages/search.vue).
 *
 * Kirby has no full-text search endpoint here, so the whole searchable
 * corpus comes down in one KQL call (~180KB, only once someone actually
 * searches, cached per language) and is indexed in the browser: every
 * distinct word of every page, with how often it occurs there.
 *
 * Results are grouped by word, not by page: the exact word typed first,
 * then words that start with it, then words that contain it, then close
 * spellings (one or two letters off). Each word lists the pages it
 * appears in, most occurrences first.
 */

// Tool children (campaigns, criteria, sources) have no page of their
// own: a hit in one opens its tool.
const TOOL_TEMPLATES = ['tool', 'campaigns-map-tool', 'bot-troll-tool', 'source-reliability-tool']
const TOOL_CHILD_TEMPLATES = ['campaign', 'criterion', 'source']
const SEARCH_TEMPLATES = ['default', 'ressource', 'tag', ...TOOL_TEMPLATES, ...TOOL_CHILD_TEMPLATES]

// Never text a visitor reads: ids, relations, file references.
const SKIPPED_FIELDS = new Set(['uuid', 'header_image', 'page_image_preview', 'image', 'file', 'cover_image', 'url', 'source'])

const KIND_LABELS = {
  en: { article: 'Guide', resource: 'Resource', tool: 'Tool' },
  fr: { article: 'Guide', resource: 'Ressource', tool: 'Outil' },
} as const

interface CorpusPage {
  id: string
  title: string
  template: string
  parentTitle?: string | null
  fields: Record<string, unknown>
}

interface WordCount {
  display: string
  count: number
}

export interface SearchDoc {
  key: string
  title: string
  to: string
  kind: string
  // The tool a campaign/criterion/source lives in.
  context?: string
  text: string
  words: Map<string, WordCount>
}

export interface SearchHit {
  doc: SearchDoc
  count: number
}

export interface SearchGroup {
  word: string
  // 0 exact, 1 starts with, 2 contains, 3 close spelling.
  score: number
  // Where the typed text sits inside `word` (for highlighting), if it does.
  match?: [number, number]
  hits: SearchHit[]
}

export function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/’/g, '\'')
}

const ENTITIES: Record<string, string> = { amp: '&', nbsp: ' ', quot: '"', apos: '\'', lt: '<', gt: '>', rsquo: '’', lsquo: '‘' }

function cleanText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|[a-z]+);/gi, (_, e: string) => (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? ' '))
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/(?:file|page):\/\/\S+/g, ' ')
    // Structure fields come through as YAML: drop the keys, keep values.
    .replace(/^\s*-?\s*[a-z_]+:\s?/gm, ' ')
}

// Blocks fields (an article's `content`) are JSON strings: walk them for
// text, skipping block ids/types.
function collectStrings(value: unknown, out: string[]) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if ((trimmed.startsWith('[') || trimmed.startsWith('{')) && trimmed.length > 1) {
      try {
        collectStrings(JSON.parse(trimmed), out)
        return
      } catch {
        // Not JSON after all — plain text that happens to start with a bracket.
      }
    }
    out.push(cleanText(value))
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, out))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'id' || k === 'type' || k === 'isHidden' || k === 'image' || k === 'location') continue
      collectStrings(v, out)
    }
  }
}

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*[\p{L}\p{N}]|[\p{L}\p{N}]/gu

function indexPage(page: CorpusPage, labels: (typeof KIND_LABELS)[keyof typeof KIND_LABELS]): SearchDoc {
  const parts: string[] = [page.title]
  for (const [k, v] of Object.entries(page.fields ?? {})) {
    if (!SKIPPED_FIELDS.has(k)) collectStrings(v, parts)
  }
  const raw = parts.join(' ')

  const words = new Map<string, WordCount>()
  for (const match of raw.matchAll(WORD_RE)) {
    const display = match[0]
    if (display.length < 2) continue
    const norm = normalizeSearch(display)
    const entry = words.get(norm)
    if (entry) entry.count++
    else words.set(norm, { display, count: 1 })
  }

  const segments = page.id.split('/')
  let to = `/guide/${page.id}`
  let kind: string = labels.article
  let context: string | undefined
  if (page.template === 'ressource') {
    to = `/resources/${page.id}`
    kind = labels.resource
  } else if (page.template === 'tag') {
    to = `/keywords/${page.id}`
    kind = page.parentTitle ?? ''
  } else if (TOOL_TEMPLATES.includes(page.template)) {
    to = `/tools/${segments[1]}`
    kind = labels.tool
  } else if (TOOL_CHILD_TEMPLATES.includes(page.template)) {
    to = `/tools/${segments[1]}`
    kind = labels.tool
    context = page.parentTitle ?? undefined
  }

  return { key: page.id, title: page.title, to, kind, context, text: normalizeSearch(raw.replace(/\s+/g, ' ')), words }
}

// Small edit distance, bailing out once past `max`.
function withinDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const value = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
      row.push(value)
      best = Math.min(best, value)
    }
    if (best > max) return false
    prev = row
  }
  return prev[b.length]! <= max
}

function scoreWord(word: string, term: string): number | null {
  if (word === term) return 0
  if (word.startsWith(term)) return 1
  if (term.length >= 3 && word.includes(term)) return 2
  if (term.length >= 4 && withinDistance(word, term, term.length >= 7 ? 2 : 1)) return 3
  return null
}

const MAX_GROUPS = 60
const MAX_HITS_PER_GROUP = 20

export function searchDocs(docs: SearchDoc[], query: string): SearchGroup[] {
  const phrase = normalizeSearch(query.trim()).replace(/\s+/g, ' ')
  if (phrase.length < 2) return []
  const terms = phrase.split(' ').filter((t) => t.length >= 2)

  const groups = new Map<string, SearchGroup & { total: number }>()
  function add(norm: string, display: string, score: number, doc: SearchDoc, count: number, term: string) {
    let group = groups.get(norm)
    if (!group) {
      const at = norm.indexOf(term)
      group = { word: display, score, match: at >= 0 ? [at, at + term.length] : undefined, hits: [], total: 0 }
      groups.set(norm, group)
    }
    group.hits.push({ doc, count })
    group.total += count
  }

  for (const doc of docs) {
    // Several words typed: the whole phrase, as written, comes first.
    if (terms.length > 1 && doc.text.includes(phrase)) {
      add(phrase, query.trim(), 0, doc, doc.text.split(phrase).length - 1, phrase)
    }
    for (const [norm, { display, count }] of doc.words) {
      let best: { score: number, term: string } | null = null
      for (const term of terms) {
        const score = scoreWord(norm, term)
        if (score !== null && (!best || score < best.score)) best = { score, term }
      }
      if (best) add(norm, display, best.score, doc, count, best.term)
    }
  }

  return [...groups.values()]
    .sort((a, b) => a.score - b.score || b.total - a.total || a.word.length - b.word.length)
    .slice(0, MAX_GROUPS)
    .map(({ total: _total, ...group }) => ({
      ...group,
      hits: group.hits.sort((a, b) => b.count - a.count).slice(0, MAX_HITS_PER_GROUP),
    }))
}

/** The indexed corpus, fetched once per language. */
export function useSearchCorpus() {
  const language = useLanguage()
  return useAsyncData('search:corpus', async () => {
    const pages = await useKqlCollection<CorpusPage>({
      query: `site.index.filterBy('intendedTemplate', 'in', ${JSON.stringify(SEARCH_TEMPLATES).replace(/"/g, '\'')})`,
      select: {
        id: true,
        title: true,
        template: 'page.intendedTemplate',
        parentTitle: 'page.parent?.title',
        fields: 'page.content.toArray',
      },
    })
    const labels = KIND_LABELS[language.value] ?? KIND_LABELS.en
    return pages.map((page) => indexPage(page, labels))
  }, { watch: [language], server: false })
}
