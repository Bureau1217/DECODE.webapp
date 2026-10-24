// The one site tagline — SiteFooter.vue (desktop, centered) and
// SiteNav.vue (mobile, truncated ticker in place of the 4-tab row) both
// show this exact string; kept here once so they can't drift apart.
export const SITE_TAGLINE = 'DE.CO.DE IS AN OPEN MULTIMEDIA GUIDE EXPLORING DISINFORMATION'

// The same tagline, sentence-cased and spelled out, for search engines and
// link previews (meta description / og:description) — the shouted caps
// above are a visual treatment, not something to show in a results page.
export const SITE_DESCRIPTION = {
  en: 'DE.CO.DE is an open multimedia guide exploring disinformation: an investigation guide, tools against disinformation and curated resources.',
  fr: 'DE.CO.DE est un guide multimédia ouvert qui explore la désinformation : un guide d’enquête, des outils contre la désinformation et des ressources.',
} as const
