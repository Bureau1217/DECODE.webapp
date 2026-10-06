<script setup lang="ts">
// Decorative intro screen — fails soft (empty state, no thrown error) if
// the CMS call doesn't come back, since this isn't core content.

interface Article {
  title: string
  header_image?: { url: string, alt?: string } | null
  page_image_preview?: { url: string, alt?: string } | null
}

interface SiteInfo {
  title: string
  header_subtitle?: string
  long_description?: string
  sentences?: { sentence: string }[]
}

defineEmits<{ continue: [] }>()

const { data: articles } = await useAsyncData('splash:articles', () =>
  useKqlCollection<Article>({
    query: "site.children.filterBy('intendedTemplate', 'default')",
    select: {
      title: true,
      header_image: { query: 'page.content.header_image.toFile', select: { url: true, alt: true } },
      page_image_preview: { query: 'page.content.page_image_preview.toFile', select: { url: true, alt: true } },
    },
  }),
)

const { data: info } = await useAsyncData('splash:info', () =>
  useKql<SiteInfo | null>({
    query: "site.children.filterBy('intendedTemplate', 'site_infos').first",
    select: {
      title: true,
      header_subtitle: true,
      long_description: true,
      // `true` on a `structure` field returns its raw, unparsed YAML
      // string — `.toStructure` resolves it into actual row objects.
      sentences: 'page.content.sentences.toStructure',
    },
  }),
)
// The CMS `informations` (scrolling ticker) field used to render here too,
// duplicating SiteFooter's hardcoded tagline ("DE.CO.DE is an open
// multimedia guide exploring disinformation") — dropped in favor of the
// footer being the single place that sentence shows.

const images = computed(() =>
  (articles.value ?? [])
    .map(article => article.header_image ?? article.page_image_preview)
    .filter((image): image is { url: string, alt?: string } => Boolean(image))
    .slice(0, 6),
)

// Cell size is recalculated (not a fixed 80px) so the grid — confined to
// the splash section's own height, 4% side margin, 10% top/bottom margin —
// divides into whole cells: a fixed 80px would leave a clipped partial
// cell at the far edge, cutting off its outline. Width and height are fit
// independently (cells can end up slightly rectangular rather than
// perfectly square) so each axis gets a whole number of cells with no
// leftover.
const SQUARE_TARGET = 80
const MARGIN_X_RATIO = 0.04
const MARGIN_Y_RATIO = 0.10

const splashEl = ref<HTMLElement | null>(null)
const gridStyle = ref<Record<string, string>>({})

function computeGrid() {
  if (!splashEl.value) return

  // Measured off the section itself, not window.innerHeight — `.splash`'s
  // height is `100vh - var(--footer-height)`, not the full viewport.
  const { width: boxW, height: boxH } = splashEl.value.getBoundingClientRect()

  const marginX = boxW * MARGIN_X_RATIO
  const marginY = boxH * MARGIN_Y_RATIO
  const usableW = boxW - marginX * 2
  const usableH = boxH - marginY * 2

  const cols = Math.max(1, Math.round(usableW / SQUARE_TARGET))
  const rows = Math.max(1, Math.round(usableH / SQUARE_TARGET))
  const cellWidth = usableW / cols
  const cellHeight = usableH / rows

  gridStyle.value = {
    top: `${marginY}px`,
    bottom: `${marginY}px`,
    left: `${marginX}px`,
    right: `${marginX}px`,
    backgroundSize: `${cellWidth}px ${cellHeight}px`,
  }
}

onMounted(() => {
  computeGrid()
  window.addEventListener('resize', computeGrid)
})

onUnmounted(() => {
  window.removeEventListener('resize', computeGrid)
})
</script>

<template>
  <section ref="splashEl" class="splash">
    <div class="splash-grid" :style="gridStyle" aria-hidden="true" />

    <div v-if="images.length" class="splash-images">
      <img v-for="image in images" :key="image.url" :src="image.url" :alt="image.alt || ''">
    </div>

    <div class="splash-info">
      <h1>{{ info?.title }}</h1>
      <ul v-if="info?.sentences?.length">
        <li v-for="(item, index) in info.sentences" :key="index">{{ item.sentence }}</li>
      </ul>
      <p v-if="info?.header_subtitle">{{ info.header_subtitle }}</p>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="info?.long_description" v-html="info.long_description" />

      <button type="button" @click="$emit('continue')">
        Continuer
      </button>
    </div>
  </section>
</template>

<style scoped>
.splash {
  position: relative;
  /* Leaves exactly enough room for SiteFooter.vue below it, so the splash
     + footer together fit one screen with no scrolling. */
  height: calc(100vh - var(--footer-height));
  overflow: hidden;
}

.splash-images,
.splash-info {
  position: relative;
  z-index: 1;
}

/* Black 1px outline per cell — adjacent cells share grid lines, so this
   draws actual outlined cells rather than doubled-up borders. Position and
   background-size come from `gridStyle` (computeGrid), not fixed here.
   The repeating background only draws a line at each tile's *start*
   (left/top), so the closing line at the container's own right/bottom
   edge falls exactly on the boundary and gets clipped — an explicit
   border fills in that last line. */
.splash-grid {
  position: absolute;
  background-image:
    linear-gradient(to right, #000 1px, transparent 1px),
    linear-gradient(to bottom, #000 1px, transparent 1px);
  border-right: 1px solid #000;
  border-bottom: 1px solid #000;
}

.splash-info {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1rem;
}

/* Smaller thumbnails, stacked down the right edge and spread evenly across
   the full splash height so every article image is visible at once,
   rather than one big horizontal row spilling past the viewport. */
.splash-images {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 14vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  padding: 1rem;
}

.splash-images img {
  width: 100%;
  height: 12vh;
  object-fit: cover;
}
</style>
