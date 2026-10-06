<script setup lang="ts">
const showSplash = useSplashVisible()
</script>

<template>
  <div>
    <!-- Hidden defs for the global image duotone treatment (app/assets/css/main.css).
         https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feComponentTransfer -->
    <svg width="0" height="0" style="position: absolute" aria-hidden="true">
      <filter id="duotone-silver">
        <!-- Rec.601 luma weights — a more photographically faithful
             grayscale conversion than a flat average, better preserving
             how skin/fabric/architecture read tonally. -->
        <feColorMatrix
          type="matrix"
          values="0.299 0.587 0.114 0 0
                  0.299 0.587 0.114 0 0
                  0.299 0.587 0.114 0 0
                  0     0     0     1 0"
        />
        <!-- Photographic-negative remap, not a fade: each channel's table
             is [highlight-target, shadow-target] — note the REVERSED
             order vs. a plain compression. Input 0 (original black) maps
             to the near-white end; input 1 (original white) maps to the
             darkest end. That's grayscale -> invert -> compress into the
             target band, folded into one continuous linear transform (no
             separate clip/posterize step, so every input luminance still
             maps to a distinct output — full tonal structure survives).
             Endpoints: originally-brightest content -> ~#9fa1a3 (darkest
             negative tone), originally-darkest content -> ~#f4f4f2
             (near-white), 50% luminance -> ~#cacccd. -->
        <feComponentTransfer color-interpolation-filters="sRGB">
          <feFuncR type="table" tableValues="0.95686 0.62353" />
          <feFuncG type="table" tableValues="0.95686 0.63137" />
          <feFuncB type="table" tableValues="0.94902 0.63922" />
        </feComponentTransfer>
      </filter>
    </svg>

    <template v-if="!showSplash">
      <h1 style="padding: 1rem">App hôte — test d'intégration du layer DECODE</h1>
      <Map />
      <SiteNav />
    </template>
    <!-- Without this, app/pages/** (the CMS-driven routes) never render —
         app.vue's own template always wins. -->
    <NuxtPage />

    <SiteFooter />
  </div>
</template>
