// True for the ~2.8s right after the splash's "Enter the investigation
// guide" (pages/index.vue): SiteNav, SiteIndexBar and KeywordsPanel mount
// then and play their draw-in (tab trim paths, panel lines, bands
// filling), app.vue holds the splash's surviving grid line meanwhile.
// Never true on an ordinary page load or navigation.
export const useIntroTransition = () => useState('intro-transition', () => false)
