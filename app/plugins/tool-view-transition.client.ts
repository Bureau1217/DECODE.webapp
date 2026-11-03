// Opening or leaving a tool page, by whatever route (a card, the exit cross,
// the nav, the back button), cross-fades the whole site from one state to the
// other (`vt-tool-fade`, main.css): chrome colors, panels and content all move
// together on one curve, which per-element transitions can't guarantee.
// Between the tools list and a tool, the tool's card and the right panel also
// share one box (`vt-tool-morph`, useToolMorph) that expands from the card to
// the panel, or collapses back. The new page is waited for (its data fetched)
// before the transition starts.
const MAX_WAIT_MS = 3000

function toolSlug(path: string) {
  return path.match(/^\/tools\/([^/]+)/)?.[1] ?? null
}

function isToolsList(path: string) {
  return path.replace(/\/$/, '') === '/tools'
}

// Which edge the box grows from: the top card keeps its top edge, the bottom
// one its bottom edge, a middle one grows both ways. Read off the cards on
// screen, so it has to run while they're mounted: before leaving the list,
// or once it has arrived.
function setToolAnchor(root: HTMLElement, slug: string) {
  const cards = [...document.querySelectorAll('.tool-card')]
  const index = cards.findIndex((card) => card.getAttribute('href')?.endsWith(`/${slug}`))
  root.dataset.toolAnchor = index <= 0 ? 'top' : index === cards.length - 1 ? 'bottom' : 'middle'
  // The box's backing color (main.css): the card's own hover fill.
  const card = cards[index]
  if (card) root.style.setProperty('--tool-morph-fill', getComputedStyle(card).getPropertyValue('--card-accent'))
}

export default defineNuxtPlugin((nuxtApp) => {
  const root = document.documentElement
  const morph = useToolMorph()
  let finish: (() => void) | undefined

  useRouter().beforeResolve((to, from) => {
    if (to.path === from.path || finish || !canViewTransition()) return
    const toTool = toolSlug(to.path)
    const fromTool = toolSlug(from.path)
    // Same tool: a campaign selected on the map, nothing to transition.
    if ((!toTool && !fromTool) || toTool === fromTool) return

    const opening = isToolsList(from.path) && toTool
    const closing = isToolsList(to.path) && fromTool
    morph.value = opening || closing || null
    root.classList.add('vt-tool-fade')
    if (morph.value) root.classList.add('vt-tool-morph')
    if (closing) root.classList.add('vt-tool-closing')
    if (opening) setToolAnchor(root, opening)

    return new Promise<void>((proceed) => {
      document.startViewTransition(() => new Promise<void>((done) => {
        const timer = setTimeout(() => finish?.(), MAX_WAIT_MS)
        finish = () => {
          finish = undefined
          clearTimeout(timer)
          if (closing) setToolAnchor(root, closing)
          done()
        }
        proceed()
      })).finished.finally(() => {
        root.classList.remove('vt-tool-fade', 'vt-tool-morph', 'vt-tool-closing')
        delete root.dataset.toolAnchor
        root.style.removeProperty('--tool-morph-fill')
        morph.value = null
      })
    })
  })

  nuxtApp.hook('page:finish', () => finish?.())
})
