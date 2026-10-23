<script setup lang="ts">
// Shared "badge chip" look — a shrink-to-fit tinted rectangle behind a
// short label, in the keyword/badge color — duplicated identically
// (modulo margin, which stays each consumer's own layout concern) in
// GuideCard.vue, ToolCard.vue and TemplateDefault.vue's own subtitle.
defineProps<{
  color: string
}>()
</script>

<template>
  <span class="badge-chip text-chip" :style="{ backgroundColor: color }">
    <slot />
  </span>
</template>

<style scoped>
.badge-chip {
  display: inline-block;
  padding: 1px;
  color: var(--color-on-pastel);
}
</style>
