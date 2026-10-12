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

const { hovered, tooltipPos, showTooltip, hideTooltip, tapTooltip } = useHoverTooltip<Criterion>()
</script>

<template>
  <InfoPanel class="bt-panel" :reading-mode="readingMode">
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
          @click="tapTooltip(criterion, $event)"
        >
          {{ criterion.interface_label }}
        </li>
      </ul>
    </template>

    <HoverTooltip v-if="hovered" class="bt-tooltip" :pos="tooltipPos" accent="var(--tool-bottroll-accent-deep)">
      <strong class="bt-tooltip-title">{{ hovered.interface_label }}</strong>
      <p v-if="hovered.why_it_matters">{{ hovered.why_it_matters }}</p>
      <p v-if="hovered.observable_signal" class="bt-tooltip-signal">
        Signal observed — {{ hovered.observable_signal }}
      </p>
    </HoverTooltip>
  </InfoPanel>
</template>

<style scoped>
/* Shell lives in InfoPanel.vue now — see KeywordsPanel.vue's own note. */

.bt-panel-title {
  box-sizing: border-box;
  margin: 0;
  padding: 14px 10px;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 14pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-ink);
  border-bottom: 1px solid var(--color-border);
}

.bt-category {
  box-sizing: border-box;
  margin: 0;
  height: 28px;
  width: 100%;
  padding-left: 10px;
  background: #cdeeea;
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 10pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
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
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 10pt;
  color: var(--color-ink);
  line-height: 1.3;
  cursor: default;
  outline: none;
  transition: background-color 0.15s ease;
}

.bt-criterion:hover,
.bt-criterion:focus-visible {
  background-color: var(--tool-bottroll-tint);
}

/* Box/position/teleport chrome lives in HoverTooltip.vue now — only this
   tool's own tooltip typography stays here. */

.bt-tooltip-title {
  display: block;
  margin-bottom: 8px;
  font-family: var(--font-mono);
  font-size: 11pt;
  font-weight: 700;
  color: var(--color-ink);
  text-transform: none;
  white-space: normal;
}

.bt-tooltip p {
  margin: 0 0 8px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
  line-height: 1.5;
  color: var(--color-text-soft);
  white-space: normal;
}

.bt-tooltip p:last-child {
  margin-bottom: 0;
}

.bt-tooltip-signal {
  color: var(--tool-bottroll-signal);
}
</style>
