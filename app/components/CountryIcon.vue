<script setup lang="ts">
// Same pixel-dot country shapes Splash.vue scatters across the splash
// screen (public/splash/*.svg) — reused here, not redrawn, but via
// public/countries/*.svg: copies with their opacity:0.5 (tuned for sitting
// on the splash background) stripped out. Without that, mask-mode:alpha
// below (see .country-icon) still only punches a 50%-alpha hole — the
// opacity is baked into the file, not just a CSS mask-mode question — so
// the "white" badge came out as a brownish tint blended with the card.
const COUNTRY_SRC: Record<string, string> = {
  CA: '/countries/ca.svg',
  BR: '/countries/br.svg',
  PE: '/countries/pe.svg',
}

const props = defineProps<{
  code: keyof typeof COUNTRY_SRC
}>()

const maskImage = computed(() => `url(${COUNTRY_SRC[props.code]})`)
</script>

<template>
  <div class="country-icon" :style="{ '-webkit-mask-image': maskImage, maskImage }" aria-hidden="true" />
</template>

<style scoped>
.country-icon {
  background-color: #fff;
  /* alpha, not the default luminance — the source SVGs' dots are a dim
     grey at 0.5 opacity (tuned for sitting on the splash screen), which
     under luminance masking only partially lets the white background
     through (reading as a brownish tint over the card, not solid white).
     Alpha mode only cares whether a dot is drawn at all, ignoring its
     original color/opacity. */
  mask-mode: alpha;
  -webkit-mask-source-type: alpha;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}
</style>
