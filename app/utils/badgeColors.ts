// Same three colors as the splash screen's corner badges (Splash.vue,
// BADGE_COLORS) — cycling the same way, so an article's secondary-title
// chip anywhere else on the site (guide cards, tool cards, ...) lands on
// the same color as its own badge there.
export const BADGE_COLORS = ['#FC7C6A', '#B4EAE1', '#CDB4EA']

export function badgeColorFor(index: number) {
  return BADGE_COLORS[index % BADGE_COLORS.length]
}

// Tools follow their own tool colors, not the plain badge cycle: tool 2
// (DE.CO.DE Extension) is purple and tool 3 (Bot / Troll Detector) teal —
// the same accents their own pages use (--tool-sourcerel-accent,
// --tool-bottroll-accent in main.css).
export const TOOL_COLORS = [BADGE_COLORS[0], BADGE_COLORS[2], BADGE_COLORS[1]]

export function toolColorFor(index: number) {
  return TOOL_COLORS[index % TOOL_COLORS.length]
}
