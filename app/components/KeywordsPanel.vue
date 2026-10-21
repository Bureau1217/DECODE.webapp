<script setup lang="ts">
import type { CategoryWithTags } from '~/composables/useKeywordsPanelCategories'
// Mirrors the CMS's own "Mot-clés" Panel section (site/blueprints/site.yml):
// every root page using the `tags` template, each with its tag children —
// not a fixed list of category names, so a new category added in the CMS
// shows up here with no webapp changes.
//
// Shared across every page that shows this panel (app.vue) — pulled out of
// Home.vue, which used to own it alone, once it became "always visible"
// rather than home-only. On /about this still shows keywords for now; the
// content there is expected to switch to the team instead later.
const categories = await useKeywordsPanelCategories()

// Warm the team panel's data (see useTeamPanelData) so the switch to it
// on /about is immediate. Not awaited.
if (import.meta.client) useTeamPanelData().catch(() => {})

// Panel hand-off with TeamPanel (usePanelMorph): every text's position in
// reading order — each band title, then its rows.
const panelMorph = usePanelMorph('keywords')
const textOrder = computed(() => {
  const order = new Map<string, number>()
  for (const category of categories.value ?? []) {
    order.set(category.id, order.size)
    for (const tag of category.tags) order.set(tag.id, order.size)
  }
  return order
})
onBeforeUnmount(() => {
  panelMorph.save((categories.value ?? []).flatMap((c) => [c.title, ...c.tags.map((t) => t.title)]))
})

// A hovered row's own definition (tag.yml's "Description" field) pops up
// over the row's own unused white space, to the right of its title.
// Mobile has no hover: tapping a row opens its definition inline, right
// under the title, and tapping it again (or another row) closes it.
const hoveredTagId = ref<string | null>(null)
const isMobile = useIsMobile()
function onRowEnter(tag: CategoryWithTags['tags'][number]) {
  if (isMobile.value) return
  const img = tag.image?.[0]
  if (displayMode.value === 'visual' && img) {
    previewImage.value = { url: img.url, alt: img.alt || tag.title, title: tag.title, description: tag.description }
    return
  }
  hoveredTagId.value = tag.id
}
function onRowLeave() {
  if (isMobile.value) return
  hoveredTagId.value = null
  previewImage.value = null
}
function onRowTap(tagId: string) {
  if (isMobile.value) hoveredTagId.value = hoveredTagId.value === tagId ? null : tagId
}

// Splash -> home draw-in (useIntroTransition): every row's rule draws
// itself left to right, top to bottom (rowDelay staggers by position in
// the whole panel), and each category band appears as an outline first,
// then fills in with its color. Labels decipher as their own rule
// reaches them (DecipherText's delay), each word growing from a few
// letters to its full length (`grow`).
const introTransition = useIntroTransition()
const rowIndex = computed(() => {
  const map = new Map<string, number>()
  for (const category of categories.value ?? []) for (const tag of category.tags) map.set(tag.id, map.size)
  return map
})
function rowDelaySeconds(tagId: string) {
  return 0.3 + (rowIndex.value.get(tagId) ?? 0) * 0.03
}
function bandDelaySeconds(categoryIndex: number) {
  return 0.3 + categoryIndex * 0.12
}

// SiteIndexBar's own "Reading mode" toggle — shrinks this panel from
// half the viewport to a quarter; app.vue's own .app-content margin-left
// (the main content area) follows it down to match.
const readingMode = useReadingMode()

// SiteIndexBar's own Index/Visual toggle — Visual expands each row to
// show that tag's own images below its title.
const displayMode = useDisplayMode()

// Visual mode, desktop: hovering a keyword's row opens its first image,
// in full color, at its own size and ratio in the middle of the keywords
// panel (capped to it), with the keyword's definition pinned to its
// top-left corner in place of the usual row popup.
const previewImage = ref<{ url: string, alt: string, title: string, description?: string } | null>(null)
watch(displayMode, () => { previewImage.value = null })

