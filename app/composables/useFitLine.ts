// A title kept on one line: as big as `max` allows, unless it wouldn't fit `room`.
// Sets --fit-line-size on `el`, for its CSS to use. Measured from the text itself, so
// it holds for any title and language, and whatever the letters are doing meanwhile
// (DecipherText). Several texts share the size of the longest.
export function useFitLine(
  el: Ref<HTMLElement | null>,
  texts: () => string[],
  room: (el: HTMLElement) => number,
  max: () => number,
) {
  let observer: ResizeObserver | undefined
  function fit() {
    const target = el.value
    const context = document.createElement('canvas').getContext('2d')
    if (!target || !context) return
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-serif')
    context.font = `500 100px ${family}`
    const widest = Math.max(0, ...texts().map((text) => context.measureText(text).width / 100))
    const size = widest ? Math.min(max(), room(target) / widest) : max()
    target.style.setProperty('--fit-line-size', `${Math.floor(size * 2) / 2}px`)
  }
  onMounted(() => {
    fit()
    document.fonts?.ready.then(fit)
    if (el.value) {
      observer = new ResizeObserver(fit)
      observer.observe(el.value)
    }
  })
  watch(texts, () => nextTick(fit))
  onBeforeUnmount(() => observer?.disconnect())
}
