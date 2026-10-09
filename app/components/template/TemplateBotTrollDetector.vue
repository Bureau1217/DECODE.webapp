<script setup lang="ts">
// Custom detail view for the "Bot / Troll Detector" tool (wired in
// app/pages/tools/[tool].vue by slug, not used by any other tool) — left
// panel is the criteria checklist (BotTrollCriteriaPanel.vue, CMS-managed
// via the `tool` select's own `criteria` relation), right panel is one
// demo account's data plus the verdict game (BotTrollAccountPanel.vue,
// static dataset — app/data/btAccounts.json). Same fixed-left/offset-right
// layout formula as TemplateCampaignsMap.vue, teal (B4EAE1) instead of
// that tool's coral.
import { useBotTrollAccounts } from '~/composables/useBotTrollAccounts'
import type { Criterion, Account } from '~/types/botTroll'

const props = defineProps<{
  page: {
    criteria: Criterion[]
  }
}>()

// @dailytruth.now — the account this tool's own design reference shows
// by default (fake-news archetype, has sample posts and recorded
// evidence, so every panel has something to display on arrival).
const { accounts } = useBotTrollAccounts()
const selectedAccount = ref<Account | null>(
  accounts.find((a) => a.handle === '@dailytruth.now') ?? accounts[0] ?? null,
)

const readingMode = useReadingMode()
</script>

<template>
  <div class="bt-page">
    <BotTrollCriteriaPanel :criteria="props.page.criteria" />
    <div class="bt-content" :class="{ 'reading-mode': readingMode }">
      <BotTrollAccountPanel v-model:account="selectedAccount" />
    </div>
  </div>
</template>

<style scoped>
.bt-page {
  position: relative;
}

/* Fills exactly the space between SiteNav/SiteIndexBar (8.5vh, top) and
   SiteFooter (var(--footer-height), bottom) — same formula used
   throughout (guide/index.vue, TemplateCampaignsMap.vue). margin-left
   makes room for BotTrollCriteriaPanel (fixed, 50vw normally/25vw in
   reading mode) — kept in sync with that panel's own width by reacting
   to the same readingMode state, with the same transition. */
.bt-content {
  margin-left: 50vw;
  min-height: calc(100vh - 8.5vh - var(--footer-height));
  overflow-y: auto;
  transition: margin-left 0.5s ease;
}

.bt-content.reading-mode {
  margin-left: 25vw;
}
</style>
