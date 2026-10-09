<script setup lang="ts">
// Same fixed half-viewport slot as KeywordsPanel.vue/TeamPanel.vue, and
// now the same visual structure too (h3 category header + li rows per
// field) per the reference screenshot — local to TemplateCampaignsMap.vue
// only, driven by DisinfoMap.vue's own v-model:campaign. FC7C6A (not this
// panel's earlier brown) is BADGE_COLORS[0] (app/utils/badgeColors.ts) —
// the same color "Disinformation Campaigns" (guide article 1) and this
// tool's own "Related tool" button (TemplateDefault.vue) already use, so
// the color carries through from the article that links here.
import type { CampaignWithReceivers } from '~/types/campaign'

const props = defineProps<{
  campaign: CampaignWithReceivers | null
  tool?: { title: string, description?: string } | null
}>()

// Placeholder until the project team confirms the actual names — asked
// to invent something for now rather than leave the credit line blank.
const CREDIT_NAMES = 'Léa Dubois, Hugo Martin & Chloé Rousseau'

// Same reading-mode shrink as KeywordsPanel.vue/TeamPanel.vue (50vw ->
// 25vw) — kept in sync with TemplateCampaignsMap.vue's own
// .campaigns-map-content margin-left, which reacts to the same state.
const readingMode = useReadingMode()

// No campaign selected — same section shell, every field just reads "-"
// (not a "click a point" placeholder message) per the reference.
const display = computed(() => {
  const c = props.campaign
  return {
    title: c?.title || '-',
    emitter: c?.emitter_country || '-',
    actor: c?.emitter_actor || '-',
    period: c?.date_or_period || '-',
    platforms: c?.social_networks?.length ? c.social_networks : ['-'],
    audiences: c?.receivers.length
      ? c.receivers.map((r) => (r.receiver_target ? `${r.receiver_country} — ${r.receiver_target}` : r.receiver_country))
      : ['-'],
    analysis: c?.page_content || '-',
    strategies: c?.strategy_used?.length ? c.strategy_used : ['-'],
    sources: c?.sources?.length ? c.sources : ['-'],
  }
})
</script>

<template>
  <aside class="campaign-panel" :class="{ 'reading-mode': readingMode }">
    <!-- No campaign selected (first arrival, or after deselecting) — the
         tool's own name/description instead of an all-dash field grid,
         same h3-category + li-row shell as the campaign detail below. -->
    <template v-if="!campaign">
      <h3>About this tool</h3>
      <ul>
        <li class="campaign-panel-tool-title-row">{{ tool?.title ?? 'Campaigns Maps' }}</li>
      </ul>

      <template v-if="tool?.description">
        <h3>Description</h3>
        <ul>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <li class="campaign-panel-description-row" v-html="tool.description" />
        </ul>
      </template>

      <h3>Idea by</h3>
      <ul>
        <li>{{ CREDIT_NAMES }}</li>
      </ul>
    </template>

    <template v-else>
    <h3>Campaign name</h3>
    <ul>
      <li class="campaign-panel-title-row">{{ display.title }}</li>
    </ul>

    <h3>Emitter</h3>
    <ul>
      <li>{{ display.emitter }}</li>
    </ul>

    <h3>Actor</h3>
    <ul>
      <li>{{ display.actor }}</li>
    </ul>

    <h3>Period</h3>
    <ul>
      <li>{{ display.period }}</li>
    </ul>

    <h3>Platform</h3>
    <ul>
      <li v-for="(platform, i) in display.platforms" :key="i">{{ platform }}</li>
    </ul>

    <h3>Target audience</h3>
    <ul>
      <li v-for="(audience, i) in display.audiences" :key="i">{{ audience }}</li>
    </ul>

    <h3>Analysis</h3>
    <ul>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <li class="campaign-panel-analysis-row" v-html="display.analysis" />
    </ul>

    <h3>Strategies</h3>
    <ul>
      <li v-for="(strategy, i) in display.strategies" :key="i">{{ strategy }}</li>
    </ul>

    <h3>Sources</h3>
    <ul>
      <li v-for="(source, i) in display.sources" :key="i">
        <a v-if="source !== '-'" :href="source" target="_blank" rel="noopener">{{ source }}</a>
        <template v-else>-</template>
      </li>
    </ul>
    </template>
  </aside>
