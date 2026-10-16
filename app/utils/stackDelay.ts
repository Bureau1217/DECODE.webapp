// Stagger for tool panel rows stacking in after Start (SourceDatabasePanel.vue,
// BotTrollCriteriaPanel.vue): row i of a country/category, capped so a long
// country doesn't keep growing for seconds.
export function stackDelay(i: number) {
  return Math.min(i, 20) * 0.07
}
