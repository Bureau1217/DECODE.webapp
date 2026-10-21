<script setup lang="ts">
// Right panel for the Bot / Troll Detector tool — one account's observable
// data (static demo dataset, app/data/btAccounts.json) plus the verdict
// game: pick Legitimate/Suspicious/Likely bot-troll, add a note, save.
// Saving posts to /api/submit-verdict (server/api/submit-verdict.post.ts),
// which proxies to DECODE.cms's public /submit-verdict route — each save
// becomes a `submission` child page under tools/bot-troll-detector,
// visible to editors in the panel (the "results of the game").
import { useBotTrollAccounts } from '~/composables/useBotTrollAccounts'
import { VERDICT_OPTIONS, type Verdict, type Account } from '~/types/botTroll'

const account = defineModel<Account | null>('account', { default: null })

// Prev/next arrows step through the demo dataset (wrapping at either
// end) — browsing, not typing a handle that has to already exist in it.
const { accounts } = useBotTrollAccounts()
// By handle, not indexOf — the model value is a reactive proxy of the
// dataset object, never identical to it.
const accountIndex = computed(() => accounts.findIndex((a) => a.handle === account.value?.handle))

function stepAccount(delta: number) {
  if (!accounts.length) return
  const next = (accountIndex.value + delta + accounts.length) % accounts.length
  account.value = accounts[next] ?? null
  resetVerdict()
}

const selectedVerdict = ref<Verdict | null>(null)
const note = ref('')
const saving = ref(false)
const saved = ref(false)
const saveError = ref(false)

function resetVerdict() {
  selectedVerdict.value = null
  note.value = ''
  saved.value = false
  saveError.value = false
}

function chooseVerdict(value: Verdict) {
  selectedVerdict.value = value
  saved.value = false
}

async function save() {
  if (!selectedVerdict.value || !account.value) return
  saving.value = true
  saveError.value = false
  try {
    await $fetch('/api/submit-verdict', {
      method: 'POST',
      body: {
        account_handle: account.value.handle,
        account_platform: account.value.platform,
        verdict: selectedVerdict.value,
        confidence: 60,
        note: note.value,
      },
    })
    saved.value = true
  } catch {
    saveError.value = true
  } finally {
    saving.value = false
  }
}

function formatMonthYear(isoDate?: string) {
  if (!isoDate) return '-'
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
}

function formatCount(n: number | null | undefined) {
  if (n === null || n === undefined) return '-'
  return n.toLocaleString('en-US')
}

function formatUnit(n: number | null | undefined, suffix: string) {
  if (n === null || n === undefined) return '-'
  return `${n}${suffix}`
}

// Deterministic placeholder "photo" for a post thumbnail — never a real
// or stock image (same reasoning DECODE.bot-troll-detector's own
// usePlaceholderArt.js states: nothing here should look like scraped
// content). Seeded on the post id so it's stable across renders.
function placeholderGradient(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  const h1 = hash % 360
  const h2 = (h1 + 40) % 360
  return `linear-gradient(135deg, hsl(${h1}, 55%, 70%), hsl(${h2}, 55%, 55%))`
}
</script>

