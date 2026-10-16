/**
 * Light/dark theme — SiteFooter's DARK MODE toggle. A cookie (same reason
 * as useLanguage.ts): SSR renders <html data-theme> itself (app.vue), so
 * a dark-mode visitor never gets a flash of the light theme first.
 * Every color it switches lives in app/assets/css/main.css's
 * `:root[data-theme='dark']` block.
 */
export type ColorMode = 'light' | 'dark'

export function useColorMode() {
  return useCookie<ColorMode>('decode-theme', {
    default: () => 'light',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
}
