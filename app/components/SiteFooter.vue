<script setup lang="ts">
import type { Language } from '~/composables/useLanguage'

// Splash arrival: hidden below the screen until its 'footer' phase.
const splashIntro = useSplashIntro()
const introHidden = computed(() => ['logo', 'build', 'tab'].includes(splashIntro.value))

// Not shown while the splash is up (app.vue doesn't gate this component
// itself, but the color does change once it's gone — brown everywhere
// else, matching the brand accent used by the nav/index bar/splash CTA).
const showSplash = useSplashVisible()

// Splash -> home: fades to brown along with SiteNav's row (same timing as
// its nav-tab-warm) instead of snapping when the splash goes.
const introTransition = useIntroTransition()

// A custom tool page's own accent, not the usual brown, while it's open
// — same reskin as SiteNav.vue/SiteIndexBar.vue.
const { theme, isThemed } = useToolTheme()

// CMS content language (useLanguage.ts): each language has its own URL, so
// these are real links, which also tells crawlers the other version exists.
const language = useLanguage()
const route = useRoute()
function languageHref(value: Language) {
  return pathInLanguage(route.fullPath, value)
}
// Remembered for the bare home page only (server/middleware/language.ts).
function rememberLanguage(value: Language) {
  document.cookie = `decode-lang=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

const colorMode = useColorMode()
function toggleColorMode() {
  colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <footer
    class="site-footer"
    :class="{ 'is-branded': !showSplash, 'is-tool-themed': isThemed, 'is-intro-hidden': introHidden, 'is-intro': introTransition }"
    :style="{ '--local-accent': theme?.chromeText, '--local-chrome': theme?.chromeAccent }"
  >
    <!-- The home page, for search engines too. Within a visit it leads straight
         on to the guide (pages/index.vue). -->
    <NuxtLink to="/" class="footer-brand">DE.CO.DE</NuxtLink>
    <span class="footer-tagline text-small">
      {{ SITE_TAGLINE }}
    </span>

    <div class="footer-controls">
      <span class="footer-lang text-small">
        <a
          :href="languageHref('en')"
          hreflang="en"
          class="footer-lang-option"
          :class="{ 'is-active': language === 'en' }"
          :aria-current="language === 'en' ? 'true' : undefined"
          @click="rememberLanguage('en')"
        >ENG</a>
        <a
          :href="languageHref('fr')"
          hreflang="fr"
          class="footer-lang-option"
          :class="{ 'is-active': language === 'fr' }"
          :aria-current="language === 'fr' ? 'true' : undefined"
          @click="rememberLanguage('fr')"
        >FR</a>
      </span>
      <button
        type="button"
        class="footer-dark-mode text-small"
        :class="{ 'is-on': colorMode === 'dark' }"
        :aria-pressed="colorMode === 'dark'"
        aria-label="Dark mode"
        title="Dark mode"
        @click="toggleColorMode"
      >
        <span class="footer-dark-mode-dot" aria-hidden="true" />
      </button>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  /* Splash arrival (useSplashIntro): held below the screen until the
     splash has built itself, then slides up into place. */
  transition: transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1);
  /* Fixed, not flex-pushed to the bottom — same reasoning as SiteNav/
     SiteIndexBar: in normal flow, anything that makes the page content
     taller than the viewport scrolls this away with it. z-index above
     everything (nav/index-bar included) — "always visible, above any
     content" was explicit. */
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 4;
  /* Opaque — otherwise SiteIndexBar's fixed, viewport-tall divider (z-index
     1, so behind this on paper) would still show straight through an
     unpainted/transparent footer box. */
  background: var(--color-surface);
  height: var(--footer-height);
  width: 100vw;
  border-top: 2px solid var(--color-footer-border);
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.08);
}

.is-branded {
  color: var(--color-brand);
}

.is-tool-themed {
  color: var(--local-accent);
}

/* Same duration, easing and delay as SiteNav.vue's nav-tab-warm. */
.site-footer.is-branded.is-intro {
  animation: footer-warm 1.6s ease-in-out 0.2s both;
}

.site-footer.is-branded.is-intro .footer-dark-mode-dot {
  animation: footer-dot-warm 1.6s ease-in-out 0.2s both;
}

@keyframes footer-warm {
  from {
    color: var(--color-ink);
  }
}

@keyframes footer-dot-warm {
  from {
    --dot-dark: #000;
  }
}

@media (prefers-reduced-motion: reduce) {
  .site-footer.is-branded.is-intro,
  .site-footer.is-branded.is-intro .footer-dark-mode-dot {
    animation: none;
  }
}

/* Registered so footer-dot-warm can interpolate it: an unregistered custom
   property would flip at the animation's midpoint. */
@property --dot-dark {
  syntax: '<color>';
  inherits: true;
  initial-value: #000;
}

.footer-brand {
  font-family: var(--font-text);
  font-weight: 700;
  /* The only footer text that gets the +2pt bump — default browser
     text-size (~12pt, no --text-* var covers this one) + 2. */
  font-size: 18pt;
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: inherit;
  text-decoration: none;
}

.footer-tagline {
  /* Absolutely centered on the viewport width, not just the remaining
     space next to .footer-brand (a 1fr/auto/1fr grid looked centered but
     wasn't: the empty right track and the DECODE-sized left track aren't
     actually equal, so the middle column drifts off true center). */
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-weight: 400;
  white-space: nowrap;
}

.footer-controls {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 1rem;
  white-space: nowrap;
}

.footer-lang {
  display: inline-flex;
  gap: 0.6em;
}

/* Same reset as .footer-dark-mode below — family only, never the `font`
   shorthand, so .text-small's size still applies. */
.footer-lang-option {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

/* The language currently showing — dotted underline, not bold/color, so
   ENG and FR keep the same width whichever is active. */
.footer-lang-option.is-active,
.footer-lang-option:hover {
  text-decoration: underline dotted;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.25em;
}

.footer-dark-mode {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  padding: 0;
  /* Only the family, not the `font` shorthand — that resets font-size too,
     which would silently override .text-small's size with the inherited one. */
  font-family: inherit;
  color: inherit;
  cursor: pointer;
}

/* No label: a circle split on its diagonal, half white, half brown (the
   two themes) — a tool's own color instead of the brown on its page.
   Toggling turns it half a turn, bringing the other half to the
   top-left. 1.2em = scales with the footer's text. */
.footer-dark-mode-dot {
  --dot-dark: var(--local-chrome, var(--color-brand));
  width: 1.2em;
  height: 1.2em;
  box-sizing: border-box;
  border-radius: 50%;
  border: 1px solid currentColor;
  background: linear-gradient(135deg, #fff 50%, var(--dot-dark) 50%);
  transition: transform 0.5s cubic-bezier(0.3, 0, 0.15, 1);
}

/* Splash only: black, not brown — the rest of the footer isn't branded
   yet there either. */
.site-footer:not(.is-branded) .footer-dark-mode-dot {
  --dot-dark: #000;
}

.footer-dark-mode.is-on .footer-dark-mode-dot {
  transform: rotate(180deg);
}

/* Moved to the top ticker (SiteNav.vue's own mobile row) — keeping both
   would collide with .footer-brand/.footer-controls at this width, and
   every mobile maquette's footer only ever shows brand + lang/dark-mode. */
@media (max-width: 1150px) {
  .footer-tagline {
    display: none;
  }
}

.site-footer.is-intro-hidden {
  transform: translateY(100%);
}
</style>
