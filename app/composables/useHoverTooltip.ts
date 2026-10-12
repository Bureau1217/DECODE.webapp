// Shared by BotTrollCriteriaPanel.vue and SourceDatabasePanel.vue: both
// show a hover/focus popup for a row in a scrolling panel. The popup can't
// be a plain CSS-positioned child of the row — overflow-y: auto on the
// panel forces overflow-x to clip too, so anything positioned outside the
// panel's own box (left: 100%) never shows. Positioned `fixed` from the
// hovered row's own getBoundingClientRect() instead (paired with
// HoverTooltip.vue, which teleports to <body> to escape the clipping
// entirely).
export function useHoverTooltip<T>() {
  const hovered = ref<T | null>(null)
  const tooltipPos = ref({ top: 0, left: 0 })
  const isMobile = useIsMobile()

  // Desktop: to the hovered row's right, same as before. Mobile: there's
  // no "right of the row" on a full-width panel (the box would render
  // off-screen) — below the row instead, clamped so it never starts past
  // the viewport's own right edge.
  function computePos(rect: DOMRect) {
    if (isMobile.value) {
      const width = 320
      return { top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) }
    }
    return { top: rect.top, left: rect.right - 2 }
  }

  function showTooltip(item: T, event: MouseEvent | FocusEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    tooltipPos.value = computePos(rect)
    hovered.value = item
  }

  function hideTooltip() {
    hovered.value = null
  }

  // Touch devices never fire mouseenter/focus at all — tap toggles the
  // same tooltip instead (BotTrollCriteriaPanel.vue/SourceDatabasePanel.
  // vue's own row @click). A no-op on desktop: hover already opened it via
  // showTooltip before any click lands, so toggling again on that same
  // click would just close what hover just opened.
  function tapTooltip(item: T, event: MouseEvent) {
    if (!isMobile.value) return
    if (hovered.value === item) {
      hideTooltip()
    } else {
      showTooltip(item, event)
    }
  }

  return { hovered, tooltipPos, showTooltip, hideTooltip, tapTooltip }
}