<template>
  <div class="bt-account">
    <template v-if="account">
      <span class="bt-eyebrow">Analysis</span>

      <div class="bt-handle-row">
        <h1 class="bt-handle">{{ account.handle }}</h1>
        <div class="bt-nav">
          <ButtonOutline
            class="bt-nav-arrow"
            accent="var(--tool-bottroll-accent-deep)"
            aria-label="Previous account"
            @click="stepAccount(-1)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <polyline points="15,4 7,12 15,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" />
            </svg>
          </ButtonOutline>
          <span class="bt-nav-count">{{ accountIndex + 1 }}/{{ accounts.length }}</span>
          <ButtonOutline
            class="bt-nav-arrow"
            accent="var(--tool-bottroll-accent-deep)"
            aria-label="Next account"
            @click="stepAccount(1)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <polyline points="9,4 17,12 9,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" />
            </svg>
          </ButtonOutline>
        </div>
      </div>

      <div class="bt-stats">
        <div class="bt-stat">
          <span class="bt-stat-label">Social media</span>
          <span class="bt-stat-value">{{ account.platform }}</span>
        </div>
        <div class="bt-stat">
          <span class="bt-stat-label">Account created</span>
          <span class="bt-stat-value">{{ formatMonthYear(account.account_created) }}</span>
        </div>
        <div class="bt-stat">
          <span class="bt-stat-label">Followers</span>
          <span class="bt-stat-value">{{ formatCount(account.followers_count) }}</span>
        </div>
        <div class="bt-stat">
          <span class="bt-stat-label">Following</span>
          <span class="bt-stat-value">{{ formatCount(account.following_count) }}</span>
        </div>
        <div class="bt-stat">
          <span class="bt-stat-label">Posts</span>
          <span class="bt-stat-value">{{ formatCount(account.posts_count) }}</span>
        </div>
        <div class="bt-stat">
          <span class="bt-stat-label">Avg engagement</span>
          <span class="bt-stat-value">{{ formatUnit(account.avg_engagement_pct, '%') }}</span>
        </div>
        <div class="bt-stat">
          <span class="bt-stat-label">Posts frequency</span>
          <span class="bt-stat-value">{{ formatUnit(account.post_frequency_per_day, '/day') }}</span>
        </div>
        <div class="bt-stat">
          <span class="bt-stat-label">Unique hashtags</span>
          <span class="bt-stat-value">{{ formatCount(account.unique_hashtags_count) }}</span>
        </div>
        <div class="bt-stat">
          <span class="bt-stat-label">Recent geotags</span>
          <span class="bt-stat-value bt-stat-value--list">
            <template v-if="account.geotags?.length">
              <span v-for="geo in account.geotags" :key="geo">{{ geo }}</span>
            </template>
            <template v-else>-</template>
          </span>
        </div>
      </div>

      <template v-if="account.posts?.length">
        <h3 class="bt-section-title">Latest posts</h3>
        <div class="bt-post">
          <div class="bt-post-thumb" :style="{ background: placeholderGradient(account.posts[0].id) }" />
          <div class="bt-post-body">
            <p class="bt-post-caption">{{ account.posts[0].caption }}</p>
            <p class="bt-post-meta">
              <span>♡ {{ account.posts[0].likes }}</span>
              <span>💬 {{ account.posts[0].comments }}</span>
              <span class="bt-post-hashtags">{{ account.posts[0].hashtags.join(' ') }}</span>
            </p>
          </div>
        </div>
      </template>

      <div class="bt-verdict">
        <div class="bt-verdict-options">
          <button
            v-for="option in VERDICT_OPTIONS"
            :key="option.value"
            type="button"
            class="bt-verdict-option"
            :class="{ 'bt-verdict-option--active': selectedVerdict === option.value }"
            @click="chooseVerdict(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <label class="bt-note">
          <span class="bt-note-label">Note</span>
          <textarea v-model="note" rows="3" placeholder="What tipped it for you?" />
        </label>

        <div class="bt-save-row">
          <ButtonOutline class="bt-save" :disabled="!selectedVerdict || saving" @click="save">
            {{ saving ? 'Saving…' : 'Save to review table' }}
          </ButtonOutline>
          <span v-if="saved" class="bt-save-status">Saved.</span>
          <span v-if="saveError" class="bt-save-status bt-save-status--error">Couldn't save — try again.</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bt-account {
  box-sizing: border-box;
  /* 56px top, not 24px — clears TemplateToolPageLayout.vue's own exit
     cross (14px inset + 28px tall) so "Analysis" never sits under it. */
  padding: 56px 32px 48px;
  font-family: var(--font-mono);
  color: var(--color-ink);
}

.bt-eyebrow {
  display: block;
  margin-bottom: 8px;
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-soft);
}

.bt-handle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 2px solid var(--color-ink);
}

.bt-handle {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 26pt;
}

/* Border/fill/hover-invert chrome lives in ButtonOutline.vue now — only
   the arrows' own sizing stays here. */
