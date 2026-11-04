<script setup lang="ts">
// Shared "badge chip" look — a shrink-to-fit tinted rectangle behind a
// short label, in the keyword/badge color — duplicated identically
// (modulo margin, which stays each consumer's own layout concern) in
// GuideCard.vue, ToolCard.vue and TemplateDefault.vue's own subtitle.
defineProps<{
  color: string
}>()

// Always one line: a label too long for its card's width takes a smaller size.
const chip = ref<HTMLElement | null>(null)
function fit() {
  const element = chip.value
  const parent = element?.parentElement
  if (!element || !parent) return
  element.style.fontSize = ''
  const parentStyle = getComputedStyle(parent)
  const style = getComputedStyle(element)
  const room = parent.clientWidth - Number.parseFloat(parentStyle.paddingLeft) - Number.parseFloat(parentStyle.paddingRight)
    - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight)
  const range = document.createRange()
  range.selectNodeContents(element)
  const width = range.getBoundingClientRect().width
  if (width > room && room > 0) {
    element.style.fontSize = `${Math.floor(Number.parseFloat(style.fontSize) * room / width * 10) / 10}px`
  }
}

let resize: ResizeObserver | undefined
onMounted(() => {
  fit()
  document.fonts?.ready?.then(fit)
  resize = new ResizeObserver(fit)
  if (chip.value?.parentElement) resize.observe(chip.value.parentElement)
})
onUnmounted(() => resize?.disconnect())
</script>

<template>
  <span ref="chip" class="badge-chip text-chip" :style="{ backgroundColor: color }">
    <slot />
  </span>
</template>

<style scoped>
.badge-chip {
  display: inline-block;
  padding: 1px 6px;
  color: var(--color-on-pastel);
  white-space: nowrap;
}
</style>
