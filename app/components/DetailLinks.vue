<script setup lang="ts">
// A short labelled list of links at the foot of a detail page: what else on the
// site is about the same thing.
defineProps<{
  label: string
  items: { title: string, to: string }[]
}>()
</script>

<template>
  <nav v-if="items.length" class="detail-links detail-draw-fade" :aria-label="label">
    <h2 class="detail-links-label text-small">{{ label }}</h2>
    <ul>
      <li v-for="item in items" :key="item.to">
        <NuxtLink :to="item.to" class="text-note">{{ item.title }}</NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
/* The same sides as the text above it (TemplateDetailBody.vue). */
.detail-links {
  padding: 32px 10% 0;
}

/* Clear of Previous/Next (DetailPanelChrome.vue), which come next. */
.detail-links:last-child {
  padding-bottom: 64px;
}

.detail-links-label {
  margin: 0 0 8px;
  font-weight: inherit;
}

.detail-links ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.detail-links a {
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  transition: opacity 0.15s ease;
}

.detail-links a:hover {
  opacity: 0.65;
}

@media (max-width: 1150px) {
  .detail-links {
    padding: 24px 6% 0;
  }
}
</style>