.bt-nav {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bt-nav-arrow {
  width: 36px;
  height: 36px;
}

/* tabular-nums keeps the arrows from shifting as the count changes width
   (9/106 -> 10/106). */
.bt-nav-count {
  min-width: 5.5em;
  text-align: center;
  font-size: 9pt;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-soft);
}

.bt-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  margin-bottom: 28px;
}

.bt-stat {
  background: var(--tool-bottroll-tint);
  padding: 12px 14px;
  box-sizing: border-box;
}

.bt-stat-label {
  display: block;
  font-size: 8.5pt;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tool-bottroll-signal);
  margin-bottom: 4px;
}

.bt-stat-value {
  display: block;
  font-size: 12pt;
  font-weight: 700;
}

.bt-stat-value--list {
  font-size: 10pt;
  font-weight: 400;
  display: flex;
  flex-direction: column;
}

.bt-section-title {
  margin: 0 0 12px;
  font-size: 10pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.bt-post {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: var(--tool-bottroll-tint);
  margin-bottom: 28px;
}

.bt-post-thumb {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
}

.bt-post-body {
  min-width: 0;
}

.bt-post-caption {
  margin: 0 0 8px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10.5pt;
  line-height: 1.4;
}

.bt-post-meta {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 9pt;
  color: var(--color-text-soft);
}

.bt-post-hashtags {
  color: var(--tool-bottroll-accent-deep);
}

.bt-verdict {
  border-top: 1px solid var(--color-border);
  padding-top: 20px;
}

.bt-verdict-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.bt-verdict-option {
  font-family: var(--font-mono);
  font-size: 10pt;
  font-weight: 700;
  text-transform: uppercase;
  padding: 14px 8px;
  border: 1px solid var(--color-ink);
  background: var(--color-surface);
  color: var(--color-ink);
  cursor: pointer;
  text-align: center;
}

.bt-verdict-option:hover {
  background: var(--tool-bottroll-tint);
}

.bt-verdict-option--active {
  background: var(--color-ink);
  color: var(--color-on-fill);
}

.bt-note {
  display: block;
  margin-bottom: 20px;
}

.bt-note-label {
  display: block;
  margin-bottom: 6px;
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-soft);
}

.bt-note textarea {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-mono);
  font-size: 10pt;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-ink);
  resize: vertical;
}

.bt-save-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Border/fill/hover-invert/disabled chrome lives in ButtonOutline.vue now
   (default accent is var(--color-ink), matching this button's own) — only
   this button's own sizing/typography stays here. */
.bt-save {
  font-family: var(--font-mono);
  font-size: 10pt;
  font-weight: 700;
  text-transform: uppercase;
  padding: 12px 22px;
}

.bt-save-status {
  font-size: 9pt;
  color: var(--color-success);
}

.bt-save-status--error {
  color: var(--color-error);
}

/* 2 stat columns, not 3 — Outil_2-1.png's own mobile mockup. Everything
   here is held to the screen's width (no horizontal scroll): the handle
   wraps onto its own line above the account arrows, minmax(0, 1fr)
   tracks and overflow-wrap stop a long value (a handle, a geotag) from
   widening its column, and the 3 verdicts stack full width. */
@media (max-width: 768px) {
  .bt-account {
    width: 100%;
    max-width: 100vw;
    padding: 52px 16px 40px;
    overflow-x: hidden;
  }

  .bt-handle-row {
    flex-direction: column;
    align-items: stretch;
  }

  .bt-handle {
    min-width: 0;
    font-size: 20pt;
    overflow-wrap: anywhere;
  }

  .bt-nav {
    justify-content: space-between;
  }

  .bt-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bt-stat {
    min-width: 0;
    padding: 10px;
    overflow-wrap: anywhere;
  }

  .bt-post {
    padding: 12px;
  }

  .bt-post-thumb {
    width: 56px;
    height: 56px;
  }

  .bt-post-caption,
  .bt-post-hashtags {
    overflow-wrap: anywhere;
  }

  .bt-verdict-options {
    grid-template-columns: minmax(0, 1fr);
  }

  .bt-save-row {
    flex-wrap: wrap;
  }
}
</style>
