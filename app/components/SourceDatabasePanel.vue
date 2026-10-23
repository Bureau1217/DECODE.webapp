<script setup lang="ts">
import { stackDelay } from '~/utils/stackDelay'
// Left panel for the Source Reliability tool (TemplateSourceReliability.vue)
// — the source database editors manage in the CMS (tools/
// source-reliability-plugin's own "Sources" children, site/blueprints/
// pages/source.yml), grouped by country with a hover popup per row
// (design reference: mockup shown for this tool, same table shape as the
// workbook it was imported from). Purple (CDB4EA, BADGE_COLORS[2]) is
// this tool's own accent — same "page gets its own badge color" pattern
// Campaigns Maps (coral) and Bot / Troll Detector (teal) already set.
import type { Source } from '~/types/source'

const props = defineProps<{
  sources: Source[]
  // Entrance state (TemplateToolPageLayout.vue): each country band keeps
  // a single "-" row; switching off stacks its real rows in.
  empty?: boolean
}>()

const readingMode = useReadingMode()

// Sources arrive flat (one page per source) — grouped here into
// per-country sections, alphabetical by country name, for the title-band
// + row shell the mockup shows. The band itself names the country, so
// rows don't repeat it in a column of their own.
const countries = computed(() => {
  const groups = new Map<string, Source[]>()
  for (const source of props.sources) {
    const key = source.country_or_region || 'International'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(source)
  }
  return [...groups.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
})

// Entrance state: four countries and the band of a fifth — a glimpse
// of the database, not the whole list; Start stacks them all in.
const EMPTY_COUNTRIES = 4
const shownCountries = computed(() => (props.empty ? countries.value.slice(0, EMPTY_COUNTRIES + 1) : countries.value))

const { hovered, tooltipPos, showTooltip, hideTooltip, tapTooltip } = useHoverTooltip<Source>()
</script>

<template>
  <InfoPanel class="src-panel" :reading-mode="readingMode">

    <div class="src-row src-row--header text-small">
      <span class="src-col-name">Sources</span>
      <span class="src-col-domain">Domain</span>
      <span class="src-col-type">Type</span>
      <span class="src-col-topic">Topic</span>
      <span class="src-col-score">Score</span>
    </div>

    <template v-for="(country, ci) in shownCountries" :key="country.name">
      <h3 class="src-country text-label">{{ country.name }}</h3>

      <!-- Entrance state: a single "-" per country, under its name — and
           the last country shown (the half one) only its band. -->
      <div v-if="empty && ci < EMPTY_COUNTRIES" class="src-row text-caption">
        <span>-</span>
      </div>
      <!-- After Start the country's rows stack up under its first one
           (which takes the "-" row's place); the layout deciphers them. -->
      <template v-else-if="!empty">
        <div
          v-for="(source, i) in country.items"
          :key="source.slug"
          class="src-row text-caption"
          :class="{ 'tool-stack-in': i > 0 }"
          :style="{ '--stack-delay': `${stackDelay(i)}s` }"
          tabindex="0"
          @mouseenter="showTooltip(source, $event)"
          @mouseleave="hideTooltip"
          @focus="showTooltip(source, $event)"
          @blur="hideTooltip"
          @click="tapTooltip(source, $event)"
        >
          <span
            v-for="(cell, col) in [source.title, source.source_domain, source.source_type, source.topic_area, `${source.trust_score_100}/100`]"
            :key="col"
            :class="{ 'src-col-score': col === 4 }"
          >{{ cell }}</span>
        </div>
      </template>
    </template>

    <!-- Classed wrapper inside the slot, not a class on HoverTooltip
         itself — its root is a <Teleport>, which drops a passed class. -->
    <HoverTooltip v-if="hovered" :pos="tooltipPos" accent="var(--tool-sourcerel-accent-deep)">
      <div class="src-tooltip text-note">
        <strong class="src-tooltip-title">{{ hovered.title }}</strong>
        <span class="src-tooltip-level">{{ hovered.trust_level }} trust — {{ hovered.trust_score_100 }}/100</span>
        <p v-if="hovered.trust_score_explanation">{{ hovered.trust_score_explanation }}</p>
        <p v-if="hovered.bias_notes" class="src-tooltip-bias">{{ hovered.bias_notes }}</p>
      </div>
    </HoverTooltip>
  </InfoPanel>
</template>

<style scoped>
/* Shell lives in InfoPanel.vue now — see KeywordsPanel.vue's own note. */

.src-row {
  box-sizing: border-box;
  width: 100%;
  display: grid;
  grid-template-columns: 1.7fr 1.5fr 1.1fr 1.3fr 0.7fr;
  gap: 6px;
  align-items: center;
  padding: 6px 10px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-ink);
  cursor: default;
  outline: none;
  transition: background-color 0.15s ease;
}

.src-row > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.src-row--header {
  background: var(--tool-sourcerel-tint);
  position: sticky;
  top: 0;
  z-index: 2;
}

.src-row:not(.src-row--header):hover,
.src-row:not(.src-row--header):focus-visible {
  background-color: var(--tool-sourcerel-hover);
}

.src-col-score {
  text-align: right;
}

.src-country {
  box-sizing: border-box;
  margin: 0;
  height: 26px;
  width: 100%;
  padding-left: 10px;
  background: var(--tool-sourcerel-accent);
  color: var(--color-ink);
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
}

/* Box/position/teleport chrome lives in HoverTooltip.vue now — only this
   tool's own tooltip typography stays here. Same type as the keyword
   definition popup readers see on articles (KeywordsPanel.vue's own
   .keywords-panel-popup: Arial, 12pt bold title, 12pt/1.4 body), in this
   tool's deep purple instead of the site brown — #8a5fc7 on white is
   4.6:1, above WCAG AA's 4.5:1 for body text. */
.src-tooltip {
  color: var(--tool-sourcerel-accent-deep);
}

.src-tooltip-title {
  display: block;
  margin-bottom: 4px;
  font-weight: 700;
  white-space: normal;
}

.src-tooltip-level {
  display: block;
  margin-bottom: 8px;
}

.src-tooltip p {
  margin: 0 0 8px;
  white-space: normal;
}

.src-tooltip p:last-child {
  margin-bottom: 0;
}

.src-tooltip-bias {
  font-style: italic;
}

/* 5 columns of ellipsis-truncated text is unreadable at phone width —
   each row becomes a stacked label/value mini-table instead (labels
   injected via ::before so the template itself doesn't need per-field
   markup just for this breakpoint). The header row (column labels) is
   redundant once every row carries its own labels, so it's hidden. */
@media (max-width: 768px) {
  .src-row--header {
    display: none;
  }

  .src-row {
    grid-template-columns: 1fr;
    gap: 2px;
    padding: 10px;
  }

  .src-row > span {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    overflow: visible;
    white-space: normal;
    text-overflow: clip;
    text-align: right;
  }

  .src-row > span::before {
    flex-shrink: 0;
    color: var(--tool-sourcerel-accent-deep);
    font-weight: 700;
    text-transform: uppercase;
    text-align: left;
  }

  .src-col-name::before {
    content: 'Name';
  }

  .src-col-domain::before {
    content: 'Domain';
  }

  .src-col-type::before {
    content: 'Type';
  }

  .src-col-topic::before {
    content: 'Topic';
  }

  .src-col-score::before {
    content: 'Score';
  }
}
</style>
