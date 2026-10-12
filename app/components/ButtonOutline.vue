<script setup lang="ts">
// Border-and-invert "outline button" shape — hand-rolled 4+ times across
// the tool pages (icon toggles, CTAs, the map's own exit control) with
// different class names but the same visual language: a 1px border in an
// accent color, near-transparent fill at rest, filled solid (bg=accent,
// text=surface) on hover/focus. Sizing/padding/font-size stay each
// consumer's own call via the `class` attr (a 36px square icon toggle and
// a 14pt full-width CTA share nothing there) — only the color/invert
// behavior is shared. `filter-tab`/`filter-option` (MapFilters.vue) and
// `bt-verdict-option`/`bt-search-submit` (BotTrollAccountPanel.vue) stay
// local — they don't invert on hover at all (selection-only tabs), or
// invert to a different color than their own border, which this shape
// doesn't cover.
withDefaults(defineProps<{
  accent?: string
  textColor?: string
  background?: string
  disabled?: boolean
  to?: string
  href?: string
}>(), {
  accent: 'var(--color-ink)',
  background: 'var(--color-surface)',
  disabled: false,
})
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="button-outline"
    :style="{ '--btn-accent': accent, '--btn-text': textColor || accent, '--btn-bg': background }"
  >
    <slot />
  </NuxtLink>
  <a
    v-else-if="href"
    :href="href"
    class="button-outline"
    :style="{ '--btn-accent': accent, '--btn-text': textColor || accent, '--btn-bg': background }"
  >
    <slot />
  </a>
  <button
    v-else
    type="button"
    class="button-outline"
    :disabled="disabled"
    :style="{ '--btn-accent': accent, '--btn-text': textColor || accent, '--btn-bg': background }"
  >
    <slot />
  </button>
</template>

<style scoped>
.button-outline {
  appearance: none;
  cursor: pointer;
  box-sizing: border-box;
  border: 1px solid var(--btn-accent);
  border-radius: 0;
  background: var(--btn-bg);
  color: var(--btn-text);
  font-family: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.button-outline:hover:not(:disabled),
.button-outline:focus-visible:not(:disabled) {
  background: var(--btn-accent);
  color: var(--color-surface);
}

.button-outline:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
