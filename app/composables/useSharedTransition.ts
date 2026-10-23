import { scrambleOut } from '~/utils/decipher'

// Card <-> detail page transitions (guide cards <-> articles, resource
// cards <-> resources). Opening: a view transition morphs the card's own
// title (and image, subtitle, authors, type) into their places on the
// detail page, which share these `view-transition-name`s; once landed,
// the detail page's dividers and close cross draw themselves in, then
// its body text deciphers. Closing: the same in reverse, back into the
// card. Styles for the morph and the line draw-in live in main.css.

export type SharedPart = 'title' | 'image' | 'subtitle' | 'authors' | 'type'

// main.css treats titles and the small text labels the same way (only
// the arriving snapshot, scaled uniformly) and images their own way
// (cropped, never stretched).
const PART_CLASS: Record<SharedPart, string> = {
  title: 'article-title',
  image: 'article-image',
  subtitle: 'article-subtitle',
  authors: 'article-subtitle',
  type: 'article-subtitle',
}

export function sharedStyle(id: string, part: SharedPart) {
  return {
    viewTransitionName: `shared-${part}-${id.replace(/[^a-z0-9-]/gi, '-')}`,
    'view-transition-class': PART_CLASS[part],
  }
}

// True from a card click until its opening transition has finished.
const useOpening = () => useState('shared-opening', () => false)
// The id of the detail page closing back into its card, meanwhile.
const useClosingId = () => useState<string | null>('shared-closing-id', () => null)

export function canViewTransition() {
  return typeof document !== 'undefined' && 'startViewTransition' in document
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Returns a starter that runs `navigate` inside a view transition, waiting
// for the new page to be fully rendered (its data fetched) before the
// browser snapshots it. Call at setup; use the returned function later.
function usePageViewTransition() {
  const nuxtApp = useNuxtApp()
  return (navigate: () => Promise<unknown>) => document.startViewTransition(async () => {
    const rendered = new Promise<void>((resolve) => {
      const off = nuxtApp.hook('page:finish', () => { off(); resolve() })
      setTimeout(resolve, 3000)
    })
    await navigate()
    await rendered
    await nextTick()
  })
}

// Card side. `style(part)` goes on each shared element; the names are
// only applied once this card is the one opening (clicked) or closing
// back (its detail page's id), keeping other cards out of the morph.
export function useCardTransition(id: () => string, to: () => string) {
  const opening = useOpening()
  const closingId = useClosingId()
  const start = usePageViewTransition()
  const clicked = ref(false)
  const named = computed(() => clicked.value || closingId.value === id())

  function style(part: SharedPart) {
    return named.value ? sharedStyle(id(), part) : undefined
  }

  function open(event: MouseEvent) {
    if (!canViewTransition() || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    clicked.value = true
    opening.value = true
    nextTick(() => {
      start(() => navigateTo(to())).finished.finally(() => { opening.value = false })
    })
  }

  return { style, open }
}

// Detail side. Opened from a card, the header is held static (no
// decipher — the same text is arriving), `drawState` stays 'pending'
// until the morph lands, then 'draw' (dividers and close cross trace in;
// immediately on any other arrival); `bodyDecipher` (v-decipher) releases
// the body LINES_MS later, every word growing from one or two letters.
// `close` (the close cross) runs it all backwards: body text scrambles
// away, lines and cross retract ('undraw'), then the header shrinks back
// into its card on `closeTo` (the `vt-closing` root class flips the
// morph in main.css so the detail page's own big snapshot is the one
// shown). `bodySelector` picks the body text to scramble out of `root`.
export function useDetailTransition(id: () => string, closeTo: string, bodySelector: string) {
  const opening = useOpening()
  const closingId = useClosingId()
  const start = usePageViewTransition()

  const openedFromCard = opening.value
  const headerLanded = ref(!openedFromCard)
  watch(opening, (value) => { if (!value) headerLanded.value = true })

  const closing = ref(false)
  const drawState = computed(() => (closing.value ? 'undraw' : headerLanded.value ? 'draw' : 'pending'))

  const LINES_MS = 900
  const textReady = ref(false)
  watch(headerLanded, (landed) => {
    if (landed) setTimeout(() => { textReady.value = true }, LINES_MS)
  }, { immediate: true })
  const bodyDecipher = computed(() => ({ ready: textReady.value, grow: true }))

  const root = ref<HTMLElement | null>(null)
  const TEXT_OUT_MS = 600
  const LINES_OUT_AT = 450
  const MORPH_AT = 1000
  function close(event: MouseEvent) {
    if (!canViewTransition() || event.metaKey || event.ctrlKey || closing.value) return
    event.preventDefault()
    for (const el of root.value?.querySelectorAll<HTMLElement>(bodySelector) ?? []) scrambleOut(el, TEXT_OUT_MS)
    setTimeout(() => { closing.value = true }, LINES_OUT_AT)
    setTimeout(() => {
      closingId.value = id()
      document.documentElement.classList.add('vt-closing')
      start(() => navigateTo(closeTo)).finished.finally(() => {
        document.documentElement.classList.remove('vt-closing')
        closingId.value = null
      })
    }, MORPH_AT)
  }

  return {
    openedFromCard,
    drawState,
    bodyDecipher,
    root,
    close,
    style: (part: SharedPart) => sharedStyle(id(), part),
  }
}

// Tool page -> /tools (TemplateToolPageLayout.vue's exit cross): the same
// close as a detail page's — its text scrambles away, then the tool's
// content column shrinks back into its own card (ToolCard.vue), the two
// sharing one cropped, never-stretched morph. The slug of the tool
// closing, meanwhile.
export const useToolClosing = () => useState<string | null>('tool-closing', () => null)

export function toolCardStyle(slug: string) {
  return sharedStyle(`tool-${slug}`, 'image')
}

export function useToolCloseTransition(slug: () => string, textRoot: () => HTMLElement | null | undefined) {
  const toolClosing = useToolClosing()
  const start = usePageViewTransition()
  const closing = ref(false)
  const TEXT_OUT_MS = 600
  const MORPH_AT = 650

  function close(event: MouseEvent) {
    if (!canViewTransition() || event.metaKey || event.ctrlKey || closing.value) return
    event.preventDefault()
    closing.value = true
    // Every text on screen, not just a body: a tool page is all panels.
    const root = textRoot()
    const leaves = [...root?.querySelectorAll<HTMLElement>('*') ?? []].filter((el) =>
      [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.nodeValue?.trim())
      && el.getBoundingClientRect().top < window.innerHeight)
    for (const el of leaves.slice(0, 200)) scrambleOut(el, TEXT_OUT_MS)
    setTimeout(() => {
      toolClosing.value = slug()
      nextTick(() => {
        start(() => navigateTo('/tools')).finished.finally(() => { toolClosing.value = null })
      })
    }, MORPH_AT)
  }

  return {
    close,
    // The content column's share of the morph, once it's closing.
    style: computed(() => (toolClosing.value === slug() ? toolCardStyle(slug()) : undefined)),
  }
}
