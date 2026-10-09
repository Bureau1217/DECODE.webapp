<script setup lang="ts">
// Left panel for the Bot / Troll Detector tool (TemplateBotTrollDetector.vue)
// — the criteria list editors manage in the CMS (tools/bot-troll-detector's
// own "Critères" children, site/blueprints/pages/criterion.yml), grouped
// by category with a hover popup per row (design reference: mockup shown
// for this tool). Teal (B4EAE1, BADGE_COLORS[1]) is this tool's own
// accent — same "page gets the next badge color in the cycle" pattern
// Campaigns Maps set with coral (BADGE_COLORS[0]).
import type { Criterion } from '~/types/botTroll'

const props = defineProps<{
  criteria: Criterion[]
}>()

// Same reading-mode shrink as CampaignInfoPanel.vue/KeywordsPanel.vue
// (50vw -> 25vw), kept in sync with TemplateBotTrollDetector.vue's own
// content column by reacting to the same state.
const readingMode = useReadingMode()

// Criteria arrive flat (one page per criterion) — grouped here into
// category sections, in first-seen order, for the h3-category + li-rows
// shell the mockup shows (ACCOUNT STRUCTURE, CONTENT REPETITION, …).
const categories = computed(() => {
  const groups = new Map<string, Criterion[]>()
  for (const criterion of props.criteria) {
    const key = criterion.category || 'Other criteria'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(criterion)
  }
  return [...groups.entries()].map(([name, items]) => ({ name, items }))
})

// The tooltip can't be a plain CSS-positioned child of the hovered <li>:
// .bt-panel scrolls (overflow-y: auto), which per spec forces overflow-x
// to auto too, clipping anything positioned outside the panel's own box
// (left: 100%) — confirmed live, the popup was invisible. Teleported to
// <body> and positioned `fixed` from the hovered row's own
// getBoundingClientRect() instead, so it escapes that clipping entirely.
const hovered = ref<Criterion | null>(null)
const tooltipPos = ref({ top: 0, left: 0 })

function showTooltip(criterion: Criterion, event: MouseEvent | FocusEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  tooltipPos.value = { top: rect.top, left: rect.right - 2 }
  hovered.value = criterion
}

function hideTooltip() {
  hovered.value = null
}
</script>

<template>
  <aside class="bt-panel" :class="{ 'reading-mode': readingMode }">
    <h2 class="bt-panel-title">Bot / Troll Detector</h2>

    <template v-for="category in categories" :key="category.name">
      <h3 class="bt-category">{{ category.name }}</h3>
      <ul>
        <li
          v-for="criterion in category.items"
          :key="criterion.slug"
          class="bt-criterion"
          tabindex="0"
          @mouseenter="showTooltip(criterion, $event)"
          @mouseleave="hideTooltip"
          @focus="showTooltip(criterion, $event)"
          @blur="hideTooltip"
        >
          {{ criterion.interface_label }}
        </li>
      </ul>
    </template>

    <Teleport to="body">
      <div v-if="hovered" class="bt-tooltip" :style="{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left}px` }">
        <strong class="bt-tooltip-title">{{ hovered.interface_label }}</strong>
        <p v-if="hovered.why_it_matters">{{ hovered.why_it_matters }}</p>
        <p v-if="hovered.observable_signal" class="bt-tooltip-signal">
          Signal observed — {{ hovered.observable_signal }}
        </p>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
.bt-panel {
  position: fixed;
  z-index: 1;
  left: 0;
  top: 8.5vh;
  bottom: 0;
  width: 50vw;
  overflow-y: auto;
  background: #fff;
  transition: width 0.5s ease;
}

.bt-panel.reading-mode {
  width: 25vw;
}

.bt-panel-title {
  box-sizing: border-box;
  margin: 0;
  padding: 14px 10px;
  font-family: 'Martian Mono', monospace;
  font-weight: 700;
  font-size: 14pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #1a1a1a;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.bt-category {
  box-sizing: border-box;
  margin: 0;
  height: 28px;
  width: 100%;
  padding-left: 10px;
  background: #cdeeea;
  color: #1a1a1a;
  font-family: 'Martian Mono', monospace;
  font-weight: 700;
  font-size: 10pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.bt-panel ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.bt-criterion {
  position: relative;
  box-sizing: border-box;
  min-height: 26px;
  width: 100%;
  padding: 5px 10px;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  font-family: 'Martian Mono', monospace;
  font-size: 10pt;
  color: #1a1a1a;
  line-height: 1.3;
  cursor: default;
  outline: none;
  transition: background-color 0.15s ease;
}

.bt-criterion:hover,
.bt-criterion:focus-visible {
  background-color: #e8f8f5;
}

.bt-tooltip {
  position: fixed;
  z-index: 50;
  width: 320px;
  box-sizing: border-box;
  padding: 16px 18px;
  background: #fff;
  border: 1px solid #3fa396;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

.bt-tooltip-title {
  display: block;
  margin-bottom: 8px;
  font-family: 'Martian Mono', monospace;
  font-size: 11pt;
  font-weight: 700;
  color: #1a1a1a;
  text-transform: none;
  white-space: normal;
}

.bt-tooltip p {
  margin: 0 0 8px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
  line-height: 1.5;
  color: #333;
  white-space: normal;
}

.bt-tooltip p:last-child {
  margin-bottom: 0;
}

.bt-tooltip-signal {
  color: #2e8577;
}
</style>
