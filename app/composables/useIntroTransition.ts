// True for the ~2.8s right after the splash's "Enter the investigation
// guide" (pages/index.vue): SiteNav, SiteIndexBar and KeywordsPanel mount
// then and play their draw-in (tab trim paths, panel lines, bands
// filling), app.vue holds the splash's surviving grid line meanwhile.
// Never true on an ordinary page load or navigation.
export const useIntroTransition = () => useState('intro-transition', () => false)

// True from that same moment until 2s after the draw-in ends: guide cards
// and keyword rows ignore the pointer, so a cursor resting there doesn't set
// off a hover over the animation or right as it lands.
export const useIntroHoverLock = () => useState('intro-hover-lock', () => false)
