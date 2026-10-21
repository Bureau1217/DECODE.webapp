// The site's folder-tab silhouette (SiteNav.vue's tabs, MobileMenuOverlay.
// vue's folders): diagonal shoulders on both sides, a small rounded join
// into the flat top line, closed with a flat bottom edge. The diagonals'
// spans and the corner radius scale off the tab's own height (same ratios
// as the original 80px-tall drawing), so the shoulder angle stays the same
// at any size. Splash.vue draws its own unclosed variant (tab + baseline
// rule as one stroke).
export const TAB_LEFT_DX_RATIO = 22 / 80
export const TAB_RIGHT_DX_RATIO = 27 / 80
export const TAB_CORNER_R_RATIO = 8 / 80

export function buildTabPath(width: number, h: number) {
  if (!width || !h) return ''
  const leftDx = h * TAB_LEFT_DX_RATIO
  const rightDx = h * TAB_RIGHT_DX_RATIO
  const cornerR = h * TAB_CORNER_R_RATIO

  const leftLen = Math.hypot(leftDx, h)
  const leftUx = leftDx / leftLen
  const leftUy = h / leftLen
  const leftBefore = { x: leftDx - cornerR * leftUx, y: cornerR * leftUy }
  const leftAfter = { x: leftDx + cornerR, y: 0 }

  const rightLen = Math.hypot(rightDx, h)
  const rightUx = rightDx / rightLen
  const rightUy = h / rightLen
  const rightApexX = width - rightDx
  const rightBefore = { x: rightApexX - cornerR, y: 0 }
  const rightAfter = { x: rightApexX + cornerR * rightUx, y: cornerR * rightUy }

  return [
    `M 0,${h}`,
    `L ${leftBefore.x.toFixed(2)},${leftBefore.y.toFixed(2)}`,
    `Q ${leftDx.toFixed(2)},0 ${leftAfter.x.toFixed(2)},${leftAfter.y.toFixed(2)}`,
    `L ${rightBefore.x.toFixed(2)},${rightBefore.y.toFixed(2)}`,
    `Q ${rightApexX.toFixed(2)},0 ${rightAfter.x.toFixed(2)},${rightAfter.y.toFixed(2)}`,
    `L ${width},${h}`,
    'Z',
  ].join(' ')
}
