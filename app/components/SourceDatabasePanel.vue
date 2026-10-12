<script setup lang="ts">
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
}>()

const readingMode = useReadingMode()

// Sources arrive flat (one page per source) — grouped here into
// per-country sections, in first-seen order, for the title-band + row
// shell the mockup shows (ITALY, CANADA, UK, EUROPE, …).
const countries = computed(() => {
  const groups = new Map<string, Source[]>()
  for (const source of props.sources) {
    const key = source.country_or_region || 'International'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(source)
  }
  return [...groups.entries()].map(([name, items]) => ({ name, items }))
})

const { hovered, tooltipPos, showTooltip, hideTooltip, tapTooltip } = useHoverTooltip<Source>()
</script>

<template>
  <InfoPanel class="src-panel" :reading-mode="readingMode">
    <h2 class="src-panel-title">DE.CO.DE Extension</h2>

    <div class="src-row src-row--header">
      <span class="src-col-name">Sources</span>
      <span class="src-col-domain">Domain</span>
      <span class="src-col-type">Type</span>
      <span class="src-col-country">Country</span>
      <span class="src-col-topic">Topic</span>
      <span class="src-col-score">Score</span>
    </div>

    <template v-for="country in countries" :key="country.name">
      <h3 class="src-country">{{ country.name }}</h3>

      <div
        v-for="source in country.items"
        :key="source.slug"
        class="src-row"
        tabindex="0"
        @mouseenter="showTooltip(source, $event)"
        @mouseleave="hideTooltip"
        @focus="showTooltip(source, $event)"
        @blur="hideTooltip"
        @click="tapTooltip(source, $event)"
      >
        <span class="src-col-name">{{ source.title }}</span>
        <span class="src-col-domain">{{ source.source_domain }}</span>
        <span class="src-col-type">{{ source.source_type }}</span>
        <span class="src-col-country">{{ source.country_or_region }}</span>
        <span class="src-col-topic">{{ source.topic_area }}</span>
        <span class="src-col-score">{{ source.trust_score_100 }}/100</span>
      </div>
    </template>

    <HoverTooltip v-if="hovered" class="src-tooltip" :pos="tooltipPos" accent="var(--tool-sourcerel-accent-deep)">
      <strong class="src-tooltip-title">{{ hovered.title }}</strong>
      <span class="src-tooltip-level">{{ hovered.trust_level }} trust — {{ hovered.trust_score_100 }}/100</span>
      <p v-if="hovered.trust_score_explanation">{{ hovered.trust_score_explanation }}</p>
      <p v-if="hovered.bias_notes" class="src-tooltip-bias">{{ hovered.bias_notes }}</p>
    </HoverTooltip>
  </InfoPanel>
</template>

<style scoped>
/* Shell lives in InfoPanel.vue now — see KeywordsPanel.vue's own note. */

.src-panel-title {
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

.src-row {
  box-sizing: border-box;
  width: 100%;
  display: grid;
  grid-template-columns: 1.5fr 1.3fr 1fr 0.9fr 1.2fr 0.7fr;
  gap: 6px;
  align-items: center;
  padding: 6px 10px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: 8.5pt;
  color: var(--color-ink);
  line-height: 1.3;
  cursor: default;
  outline: none;
  transition: background-color 0.15s ease;
}

.src-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.src-row--header {
  background: var(--tool-sourcerel-tint);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  position: sticky;
  top: 0;
  z-index: 2;
}

.src-row:not(.src-row--header):hover,
.src-row:not(.src-row--header):focus-visible {
  background-color: #f3eaf9;
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
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 9.5pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
}

/* Box/position/teleport chrome lives in HoverTooltip.vue now — only this
   tool's own tooltip typography stays here. */

.src-tooltip-title {
  display: block;
  margin-bottom: 4px;
  font-family: var(--font-mono);
  font-size: 11pt;
  font-weight: 700;
  color: var(--color-ink);
  white-space: normal;
}

.src-tooltip-level {
  display: block;
  margin-bottom: 8px;
  font-family: var(--font-mono);
  font-size: 8.5pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--tool-sourcerel-accent-deep);
}

.src-tooltip p {
  margin: 0 0 8px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
  line-height: 1.5;
  color: var(--color-text-soft);
  white-space: normal;
}

.src-tooltip p:last-child {
  margin-bottom: 0;
}

.src-tooltip-bias {
  color: var(--color-text-soft);
  font-style: italic;
}

/* 6 columns of ellipsis-truncated text is unreadable at phone width —
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

  .src-row span {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    overflow: visible;
    white-space: normal;
    text-overflow: clip;
    text-align: right;
  }

  .src-row span::before {
    flex-shrink: 0;
    color: var(--tool-sourcerel-accent-deep);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 7.5pt;
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

  .src-col-country::before {
    content: 'Country';
  }

  .src-col-topic::before {
    content: 'Topic';
  }

  .src-col-score::before {
    content: 'Score';
  }
}
</style>
