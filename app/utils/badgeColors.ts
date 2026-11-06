// Same three colors as the splash screen's corner badges (Splash.vue,
// BADGE_COLORS) — cycling the same way, so an article's secondary-title
// chip anywhere else on the site (guide cards, tool cards, ...) lands on
// the same color as its own badge there.
export const BADGE_COLORS = ['#FC7C6A', '#B4EAE1', '#CDB4EA']

export function badgeColorFor(index: number) {
  return BADGE_COLORS[index % BADGE_COLORS.length]
}

// The same three, deep enough for white text: the tool pages' own deep shades
// (main.css), with Bot/Troll's -signal teal, its -accent-deep being too pale.
const DEEP_BADGE_COLORS = ['#e2654f', '#2a7d70', '#8a5fc7']

export function deepBadgeColor(color: string) {
  return DEEP_BADGE_COLORS[BADGE_COLORS.indexOf(color)] ?? color
}

// A card's photo on hover (app.vue's filters, main.css, ToolCard.vue): a negative
// from white to its deep badge colour taken 45% towards black, as 0..1 channels.
// A guide card's stays grey (#duotone-card-gray: white to #4a4b4d, about as dark
// as the coloured ones).
export const CARD_HOVER_INKS = [
  ...DEEP_BADGE_COLORS.map((hex, i) => [
    `duotone-card-${i}`,
    [1, 3, 5].map((k, ch) => {
      const v = parseInt(hex.slice(k, k + 2), 16)
      return ((v + ((ch === 2 ? 24 : 20) - v) * 0.45) / 255).toFixed(4)
    }),
  ] as const),
  ['duotone-card-gray', ['0.2902', '0.2941', '0.3020']] as const,
]

export function cardHoverFilter(color: string) {
  const i = BADGE_COLORS.indexOf(color)
  return i < 0 ? 'none' : `url(#duotone-card-${i})`
}

// Tools follow their own tool colors, not the plain badge cycle: tool 2
// (DE.CO.DE Extension) is purple and tool 3 (Bot / Troll Detector) teal —
// the same accents their own pages use (--tool-sourcerel-accent,
// --tool-bottroll-accent in main.css).
export const TOOL_COLORS = [BADGE_COLORS[0], BADGE_COLORS[2], BADGE_COLORS[1]]

export function toolColorFor(index: number) {
  return TOOL_COLORS[index % TOOL_COLORS.length]
}
