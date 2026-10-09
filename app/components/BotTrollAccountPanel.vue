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

const { findByHandle } = useBotTrollAccounts()

const searchOpen = ref(false)
const searchInput = ref('')
const searchError = ref(false)

function toggleSearch() {
  searchOpen.value = !searchOpen.value
  searchError.value = false
  if (searchOpen.value) searchInput.value = account.value?.handle ?? ''
}

function submitSearch() {
  const found = findByHandle(searchInput.value)
  if (!found) {
    searchError.value = true
    return
  }
  account.value = found
  searchOpen.value = false
  searchError.value = false
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
        <button type="button" class="bt-search-toggle" aria-label="Search another account" @click="toggleSearch">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2" />
            <line x1="20" y1="20" x2="15.2" y2="15.2" stroke="currentColor" stroke-width="2" stroke-linecap="square" />
          </svg>
        </button>
      </div>

      <form v-if="searchOpen" class="bt-search-form" @submit.prevent="submitSearch">
        <input v-model="searchInput" type="text" placeholder="@handle" class="bt-search-input">
        <button type="submit" class="bt-search-submit">Go</button>
      </form>
      <p v-if="searchError" class="bt-search-error">No demo account matches that handle.</p>

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
          <button type="button" class="bt-save" :disabled="!selectedVerdict || saving" @click="save">
            {{ saving ? 'Saving…' : 'Save to review table' }}
          </button>
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
  padding: 24px 32px 48px;
  font-family: 'Martian Mono', monospace;
  color: #1a1a1a;
}

.bt-eyebrow {
  display: block;
  margin-bottom: 8px;
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6f6f6f;
}

.bt-handle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 2px solid #1a1a1a;
}

.bt-handle {
  margin: 0;
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 26pt;
}

.bt-search-toggle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #3fa396;
  background: #fff;
  color: #3fa396;
  cursor: pointer;
}

.bt-search-toggle:hover {
  background: #3fa396;
  color: #fff;
}

.bt-search-form {
  display: flex;
  gap: 8px;
  margin: -12px 0 20px;
}

.bt-search-input {
  flex: 1;
  font-family: 'Martian Mono', monospace;
  font-size: 10pt;
  padding: 8px 10px;
  border: 1px solid #3fa396;
}

.bt-search-submit {
  font-family: 'Martian Mono', monospace;
  font-size: 10pt;
  text-transform: uppercase;
  padding: 8px 16px;
  border: 1px solid #3fa396;
  background: #b4eae1;
  color: #1a1a1a;
  cursor: pointer;
}

.bt-search-error {
  margin: -12px 0 20px;
  font-size: 9pt;
  color: #9c2c30;
}

.bt-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin-bottom: 28px;
}

.bt-stat {
  background: #e8f8f5;
  padding: 12px 14px;
  box-sizing: border-box;
}

.bt-stat-label {
  display: block;
  font-size: 8.5pt;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #2e8577;
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
  background: #e8f8f5;
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
  color: #6f6f6f;
}

.bt-post-hashtags {
  color: #3fa396;
}

.bt-verdict {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 20px;
}

.bt-verdict-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.bt-verdict-option {
  font-family: 'Martian Mono', monospace;
  font-size: 10pt;
  font-weight: 700;
  text-transform: uppercase;
  padding: 14px 8px;
  border: 1px solid #1a1a1a;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
  text-align: center;
}

.bt-verdict-option:hover {
  background: #e8f8f5;
}

.bt-verdict-option--active {
  background: #1a1a1a;
  color: #fff;
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
  color: #6f6f6f;
}

.bt-note textarea {
  width: 100%;
  box-sizing: border-box;
  font-family: 'Martian Mono', monospace;
  font-size: 10pt;
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  resize: vertical;
}

.bt-save-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bt-save {
  font-family: 'Martian Mono', monospace;
  font-size: 10pt;
  font-weight: 700;
  text-transform: uppercase;
  padding: 12px 22px;
  border: 1px solid #1a1a1a;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
}

.bt-save:hover:not(:disabled) {
  background: #1a1a1a;
  color: #fff;
}

.bt-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.bt-save-status {
  font-size: 9pt;
  color: #1e6b31;
}

.bt-save-status--error {
  color: #9c2c30;
}
</style>
