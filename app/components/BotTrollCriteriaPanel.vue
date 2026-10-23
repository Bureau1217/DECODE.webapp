<script setup lang="ts">
import { stackDelay } from '~/utils/stackDelay'
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
  // Entrance state (TemplateToolPageLayout.vue): each category band
  // keeps a single "-" row; switching off stacks its criteria in.
  empty?: boolean
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

// Mobile: tapping a criterion opens its definition inline under the row
// (same as KeywordsPanel.vue's own), not as a floating tooltip.
const { hovered, tooltipPos, showTooltip, hideTooltip, tapTooltip, isMobile } = useHoverTooltip<Criterion>()
</script>

<template>
  <InfoPanel class="bt-panel" :reading-mode="readingMode">

    <template v-for="category in categories" :key="category.name">
      <h3 class="bt-category text-label">{{ category.name }}</h3>
      <ul>
        <!-- Entrance state: one "-" row per category. -->
        <li v-if="empty" class="bt-criterion">-</li>
        <!-- After Start the category's criteria stack up under its first
             one (which takes the "-" row's place); the layout deciphers them. -->
        <template v-else>
          <li
            v-for="(criterion, i) in category.items"
            :key="criterion.slug"
            class="bt-criterion"
            :class="{ 'tool-stack-in': i > 0 }"
            :style="{ '--stack-delay': `${stackDelay(i)}s` }"
            tabindex="0"
            @mouseenter="showTooltip(criterion, $event)"
            @mouseleave="hideTooltip"
            @focus="showTooltip(criterion, $event)"
            @blur="hideTooltip"
            @click="tapTooltip(criterion, $event)"
          >
            <span>{{ criterion.interface_label }}</span>
            <div v-if="isMobile && hovered?.slug === criterion.slug" class="bt-tooltip bt-inline-definition text-note">
              <p v-if="criterion.why_it_matters">{{ criterion.why_it_matters }}</p>
              <p v-if="criterion.observable_signal" class="bt-tooltip-signal">
                Signal observed — {{ criterion.observable_signal }}
              </p>
            </div>
          </li>
        </template>
      </ul>
    </template>

    <!-- Classed wrapper inside the slot, not a class on HoverTooltip
         itself — its root is a <Teleport>, which drops a passed class. -->
    <HoverTooltip v-if="hovered && !isMobile" :pos="tooltipPos" accent="var(--tool-bottroll-accent-deep)">
      <div class="bt-tooltip text-note">
        <strong class="bt-tooltip-title">{{ hovered.interface_label }}</strong>
        <p v-if="hovered.why_it_matters">{{ hovered.why_it_matters }}</p>
        <p v-if="hovered.observable_signal" class="bt-tooltip-signal">
          Signal observed — {{ hovered.observable_signal }}
        </p>
      </div>
    </HoverTooltip>
  </InfoPanel>
</template>

<style scoped>
/* Shell lives in InfoPanel.vue now — see KeywordsPanel.vue's own note. */

.bt-category {
  box-sizing: border-box;
  margin: 0;
  height: 28px;
  width: 100%;
  padding-left: 10px;
  background: var(--tool-bottroll-band);
  color: var(--color-ink);
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
  color: var(--color-ink);
  cursor: default;
  outline: none;
  transition: background-color 0.15s ease;
}

.bt-criterion:hover,
.bt-criterion:focus-visible {
  background-color: var(--tool-bottroll-tint);
}

/* Box/position/teleport chrome lives in HoverTooltip.vue now — only this
   tool's own tooltip typography stays here. Same type as the keyword
   definition popup on articles (KeywordsPanel.vue: Arial, 12pt bold
   title, 12pt/1.4 body) and SourceDatabasePanel.vue's own, in this tool's
   text-safe teal (--tool-bottroll-signal, 4.9:1 on white). */
.bt-tooltip {
  color: var(--tool-bottroll-signal);
}

.bt-tooltip-title {
  display: block;
  margin-bottom: 4px;
  font-weight: 700;
  white-space: normal;
}

.bt-tooltip p {
  margin: 0 0 8px;
  white-space: normal;
}

.bt-tooltip p:last-child {
  margin-bottom: 0;
}

.bt-tooltip-signal {
  font-style: italic;
}

/* Mobile (script, tapTooltip): the definition opens inline under the
   criterion's own label. */
.bt-inline-definition {
  width: 100%;
  margin-top: 6px;
  padding: 8px 10px;
  box-sizing: border-box;
  border: 1px solid var(--tool-bottroll-accent-deep);
  background: var(--color-surface);
}

@media (max-width: 768px) {
  .bt-criterion {
    flex-wrap: wrap;
    cursor: pointer;
  }
}
</style>
