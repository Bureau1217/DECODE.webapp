<script setup lang="ts">
interface Article {
  title: string
  slug: string
  id: string
  header_subtitle?: string
  header_image?: { url: string, alt?: string } | null
}

const articles = await useKirbyCollection<Article>(
  'guide:index',
  "site.children.filterBy('intendedTemplate', 'default')",
  {
    title: true,
    slug: true,
    id: true,
    header_subtitle: true,
    header_image: {
      query: 'page.header_image.toFile',
      select: { url: true, alt: true },
    },
  },
)

// Same three colors as the splash screen's corner badges (Splash.vue,
// BADGE_COLORS) — cycling the same way, so an article's secondary-title
// chip here lands on the same color as its own badge there.
const BADGE_COLORS = ['#FC7C6A', '#B4EAE1', '#CDB4EA']
function badgeColor(index: number) {
  return BADGE_COLORS[index % BADGE_COLORS.length]
}
</script>

<template>
  <!-- 4 fixed quadrants, not one per article — a 5th article has nowhere
       to go yet (not asked for: pagination, or more than 4 cards). The
       white cross dividing them is the grid's own 1px gap showing through
       its white background, not separately positioned lines — that's what
       guarantees the vertical one lands exactly on the grid's own
       horizontal center and the horizontal one spans only this grid's own
       width, never the keywords panel beside it. -->
  <article class="guide-grid">
    <NuxtLink
      v-for="(item, index) in articles.slice(0, 4)"
      :key="item.id"
      :to="`/guide/${item.id}`"
      class="guide-card"
    >
      <span class="guide-card-number">{{ index + 1 }}</span>
      <span v-if="item.header_subtitle" class="guide-card-subtitle" :style="{ backgroundColor: badgeColor(index) }">
        {{ item.header_subtitle }}
      </span>
      <div class="guide-card-image-wrap">
        <img v-if="item.header_image" :src="item.header_image.url" :alt="item.header_image.alt || item.title">
      </div>
      <h2 class="guide-card-title">{{ item.title }}</h2>
    </NuxtLink>
  </article>
</template>

<style scoped>
.guide-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1px;
  background: #fff;
  /* Fills exactly the space between SiteNav/SiteIndexBar (8.5vh, top) and
     SiteFooter (var(--footer-height), bottom) — both fixed. Leaving the
     footer's own height out (as an earlier version did) let the bottom
     row's cards extend behind the fixed, opaque footer, permanently
     hiding whatever fell in that strip (e.g. the 4th card's own title)
     with no way to scroll it into view, unlike the keywords panel beside
     it, which actually can scroll behind the footer by design. */
  height: calc(100vh - 8.5vh - var(--footer-height));
}

.guide-card {
  background: #b8a084;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  /* Centers the number + subtitle chip (both shrink-to-fit width) and the
     image (see below) horizontally, without needing their own margin:auto. */
  align-items: center;
  box-sizing: border-box;
  /* 10% frames the image on its 3 free sides; the 4th (bottom) is
     exactly 10px so the title — the flex column's last item — lands
     exactly 10px off the card's own bottom edge, not a percentage of it. */
  padding: 5% 5% 5px;
  overflow: hidden;
}

.guide-card-number {
  color: #fff;
  font-family: 'EB Garamond', Garamond, serif;
  font-size: 28px;
  line-height: 1;
}

.guide-card-image-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* aspect-ratio (not the wrapper's own box) is what guarantees the
   "vertical" portrait look regardless of the quadrant's own raw
   proportions — max-width/height:100% then fits it to whichever axis
   the flex-available space constrains first. */
/* height:100% (not max-height) is what reliably fills the flex-sized
   wrapper — max-height left the image sizing itself off its own intrinsic
   dimensions first in some cases, growing taller than the card actually
   had room for and pushing the title below the card's own visible/clipped
   bounds. width:auto + aspect-ratio derives the portrait width from that
   resolved height; max-width is just a safety cap for an unusually
   short/wide card. */
.guide-card-image-wrap img {
  height: 100%;
  width: 80%;
  max-width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  display: block;
}

/* display:inline-block (not the earlier position:absolute) is what makes
   this genuinely shrink-to-fit around the text — an absolutely positioned
   block with only `left` set computes its width via shrink-to-fit too,
   but for wrapping text that algorithm tends to land close to the
   available width rather than the text's own rendered width, which read
   as "loose" rather than tight. */
.guide-card-subtitle {
  display: inline-block;
  margin: 6px 0;
  padding: 1px;
  color: #000;
  text-align: center;
  font-family: 'EB Garamond', Garamond, serif;
  font-style: italic;
  font-weight: 400;
  font-size: 12pt;
}

.guide-card-title {
  font-size: 24pt;
  margin: 10px 0 0;
  text-align: center;
  color: #fff;
  font-family: 'EB Garamond', Garamond, serif;
  font-weight: 500;
}
</style>
