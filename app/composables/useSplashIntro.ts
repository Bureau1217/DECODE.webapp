// Arrival on the splash (Splash.vue): 'logo' (white screen, DE.CO.DE
// growing in the middle, held, faded) -> 'build' (every splash element
// constructs itself) -> 'tab' (the top tab traces itself) -> 'footer'
// (SiteFooter.vue slides up into view) -> 'done'. Starts at 'logo' on a
// full load of '/' so the server-rendered footer is already hidden;
// 'done' anywhere else.
export type SplashIntroPhase = 'logo' | 'build' | 'tab' | 'footer' | 'done'

export const useSplashIntro = () => useState<SplashIntroPhase>('splash-intro', () => (useRoute().path === '/' ? 'logo' : 'done'))
