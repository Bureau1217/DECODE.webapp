// Arrival on the splash (Splash.vue): 'logo' (white screen, DE.CO.DE
// growing in the middle, held, faded) -> 'build' (every splash element
// constructs itself) -> 'tab' (the top tab traces itself) -> 'footer'
// (SiteFooter.vue slides up into view) -> 'done'. Starts at 'logo' on a
// full load of '/' so the server-rendered footer is already hidden;
// 'done' anywhere else.
export type SplashIntroPhase = 'logo' | 'build' | 'tab' | 'footer' | 'done'

// Set once the intro has played: a returning visitor gets the splash straight
// away, without the logo screen and the build (Splash.vue). A cookie, so the
// server already renders the right state. Crawlers keep no cookies.
export const useIntroSeen = () => useCookie<string | null>('decode-intro-seen', {
  default: () => null,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

export const useSplashIntro = () => useState<SplashIntroPhase>('splash-intro', () => {
  if (useRoute().path !== '/') return 'done'
  return useIntroSeen().value ? 'done' : 'logo'
})
