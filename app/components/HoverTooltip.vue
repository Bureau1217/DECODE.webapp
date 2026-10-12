<script setup lang="ts">
// The teleported box itself — paired with useHoverTooltip() for the
// position/visibility state. `accent` is each tool's own border color
// (e.g. var(--tool-bottroll-accent-deep)); title/body content is the
// consumer's own slot, so BotTrollCriteriaPanel/SourceDatabasePanel keep
// their own tooltip typography (different fields, different styling)
// without duplicating the positioning/teleport/box chrome.
defineProps<{
  pos: { top: number, left: number }
  accent: string
}>()
</script>

<template>
  <Teleport to="body">
    <div class="hover-tooltip" :style="{ top: `${pos.top}px`, left: `${pos.left}px`, '--tooltip-accent': accent }">
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>
.hover-tooltip {
  position: fixed;
  z-index: 50;
  width: 320px;
  box-sizing: border-box;
  padding: 16px 18px;
  background: var(--color-surface);
  border: 1px solid var(--tooltip-accent);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

/* 320px can overflow a narrow phone screen outright (not just sit in the
   wrong spot) — useHoverTooltip.ts's own mobile positioning already
   clamps `left` against this same cap, but the box itself still needs to
   shrink on anything narrower than ~336px. */
@media (max-width: 768px) {
  .hover-tooltip {
    width: min(320px, calc(100vw - 16px));
  }
}
</style>
