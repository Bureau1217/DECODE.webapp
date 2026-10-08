// Same three colors as the splash screen's corner badges (Splash.vue,
// BADGE_COLORS) — cycling the same way, so an article's secondary-title
// chip anywhere else on the site (guide cards, tool cards, ...) lands on
// the same color as its own badge there.
export const BADGE_COLORS = ['#FC7C6A', '#B4EAE1', '#CDB4EA']

export function badgeColorFor(index: number) {
  return BADGE_COLORS[index % BADGE_COLORS.length]
}