</template>

<style scoped>
/* Same fixed slot + scroll behavior as KeywordsPanel.vue/TeamPanel.vue. */
.campaign-panel {
  position: fixed;
  z-index: 1;
  left: 0;
  top: 8.5vh;
  bottom: 0;
  width: 50vw;
  overflow-y: auto;
  transition: width 0.5s ease;
}

.campaign-panel.reading-mode {
  width: 25vw;
}

/* Same h3 treatment as KeywordsPanel.vue, recolored to FC7C6A (this
   tool's own accent — see the top-of-file comment on why). */
.campaign-panel h3 {
  box-sizing: border-box;
  margin: 0;
  height: 30px;
  width: 100%;
  padding-left: 10px;
  background: #fc7c6a;
  color: #fff;
  font-family: 'Martian Mono', monospace;
  font-weight: 500;
  font-size: 12pt;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.15);
}

.campaign-panel ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Same border-bottom-only single-stroke pattern as KeywordsPanel.vue's
   own li — min-height (not height) so a long source URL or analysis
   paragraph can still wrap without clipping. White at rest (not the
   coral wash tried first) — same hover-only tint KeywordsPanel.vue's own
   li uses, not a permanent background. */
.campaign-panel li {
  box-sizing: border-box;
  min-height: 26px;
  width: 100%;
  padding: 4px 10px;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  font-family: 'Martian Mono', monospace;
  font-size: 11pt;
  color: #3b382f;
  line-height: 1.3;
  transition: background-color 0.15s ease;
}

.campaign-panel li:hover {
  background-color: rgba(252, 124, 106, 0.25);
}

/* `.campaign-panel li` above is one class + one element (0,1,1) — these
   two need the extra `li` tacked on (0,2,1) to actually win over it;
   a bare `.campaign-panel-title-row` class alone (0,1,0) previously lost
   silently and these rows rendered in the generic li style instead. */
.campaign-panel li.campaign-panel-title-row {
  padding: 16px 10px;
  color: #000;
  font-family: 'EB Garamond', Garamond, serif;
  font-weight: 400;
  font-size: 28pt;
  line-height: 1.25;
}

.campaign-panel li.campaign-panel-analysis-row {
  padding: 14px 10px;
  font-family: 'Martian Mono', monospace;
  font-size: 12pt;
  line-height: 1.5;
}

.campaign-panel li.campaign-panel-analysis-row :deep(p) {
  margin: 0;
}

/* Tool name (intro state only) — same family, size and weight as the
   "Idea by" h3 next to it (Martian Mono, 12pt, regular); not the EB
   Garamond serif reserved for an actual campaign's name below. */
.campaign-panel li.campaign-panel-tool-title-row {
  padding: 16px 10px;
  color: #000;
  font-family: 'Martian Mono', monospace;
  font-weight: 400;
  font-size: 12pt;
  line-height: 1.25;
}

/* Tool description (intro state only) — no extra vertical padding beyond
   the base li's own (unlike campaign-panel-analysis-row above), and
   Martian Mono rather than Arial, matching the rest of the panel. */
.campaign-panel li.campaign-panel-description-row {
  padding: 4px 10px;
  align-items: flex-start;
  font-family: 'Martian Mono', monospace;
  font-size: 12pt;
  line-height: 1.5;
}

.campaign-panel li.campaign-panel-description-row :deep(p) {
  margin: 0;
}

.campaign-panel li a {
  color: #3b382f;
  word-break: break-all;
}
</style>