// Set by guide/index.vue on card hover (shared state — this panel is a
// separate, globally-rendered component, not a child of that page).
const highlighted = useHighlightedKeywords()
function isDimmed(tagId: string) {
  return !!highlighted.value && !highlighted.value.includes(tagId)
}
function isRelated(tagId: string) {
  return !!highlighted.value && highlighted.value.includes(tagId)
}
</script>

<template>
  <InfoPanel class="keywords-panel" :class="{ 'is-intro': introTransition }" :reading-mode="readingMode">
    <template v-for="(category, ci) in categories" :key="category.id">
      <h3 :style="{ '--band-delay': `${bandDelaySeconds(ci)}s` }">
        <DecipherText :text="category.title" :delay="introTransition ? Math.round(bandDelaySeconds(ci) * 1000) : 0" :grow="introTransition" :from="panelMorph.fromAt(textOrder.get(category.id) ?? 0)" />
      </h3>
      <ul>
        <li
          v-for="tag in category.tags"
          :key="tag.id"
          :class="{ dimmed: isDimmed(tag.id), related: isRelated(tag.id) }"
          :style="{ '--row-delay': `${rowDelaySeconds(tag.id)}s` }"
          @mouseenter="onRowEnter(tag)"
          @mouseleave="onRowLeave"
          @click="onRowTap(tag.id)"
        >
          <div class="keywords-panel-row">
            <!-- Hover (tap on mobile) only — definition popup below, not a link. -->
            <span class="keywords-panel-label"><DecipherText :text="tag.title" :delay="introTransition ? Math.round((rowDelaySeconds(tag.id) + 0.2) * 1000) : 0" :grow="introTransition" :from="panelMorph.fromAt(textOrder.get(tag.id) ?? 0)" /></span>
          </div>
          <div class="keywords-panel-images-outer" :class="{ expanded: displayMode === 'visual' }">
            <div class="keywords-panel-images">
              <img v-for="(img, i) in tag.image" :key="i" :src="img.url" :alt="img.alt || tag.title">
            </div>
          </div>
          <div v-if="hoveredTagId === tag.id && tag.description" class="keywords-panel-popup">
            <div class="keywords-panel-popup-title">{{ tag.title }}</div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="keywords-panel-popup-definition" v-html="tag.description" />
          </div>
        </li>
      </ul>
    </template>
  </InfoPanel>
  <Teleport to="body">
    <div v-if="previewImage" class="keywords-image-preview" :class="{ 'reading-mode': readingMode }" aria-hidden="true">
      <figure class="keywords-image-preview-frame">
        <img :src="previewImage.url" :alt="previewImage.alt" class="no-duotone">
        <figcaption class="keywords-image-preview-label">
          <div class="keywords-panel-popup-title">{{ previewImage.title }}</div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="previewImage.description" class="keywords-panel-popup-definition" v-html="previewImage.description" />
        </figcaption>
      </figure>
    </div>
  </Teleport>
</template>

<style scoped>
/* Shell (fixed position, 50vw<->25vw reading-mode width, scroll) lives in
   InfoPanel.vue now — shared with TeamPanel/CampaignInfoPanel/
   BotTrollCriteriaPanel/SourceDatabasePanel. Only this panel's own header/
   row/popup styling stays here. */

/* 100% of the panel (not a fixed 50vw) — see .keywords-panel's own
   comment on why. border-bottom (not each li's own border-top too) is
   the one stroke separating this header from the first row below it —
   see .keywords-panel li's own comment for why it only draws a bottom
   border, never both. */
.keywords-panel h3 {
  box-sizing: border-box;
  margin: 0;
  height: 30px;
  width: 100%;
  padding-left: 10px;
  background: var(--color-brand-resources);
  color: var(--color-on-fill);
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 12pt;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border-strong);
}

/* Draw-in (script, rowDelay): each band's top and bottom rules trace in
   from the left (::before/::after, standing in for its own border), with
   the label in the band color; then the band fills and the label turns
   on-fill. */
.keywords-panel.is-intro h3 {
  position: relative;
  border-bottom-color: transparent;
  animation: keywords-band-fill 1.4s ease var(--band-delay) both;
}

.keywords-panel.is-intro h3::before,
.keywords-panel.is-intro h3::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--color-brand-resources);
  transform-origin: left;
  animation: keywords-rule-draw 0.7s cubic-bezier(0.45, 0, 0.25, 1) var(--band-delay) both;
}

