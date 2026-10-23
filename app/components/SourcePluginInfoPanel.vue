<script setup lang="ts">
// Right panel for the Source Reliability tool — static install instructions
// plus an illustrative (non-functional) preview of the extension in
// action, matching the design reference. There's no real screen recording
// to embed and no published Chrome Web Store listing yet, so this is
// decorative chrome, not a working video — "Download extension" links to
// the tool's own `url` content field once that's filled in after
// publishing, per Ray (not wiring up the actual extension/store listing
// here, just the page design).
defineProps<{
  title: string
  url?: string
}>()

const steps = [
  'Go to chromewebstore.google.com in Chrome.',
  'Search for "DE.CO.DE Plug In".',
  'Open its page and click "Add to Chrome".',
  'Click "Add extension" to confirm the permissions pop-up.',
  'Find the icon next to the address bar (or pin it via the puzzle-piece menu) to use it.',
]
</script>

<template>
  <!-- The same layout as an opened resource (TemplateRessource.vue), in
       the tool's purple instead of brown: title box (with a small preview
       of the extension above the title), the action between two rules,
       then the steps as the body. -->
  <article class="src-info">
    <header class="src-info-header">
      <!-- Purely illustrative — no real screen recording exists yet, and
           the extension isn't published to the Chrome Web Store yet
           either, so nothing here is interactive or linked. -->
      <div class="src-demo">
        <div class="src-demo-searchbar">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2" />
            <line x1="20" y1="20" x2="15.2" y2="15.2" stroke="currentColor" stroke-width="2" stroke-linecap="square" />
          </svg>
          <span>climate change news</span>
        </div>

        <div class="src-demo-body">
          <div class="src-demo-results">
            <div class="src-demo-result">
              <span class="src-demo-badge src-demo-badge--high">88/100</span>
              <span class="src-demo-result-title">Climate Home News</span>
              <span class="src-demo-result-url">climatechangenews.com</span>
            </div>
            <div class="src-demo-result">
              <span class="src-demo-badge src-demo-badge--high">90/100</span>
              <span class="src-demo-result-title">Climate crisis</span>
              <span class="src-demo-result-url">theguardian.com</span>
            </div>
            <div class="src-demo-result">
              <span class="src-demo-badge src-demo-badge--mid">50/100</span>
              <span class="src-demo-result-title">Climate - BBC News</span>
              <span class="src-demo-result-url">bbc.com</span>
            </div>
            <div class="src-demo-result">
              <span class="src-demo-badge src-demo-badge--mid">50/100</span>
              <span class="src-demo-result-title">UN News: Climate Change</span>
              <span class="src-demo-result-url">news.un.org</span>
            </div>
          </div>

          <div class="src-demo-plugin">
            <div class="src-demo-plugin-head">
              <span>DE.CO.DE Plugin</span>
            </div>
            <strong class="src-demo-plugin-domain">Wikipedia</strong>
            <span class="src-demo-plugin-url">fr.wikipedia.org</span>
            <p class="src-demo-plugin-score">No Data</p>
            <span class="src-demo-plugin-score-label">Not yet rated</span>

            <h4>Analysis</h4>
            <p>This domain has not been evaluated yet. It is not in the reliability database.</p>

            <h4>Suggest a trust score</h4>
            <p>This domain isn't in the database yet. Your suggestion saves locally on this device, as a starting point for the team to review.</p>
            <div class="src-demo-slider"><div class="src-demo-slider-fill" /></div>
            <div class="src-demo-plugin-actions">
              <span class="src-demo-plugin-score-value">30/100</span>
              <span class="src-demo-plugin-submit">Submit suggestion</span>
            </div>

            <span class="src-demo-plugin-link">View full database</span>
          </div>
        </div>

        <div class="src-demo-video">
          <span class="src-demo-play" aria-hidden="true">▶</span>
          <div class="src-demo-progress"><div class="src-demo-progress-fill" /></div>
          <span class="src-demo-time">1:30</span>
        </div>
      </div>
      <h1 class="src-info-title text-h1"><DecipherText :text="title" grow :grow-max="1" /></h1>
      <div class="src-info-meta">
        <span class="src-info-type text-tag">Browser extension</span>
      </div>
    </header>

    <TemplateDividerBand color="var(--tool-sourcerel-accent)">
      <a
        v-if="url"
        :href="url"
        target="_blank"
        rel="noopener"
        class="src-info-action-btn text-label"
      >
        Download extension
      </a>
      <span v-else class="src-info-action-btn text-label is-disabled" title="Not published to the Chrome Web Store yet">
        Download extension
      </span>
    </TemplateDividerBand>

    <TemplateDetailBody color="var(--tool-sourcerel-accent-deep)">
      <ol class="src-steps">
        <li v-for="step in steps" :key="step">{{ step }}</li>
      </ol>
    </TemplateDetailBody>
  </article>
</template>

<style scoped>
/* Every rule down to .src-info-action-btn mirrors TemplateRessource.vue's
   own, only recolored: --color-brand-about -> the tool's deep purple,
   --color-brand-resources -> its light purple. */
.src-info {
  padding-bottom: 40px;
}

