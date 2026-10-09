<script setup lang="ts">
// Not shown while the splash is up (app.vue doesn't gate this component
// itself, but the color does change once it's gone — brown everywhere
// else, matching the brand accent used by the nav/index bar/splash CTA).
const showSplash = useSplashVisible()

// Coral (FC7C6A), not the usual brown, while the Campaigns Maps tool is
// open — same reskin as SiteNav.vue/SiteIndexBar.vue.
const route = useRoute()
const isCampaignsMapPage = computed(() => route.path === '/tools/campaigns-map')
// Same reskin, teal — Bot / Troll Detector's own accent.
const isBotTrollDetectorPage = computed(() => route.path === '/tools/bot-troll-detector')
</script>

<template>
  <footer
    class="site-footer"
    :class="{ 'is-branded': !showSplash, 'is-campaigns-map': isCampaignsMapPage, 'is-bot-troll': isBotTrollDetectorPage }"
  >
    <NuxtLink to="/" class="footer-brand">DE.CO.DE</NuxtLink>
    <span class="footer-tagline text-h4">
      DE.CO.DE IS AN OPEN MULTIMEDIA GUIDE EXPLORING DISINFORMATION
    </span>

    <!-- Visual only for now — no i18n/theme switching wired up yet. -->
    <div class="footer-controls">
      <span class="footer-lang text-h4">ENG FR</span>
      <button type="button" class="footer-dark-mode text-h4">
        <span class="footer-dark-mode-dot" aria-hidden="true" />
        DARK MODE
      </button>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
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
  background: #fff;
  height: var(--footer-height);
  width: 100vw;
  border-top: 2px solid #d2d2d28d;
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.08);
}

.is-branded {
  color: #a68764;
}

.is-campaigns-map {
  color: #fc7c6a;
}

.is-bot-troll {
  color: #3fa396;
}

.footer-brand {
  font-family: 'Archivo', sans-serif;
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
}
</style>