.keywords-panel.is-intro h3::before {
  top: 0;
}

.keywords-panel.is-intro h3::after {
  bottom: -1px;
}

@keyframes keywords-band-fill {
  0%,
  50% {
    background-color: transparent;
    color: var(--color-brand-resources);
  }

  100% {
    background-color: var(--color-brand-resources);
    color: var(--color-on-fill);
  }
}

/* Each row's own rule is hidden and redrawn by ::after, growing from the
   left — same spot as the border it stands in for. */
.keywords-panel.is-intro li {
  border-bottom-color: transparent;
}

.keywords-panel.is-intro li::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: var(--color-border-strong);
  transform-origin: left;
  animation: keywords-rule-draw 0.7s cubic-bezier(0.45, 0, 0.25, 1) var(--row-delay) both;
}

@keyframes keywords-rule-draw {
  from {
    transform: scaleX(0);
  }
}

.keywords-panel ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* border-bottom only, not border-top too — two adjacent rows would
   otherwise each draw their own line on the same shared edge (this row's
   border-bottom + the next row's border-top), doubling it. One row's own
   border-bottom is the only stroke needed between it and whatever follows
   (the next row, or h3.keywords-panel's own border-bottom closes the top
   of the first row in each category). */
/* min-height, not height — a long label (some of the Questions ones)
   wraps to 2 lines once reading mode narrows this panel to 25vw, or
   visual mode adds an image strip below the title — a fixed 26px would
   clip either into the row below instead of letting the row grow to fit.
   flex-direction:column (not just flex) is what stacks that image strip
   under .keywords-panel-row rather than beside it. */
.keywords-panel li {
  position: relative;
  box-sizing: border-box;
  min-height: 26px;
  width: 100%;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-strong);
  transition: background-color 0.15s ease, opacity 0.15s ease;
  display: flex;
  flex-direction: column;
}

/* The title's own line — flex+align-items:center here (not on the li
   itself) keeps it vertically centered within its own 26px regardless of
   whatever follows below it in visual mode. */
.keywords-panel-row {
  display: flex;
  align-items: center;
  min-height: 26px;
}

/* grid-template-rows 0fr -> 1fr, not height:auto <-> 0 — CSS can't
   transition to/from "auto", but it can transition a grid track's own
   fraction smoothly, which has the same visual effect (the row growing
   to fit its own content, or collapsing back to nothing) without
   measuring anything in JS. Always rendered (not v-if) is what makes
   that transition actually play — an element that's added/removed from
   the DOM has no "from" state to animate out of. min-height:0 on the
   inner .keywords-panel-images is required too: grid items default to
   min-height:auto (their own content size), which would stop the track
   from ever reaching 0fr. */
.keywords-panel-images-outer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.6s ease;
}

.keywords-panel-images-outer.expanded {
  grid-template-rows: 1fr;
}

/* padding is only horizontal here — box-sizing:border-box (main.css'
   global reset) means an element can never shrink its rendered height
   below its own padding-top + padding-bottom, so a bottom padding here
   would keep this at 8px tall even at grid-template-rows:0fr, leaking a
   same-size sliver of every image through. Vertical spacing (below) is a
   child's own margin instead — that's "free" space, not part of this
   element's own box, so it collapses away cleanly with the rest of the
   content when the row goes to 0fr. */
.keywords-panel-images {
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 10px;
}

/* object-fit:cover so a non-matching source aspect ratio still fills
   this height cleanly; width:auto lets each keep its own aspect ratio
   rather than being squashed square. Default (no .no-duotone) keeps the
   site-wide duotone filter (main.css). margin-bottom (not the parent's
   own padding-bottom) is this row's bottom spacing — see
   .keywords-panel-images's own comment on why. */
.keywords-panel-images img {
  height: 6vh;
  width: auto;
  object-fit: cover;
  display: block;
  margin-bottom: 8px;
}

/* Thumbnails keep the gray duotone on hover too (main.css drops it on
   any hovered img) — the enlarged copy below stays gray as well. */
