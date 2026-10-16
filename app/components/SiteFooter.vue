<script setup lang="ts">
import type { Language } from '~/composables/useLanguage'

// Splash arrival: hidden below the screen until its 'footer' phase.
const splashIntro = useSplashIntro()
const introHidden = computed(() => ['logo', 'build', 'tab'].includes(splashIntro.value))

// Not shown while the splash is up (app.vue doesn't gate this component
// itself, but the color does change once it's gone — brown everywhere
// else, matching the brand accent used by the nav/index bar/splash CTA).
const showSplash = useSplashVisible()

// A custom tool page's own accent, not the usual brown, while it's open
// — same reskin as SiteNav.vue/SiteIndexBar.vue.
const { theme, isThemed } = useToolTheme()

// CMS content language (useLanguage.ts) — refetches every page's KQL data
// in place rather than reloading, so the current route/scroll stays put.
const language = useLanguage()
async function setLanguage(value: Language) {
  if (language.value === value) return
  language.value = value
  await refreshNuxtData()
}

const colorMode = useColorMode()
function toggleColorMode() {
  colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <footer
    class="site-footer"
    :class="{ 'is-branded': !showSplash, 'is-tool-themed': isThemed, 'is-intro-hidden': introHidden }"
    :style="{ '--local-accent': theme?.chromeText }"
  >
    <NuxtLink to="/" class="footer-brand">DE.CO.DE</NuxtLink>
    <span class="footer-tagline text-h4">
      {{ SITE_TAGLINE }}
    </span>

    <div class="footer-controls">
      <span class="footer-lang text-h4">
        <button
          type="button"
          class="footer-lang-option"
          :class="{ 'is-active': language === 'en' }"
          :aria-pressed="language === 'en'"
          @click="setLanguage('en')"
        >ENG</button>
        <button
          type="button"
          class="footer-lang-option"
          :class="{ 'is-active': language === 'fr' }"
          :aria-pressed="language === 'fr'"
          @click="setLanguage('fr')"
        >FR</button>
      </span>
      <button
        type="button"
        class="footer-dark-mode text-h4"
        :class="{ 'is-on': colorMode === 'dark' }"
        :aria-pressed="colorMode === 'dark'"
        @click="toggleColorMode"
      >
        <span class="footer-dark-mode-dot" aria-hidden="true" />
        DARK MODE
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

.footer-brand {
  font-family: var(--font-display);
  font-weight: 800;
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
   shorthand, so .text-h4's size still applies. */
.footer-lang-option {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
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
     which would silently override .text-h4's size with the inherited one. */
  font-family: inherit;
  color: inherit;
  cursor: pointer;
}

/* 1em = the button's own font-size (.text-h4, inherited) — scales with
   the text instead of a fixed px guess. */
.footer-dark-mode-dot {
  width: 1em;
  height: 1em;
  border-radius: 50%;
  border: 1px solid currentColor;
  transition: background-color 0.15s ease;
}

/* Filled dot while dark mode is on — same on/off language as
   SiteIndexBar's own INDEX/VISUAL radio dots. */
.footer-dark-mode.is-on .footer-dark-mode-dot {
  background-color: currentColor;
}

/* Moved to the top ticker (SiteNav.vue's own mobile row) — keeping both
   would collide with .footer-brand/.footer-controls at this width, and
   every mobile maquette's footer only ever shows brand + lang/dark-mode. */
@media (max-width: 768px) {
  .footer-tagline {
    display: none;
  }
}

.site-footer.is-intro-hidden {
  transform: translateY(100%);
}
</style>
