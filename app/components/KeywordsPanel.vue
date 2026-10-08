<script setup lang="ts">
// Mirrors the CMS's own "Mot-clés" Panel section (site/blueprints/site.yml):
// every root page using the `tags` template, each with its tag children —
// not a fixed list of category names, so a new category added in the CMS
// shows up here with no webapp changes.
//
// Shared across every page that shows this panel (app.vue) — pulled out of
// Home.vue, which used to own it alone, once it became "always visible"
// rather than home-only. On /about this still shows keywords for now; the
// content there is expected to switch to the team instead later.
interface CategoryWithTags {
  title: string
  slug: string
  id: string
  tags: {
    title: string
    slug: string
    id: string
    description?: string
    image?: { url: string, alt?: string }[]
  }[]
}

const categories = await useKirbyCollection<CategoryWithTags>(
  'keywords-panel',
  "site.children.filterBy('intendedTemplate', 'tags')",
  {
    title: true,
    slug: true,
    id: true,
    tags: {
      query: 'page.children',
      select: {
        title: true,
        slug: true,
        id: true,
        description: true,
        // tag.yml's own "Image" field (multiple) — shown below the title
        // in visual mode (SiteIndexBar's Index/Visual toggle) only.
        image: {
          query: 'page.content.image.toFiles',
          select: { url: true, alt: true },
        },
      },
    },
  },
)

// A hovered row's own definition (tag.yml's "Description" field) pops up
// over the row's own unused white space, to the right of its title.
const hoveredTagId = ref<string | null>(null)

// SiteIndexBar's own "Reading mode" toggle — shrinks this panel from
// half the viewport to a quarter; app.vue's own .app-content margin-left
// (the main content area) follows it down to match.
const readingMode = useReadingMode()

// SiteIndexBar's own Index/Visual toggle — Visual expands each row to
// show that tag's own images below its title.
const displayMode = useDisplayMode()

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
  <aside class="keywords-panel" :class="{ 'reading-mode': readingMode }">
    <template v-for="category in categories" :key="category.id">
      <h3>{{ category.title }}</h3>
      <ul>
        <li
          v-for="tag in category.tags"
          :key="tag.id"
          :class="{ dimmed: isDimmed(tag.id), related: isRelated(tag.id) }"
          @mouseenter="hoveredTagId = tag.id"
          @mouseleave="hoveredTagId = null"
        >
          <div class="keywords-panel-row">
            <NuxtLink :to="`/keywords/${category.slug}/${tag.slug}`">{{ tag.title }}</NuxtLink>
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
  </aside>
</template>

<style scoped>
/* Fixed, not in normal page flow — this is what makes it "always visible"
   independent of whatever each page's own content does. top: 8.5vh clears
   SiteNav + SiteIndexBar (1.5vh + 3.5vh + 3.5vh, both always rendered on
   every route this panel shows on — was 5vh, clearing only the nav, which
   left the first category hidden behind the (higher z-index) index bar).
   bottom: 0, not var(--footer-height) — same reasoning as .app-content
   (app.vue): this scrolls internally, and a long list runs behind the
   footer rather than being stopped short above it, with the footer's own
   opaque background + higher z-index covering it there. */
.keywords-panel {
  position: fixed;
  z-index: 1;
  left: 0;
  top: 8.5vh;
  bottom: 0;
  width: 50vw;
  overflow-y: auto;
  /* The smooth resize reading mode asks for — h3/li below are sized as
     100% of this, not their own fixed vw value, so they (and every row's
     own border-bottom "trim" with them) resize in lockstep each frame of
     this transition rather than needing their own separate one. */
  transition: width 0.5s ease;
}

.keywords-panel.reading-mode {
  width: 25vw;
}

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
  background: #b8a084;
  color: #fff;
  font-family: 'Martian Mono', monospace;
  font-weight: 500;
  font-size: 12pt;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.3);
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
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.3);
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
  background: #fff;
  border: 1px solid #a68764;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  color: #a68764;
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
  background-color: rgba(184, 160, 132, 0.4);
}

/* Everything NOT related to whichever card is currently hovered. */
.keywords-panel li.dimmed {
  opacity: 0.2;
}

/* width:100% (not height:100%) — the link just fills the row
   horizontally now; the row itself (flex + align-items:center, above)
   handles vertical centering, for a wrapped 2-line label as much as a
   plain 1-line one. */
.keywords-panel li a {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 4px 10px;
  line-height: 1.3;
  font-family: 'Martian Mono', monospace;
  font-size: 11pt;
  color: #3b382f;
  text-decoration: none;
}
</style>