.keywords-panel-images img:hover {
  filter: url(#duotone-silver);
}

:root[data-theme='dark'] .keywords-panel-images img:hover {
  filter: url(#duotone-dark);
}

/* Centered over the keywords panel itself (same box: under the nav and
   index bar, above the footer, 50vw or 25vw wide in reading mode), never
   catching the pointer, so the row underneath keeps its hover. The image
   shows at its own pixel size, only scaled down (ratio kept) to fit
   within 90% of the panel's width and 56% of the viewport's height. */
.keywords-image-preview {
  position: fixed;
  top: 8.5vh;
  bottom: var(--footer-height);
  left: 0;
  width: 50vw;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.keywords-image-preview.reading-mode {
  width: 25vw;
}

.keywords-image-preview-frame {
  position: relative;
  margin: 0;
  max-width: 90%;
  display: flex;
}

.keywords-image-preview-frame img {
  display: block;
  max-width: 100%;
  max-height: 56vh;
  width: auto;
  height: auto;
  object-fit: contain;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
}

/* The keyword's definition, in the row popup's own box (below), pinned
   to the image's top-left corner. */
.keywords-image-preview-label {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  width: min(300px, 70%);
  padding: 8px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-brand);
  color: var(--color-brand);
  font-family: Arial, Helvetica, sans-serif;
}

/* Floats over the row's own unused white space, half the row's own width
   and centered in it — left:25%/width:50% (not fixed vw values) is what
   keeps it "half the panel, centered" regardless of the panel's current
   width (50vw normally, 25vw in reading mode — KeywordsPanel.vue), since
   the li itself is already sized as 100% of that. Taller than the 26px
   row itself (definitions don't fit on one line), so it overlaps rows
   below; z-index + its own opaque background/stroke/shadow is what keeps
   that legible rather than blending into them. */
.keywords-panel-popup {
  position: absolute;
  /* -1px, not 0 — `top` on an absolutely positioned element is measured
     from the li's padding edge, which sits 1px inside its own border-top
     (the row's divider line). This is what makes the popup's own top
     edge land exactly on that line instead of 1px below it. */
  top: -1px;
  left: 25%;
  width: 50%;
  z-index: 3;
  box-sizing: border-box;
  padding: 8px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-brand);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  color: var(--color-brand);
  font-family: Arial, Helvetica, sans-serif;
}

.keywords-panel-popup-title {
  margin-bottom: 4px;
  font-size: 12pt;
  font-weight: 700;
}

.keywords-panel-popup-definition {
  font-size: 12pt;
  line-height: 1.4;
}

.keywords-panel-popup-definition :deep(p) {
  margin: 0;
}

/* B8A084 at 40% opacity — same treatment :hover already used, now also
   driven by a hovered guide card (.related, script) rather than only a
   direct mouseover on the row itself. */
.keywords-panel li:hover,
.keywords-panel li.related {
  background-color: var(--color-hover-tint);
}

/* Everything NOT related to whichever card is currently hovered. */
.keywords-panel li.dimmed {
  opacity: 0.2;
}

/* A row's top stroke is really the row above's own border-bottom (see
   .keywords-panel li) — dimmed along with that row when it isn't
   related, so a highlighted keyword lost its top edge. Redrawn here at
   full strength, over that faded line (top:-1px = exactly on it). */
.keywords-panel li.related::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--color-border-strong);
}

/* width:100% (not height:100%) — the label just fills the row
   horizontally now; the row itself (flex + align-items:center, above)
   handles vertical centering, for a wrapped 2-line label as much as a
   plain 1-line one. */
.keywords-panel-label {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 4px 10px;
  line-height: 1.3;
  font-family: var(--font-mono);
  font-size: 11pt;
  color: var(--color-ink);
  cursor: default;
}

/* Mobile (script, onRowTap): the definition opens inline under the row's
   title instead of floating over the rows below it. */
@media (max-width: 768px) {
  .keywords-panel li {
    cursor: pointer;
  }

  .keywords-panel-label {
    cursor: pointer;
  }

  .keywords-panel-popup {
    position: static;
    width: auto;
    margin: 0 10px 10px;
    box-shadow: none;
  }
}
</style>