/* At least the resource's 32vh — taller only by what the preview needs. */
.src-info-header {
  min-height: 32vh;
  box-sizing: border-box;
  padding-top: 24px;
  padding-bottom: 24px;
  display: grid;
  /* Preview, title, chip — stacked and centered together in the box
     (not the resource's 1fr/auto/1fr, built around a title alone). */
  grid-template-rows: auto auto auto;
  align-content: center;
  justify-items: center;
  padding-left: 8%;
  padding-right: 8%;
  text-align: center;
}

.src-info-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.src-info-title {
  margin: 0;
  color: var(--tool-sourcerel-accent-deep);
}

.src-info-type {
  display: inline-block;
  margin-top: 16px;
  padding: 2px;
  background: var(--tool-sourcerel-accent);
  color: var(--color-ink);
}

.src-info-action-btn {
  display: inline-block;
  margin: auto;
  background: var(--color-surface);
  color: var(--tool-sourcerel-accent-deep);
  border: 1px solid var(--tool-sourcerel-accent-deep);
  padding: 14px 24px;
  text-decoration: none;
  cursor: pointer;
}

.src-info-action-btn.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* The body's steps: its own text size and spacing, numbered. */
.src-steps {
  margin: 0;
  padding-left: 1.3em;
}

.src-steps li + li {
  margin-top: 0.4em;
}

/* Drawn at its full layout width, then shrunk as a whole (zoom keeps
   the layout box in step, unlike a transform) to a small illustration
   above the title. */
.src-demo {
  width: 560px;
  zoom: 0.5;
  margin: 0 auto 48px;
  text-align: left;
  border: 1px solid var(--color-ink);
  /* Its own small type, not the body's 26px. */
  font-size: 10pt;
  line-height: normal;
  font-family: Arial, Helvetica, sans-serif;
  background: var(--color-surface);
}

.src-demo-searchbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-soft);
  font-size: 10pt;
}

.src-demo-body {
  display: flex;
  gap: 1px;
  background: rgba(0, 0, 0, 0.1);
}

.src-demo-results {
  flex: 1 1 60%;
  background: var(--color-surface);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.src-demo-result {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.src-demo-badge {
  align-self: flex-start;
  font-family: var(--font-mono);
  font-size: 7pt;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 999px;
  margin-bottom: 2px;
}

.src-demo-badge--high {
  background: #dff6e3;
  color: var(--color-success);
}

.src-demo-badge--mid {
  background: #fbf1cf;
  color: #8a6a12;
}

.src-demo-result-title {
  color: #1a0dab;
  font-size: 11pt;
}

.src-demo-result-url {
  color: #006621;
  font-size: 8.5pt;
}

.src-demo-plugin {
  flex: 1 1 40%;
  background: #faf7fd;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  font-size: 9pt;
}

.src-demo-plugin-head {
  font-family: var(--font-mono);
  font-size: 7.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tool-sourcerel-accent-deep);
  margin-bottom: 6px;
}

.src-demo-plugin-domain {
  font-size: 11pt;
}

.src-demo-plugin-url {
  color: var(--color-text-soft);
  font-size: 7.5pt;
  margin-bottom: 6px;
}

.src-demo-plugin-score {
  margin: 0;
  font-size: 14pt;
  font-weight: 700;
}

.src-demo-plugin-score-label {
  font-size: 7pt;
  text-transform: uppercase;
  color: var(--color-text-soft);
  margin-bottom: 8px;
}

.src-demo-plugin h4 {
  margin: 6px 0 2px;
  font-family: var(--font-mono);
  font-size: 7.5pt;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-ink);
}

.src-demo-plugin p {
  margin: 0;
  line-height: 1.4;
  color: var(--color-text-soft);
}

.src-demo-slider {
  height: 4px;
  background: var(--tool-sourcerel-tint);
  margin: 8px 0 4px;
}

.src-demo-slider-fill {
  width: 30%;
  height: 100%;
  background: var(--tool-sourcerel-accent-deep);
}

.src-demo-plugin-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.src-demo-plugin-score-value {
  font-family: var(--font-mono);
  font-size: 8pt;
  font-weight: 700;
}

.src-demo-plugin-submit {
  font-family: var(--font-mono);
  font-size: 7pt;
  text-transform: uppercase;
  padding: 4px 8px;
  border: 1px solid var(--color-ink);
}

.src-demo-plugin-link {
  font-family: var(--font-mono);
  font-size: 7.5pt;
  text-transform: uppercase;
  text-decoration: underline;
  color: var(--tool-sourcerel-accent-deep);
  align-self: center;
  margin-top: auto;
}

.src-demo-video {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  border-top: 1px solid var(--color-border);
}

.src-demo-play {
  color: var(--color-ink);
}

.src-demo-progress {
  flex: 1;
  height: 3px;
  background: #e0e0e0;
}

.src-demo-progress-fill {
  width: 65%;
  height: 100%;
  background: var(--color-ink);
}

.src-demo-time {
  font-family: var(--font-mono);
  font-size: 9pt;
}

/* Search-results/plugin-mockup stack full-width instead of sitting side
   by side (60/40) — too narrow a strip at phone width for either half to
   stay legible next to the other. */
@media (max-width: 768px) {
  .src-demo-body {
    flex-direction: column;
  }

  .src-demo-results,
  .src-demo-plugin {
    flex: 1 1 auto;
  }
}
</style>
