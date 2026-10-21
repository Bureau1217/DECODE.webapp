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

  function openTooltip(item: T, event: Event) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    tooltipPos.value = computePos(rect)
    hovered.value = item
  }

  // Hover/focus only — ignored on mobile, where a tap also fires
  // emulated mouseenter/focus right before its click: letting those open
  // the tooltip made tapTooltip's toggle immediately close it again.
  function showTooltip(item: T, event: MouseEvent | FocusEvent) {
    if (isMobile.value) return
    openTooltip(item, event)
  }

  function hideTooltip() {
    if (isMobile.value) return
    hovered.value = null
  }

  // Touch devices never fire mouseenter/focus at all — tap toggles the
  // same tooltip instead (BotTrollCriteriaPanel.vue/SourceDatabasePanel.
  // vue's own row @click). A no-op on desktop: hover already opened it via
  // showTooltip before any click lands, so toggling again on that same
  // click would just close what hover just opened.
  function tapTooltip(item: T, event: MouseEvent) {
    if (!isMobile.value) return
    // toRaw on both — the ref hands back its own reactive proxy of the
    // item, never identical to the plain object the row passes in.
    if (hovered.value !== null && toRaw(hovered.value) === toRaw(item)) {
      hovered.value = null
    } else {
      openTooltip(item, event)
    }
  }

  return { hovered, tooltipPos, showTooltip, hideTooltip, tapTooltip, isMobile }
}
