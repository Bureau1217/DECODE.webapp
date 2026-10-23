<script setup lang="ts">
import { toolColorFor } from '~/utils/badgeColors'

interface MenuSubItem {
  title: string
  slug: string
  id: string
}

interface AboutTitles {
  paragraph_1_title?: string
  paragraph_2_title?: string
  paragraph_3_title?: string
}

const mobileMenuOpen = useMobileMenuOpen()

// Own cache keys (not 'guide:index'/'page:tools'/'page:about', the keys
// those pages use for their own, much larger selects) — reusing those
// would risk a visitor opening this menu first and caching the smaller
// shape fetched here under that key, leaving the real page permanently
// short of fields it needs once it reads that same cache. Not the
// throw-on-error useKirbyCollection/useKirbyPage wrappers either (fatal if
// the CMS call fails or 404s) — this is decorative nav chrome, not core
// page content, so it fails soft like Splash.vue's own CMS call: a folder
// just shows its tab with no rows instead of taking the whole app down
// with it. No `await` — the overlay renders immediately and these fill in
// once they resolve, since this component isn't a page and has no
// Suspense boundary around it (app.vue).
const { data: guideArticles } = useAsyncData<MenuSubItem[]>('mobile-menu-guide', () =>
  useKqlCollection<MenuSubItem>({
    query: "site.children.filterBy('intendedTemplate', 'default')",
    select: { title: true, slug: true, id: true },
  }),
)

const { data: toolsPage } = useAsyncData<{ tools?: MenuSubItem[] } | null>('mobile-menu-tools', () =>
  useKql<{ tools?: MenuSubItem[] } | null>({
    query: "page('tools')",
    select: { tools: { query: 'page.children', select: { title: true, slug: true, id: true } } },
  }),
)

// The resource themes (Articles/Papers/…) — `ressources` pages at Kirby
// root, served under /resources/<id> (pages/resources/[...slug].vue).
const { data: resourceThemes } = useAsyncData<MenuSubItem[]>('mobile-menu-resources', () =>
  useKqlCollection<MenuSubItem>({
    query: "site.children.filterBy('intendedTemplate', 'ressources')",
    select: { title: true, slug: true, id: true },
  }),
)

const { data: aboutTitles } = useAsyncData<AboutTitles | null>('mobile-menu-about', () =>
  useKql<AboutTitles | null>({
    query: "page('about')",
    select: { paragraph_1_title: true, paragraph_2_title: true, paragraph_3_title: true },
  }),
)

// One folder per top-level section (NAV_LINKS), all open at once.
// Every row is a number and a right-aligned title; Guide/Tools numbers sit
// on a colored square (same colors as their cards). Every row opens its
// section's own main page, not the article/tool/theme itself.
interface FolderRow {
  key: string
  title: string
  to: string
  chip?: string
}

const folders = computed(() =>
  NAV_LINKS.map((link) => {
    let rows: FolderRow[] = []
    if (link.to === '/guide') {
      rows = (guideArticles.value ?? []).slice(0, 3).map((a, i) => ({ key: a.id, title: a.title, to: '/guide', chip: badgeColorFor(i) }))
    } else if (link.to === '/tools') {
      rows = (toolsPage.value?.tools ?? []).slice(0, 3).map((t, i) => ({ key: t.id, title: t.title, to: '/tools', chip: toolColorFor(i) }))
    } else if (link.to === '/resources') {
      rows = (resourceThemes.value ?? []).map((r) => ({ key: r.id, title: r.title, to: '/resources' }))
    } else if (link.to === '/about') {
      const about = aboutTitles.value
      rows = [about?.paragraph_1_title, about?.paragraph_2_title, about?.paragraph_3_title]
        .map((title, i) => ({ key: `about-${i}`, title: title ?? '', to: '/about' }))
        .filter((row) => row.title)
      rows.push({ key: 'about-credits', title: 'Credits', to: '/about' })
    }
    return { ...link, rows }
  }),
)

function close() {
  mobileMenuOpen.value = false
}

// Opened from a tool page, the menu takes that tool's accent in place of
// the brown — same reskin SiteNav/SiteIndexBar/SiteFooter already get.
const { theme } = useToolTheme()

// Each folder's tab is the nav's own tab shape (app/utils/tabPath.ts),
// sized to its label: measured once rendered, and again whenever the
// overlay's width changes (the label font scales with the viewport).
const TAB_HEIGHT = 34
const TAB_PADDING_X = 16
const labelEls = ref<(HTMLElement | null)[]>([])
const tabWidths = ref<number[]>([])
function setLabelRef(el: Element | null, index: number) {
  labelEls.value[index] = el as HTMLElement | null
}
function measureTabs() {
  const slants = TAB_HEIGHT * (TAB_LEFT_DX_RATIO + TAB_RIGHT_DX_RATIO)
  tabWidths.value = labelEls.value.map((el) => (el ? el.offsetWidth + TAB_PADDING_X * 2 + slants : 0))
}

const overlayEl = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  measureTabs()
  document.fonts?.ready?.then(measureTabs)
  resizeObserver = new ResizeObserver(measureTabs)
  if (overlayEl.value) resizeObserver.observe(overlayEl.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div
    ref="overlayEl"
    class="mobile-menu-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Site menu"
    :style="theme ? { '--menu-chrome': theme.chromeAccent, '--menu-folder-alt': `color-mix(in srgb, ${theme.chromeAccent} 55%, var(--color-surface))` } : undefined"
  >
    <nav class="mobile-menu-folders">
      <section
        v-for="(folder, index) in folders"
        :key="folder.to"
        class="mobile-menu-folder"
        :class="index % 2 === 0 ? 'is-tinted' : 'is-plain'"
        :style="{ zIndex: index + 1 }"
      >
        <NuxtLink :to="folder.to" class="mobile-menu-tab" :style="{ width: `${tabWidths[index] ?? 0}px`, height: `${TAB_HEIGHT}px` }" @click="close">
          <svg
            v-if="tabWidths[index]"
            class="mobile-menu-tab-shape"
            :viewBox="`0 0 ${tabWidths[index]} ${TAB_HEIGHT}`"
            :width="tabWidths[index]"
            :height="TAB_HEIGHT"
            aria-hidden="true"
          >
            <path :d="buildTabPath(tabWidths[index]!, TAB_HEIGHT)" />
          </svg>
          <span :ref="(el) => setLabelRef(el as Element | null, index)" class="mobile-menu-tab-label">{{ folder.label }}</span>
        </NuxtLink>

        <div class="mobile-menu-body">
          <ol v-if="folder.rows.length" class="mobile-menu-rows">
            <li v-for="(row, i) in folder.rows" :key="row.key">
              <NuxtLink :to="row.to" class="mobile-menu-row" @click="close">
                <span class="mobile-menu-row-number text-h3" :class="{ 'has-chip': row.chip }" :style="row.chip ? { backgroundColor: row.chip } : undefined">{{ i + 1 }}</span>
                <span class="mobile-menu-row-title text-h3">{{ row.title }}</span>
              </NuxtLink>
            </li>
          </ol>
          <!-- Pixel-dot country shapes, same as the splash/tool cards. -->
          <CountryIcon v-if="folder.to === '/tools'" code="CA" class="mobile-menu-dots mobile-menu-dots--right" />
          <CountryIcon v-if="folder.to === '/about'" code="BR" class="mobile-menu-dots mobile-menu-dots--left" />
        </div>
      </section>
    </nav>
  </div>
</template>

<style scoped>
/* A brown panel (--menu-chrome) from the index bar down to the footer —
   covering the index bar too, so the MENU tab (filled while open,
   SiteNav.vue) flows straight into it — holding the four section folders,
   each one's tab overlapping the bottom of the folder above it. Folders
   alternate tan (--menu-folder-alt) and white. */
.mobile-menu-overlay {
  position: fixed;
  z-index: 3;
  left: 0;
  top: 5vh;
  right: 0;
  bottom: var(--footer-height);
  overflow-y: auto;
  background: var(--menu-chrome, var(--color-chrome));
  box-sizing: border-box;
  padding: 24px 12px 16px;
}

.mobile-menu-folder {
  position: relative;
  --folder-fill: var(--color-surface);
  --folder-text: var(--menu-chrome, var(--color-brand));
}

.mobile-menu-folder.is-tinted {
  --folder-fill: var(--menu-folder-alt, var(--color-brand-resources));
  --folder-text: var(--color-on-fill);
}

/* Each folder's tab rises out of the bottom of the one above it. */
.mobile-menu-folder + .mobile-menu-folder {
  margin-top: -34px;
}

.mobile-menu-tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.mobile-menu-tab-shape {
  position: absolute;
  inset: 0;
  overflow: visible;
}

/* Same fill as its own body; the stroke in that fill too — no seam where
   tab meets body. */
.mobile-menu-tab-shape path {
  fill: var(--folder-fill);
  stroke: var(--folder-fill);
  stroke-width: 1px;
  stroke-linejoin: round;
}

.mobile-menu-tab-label {
  position: relative;
  color: var(--folder-text);
  font-family: var(--font-mono);
  /* Small enough that the longest label (TOOLS AGAINST DISINFORMATION)
     plus its tab's padding and shoulders fits the folder on any phone. */
  font-size: min(3.6vw, 16px);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* Bottom padding = the next folder's tab height plus breathing room, so
   that tab sits on this body's own color without covering any row. */
.mobile-menu-body {
  position: relative;
  overflow: hidden;
  padding: 10px 14px 58px;
  background: var(--folder-fill);
  border-radius: 0 4px 0 0;
}

.mobile-menu-folder:last-child .mobile-menu-body {
  padding-bottom: 40px;
  border-radius: 0 4px 4px 4px;
}

.mobile-menu-rows {
  position: relative;
  z-index: 1;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* min-height, not padding alone — keeps the Guide/Tools rows (number on a
   tighter-leaded square) the same height as the plain ones. */
.mobile-menu-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 32px;
  text-decoration: none;
}

.mobile-menu-row-number {
  flex-shrink: 0;
  width: 1.2em;
  color: var(--folder-text);
}

/* Guide/Tools: the number on its card's color, as a small square. */
.mobile-menu-row-number.has-chip {
  width: 1.1em;
  line-height: 1.1em;
  text-align: center;
  color: var(--color-on-pastel);
}

/* Title pushed to the right edge, the same on every folder. */
.mobile-menu-row-title {
  margin-left: auto;
  min-width: 0;
  color: var(--folder-text);
  font-style: italic;
  text-align: right;
}

/* Two classes deep — CountryIcon.vue's own background-color has the same
   single-class specificity otherwise, leaving the winner to load order. */
.mobile-menu-body .mobile-menu-dots {
  position: absolute;
  z-index: 0;
  width: 46%;
  aspect-ratio: 1.6;
  background-color: var(--color-brand-resources);
  opacity: 0.7;
  pointer-events: none;
}

.mobile-menu-dots--right {
  right: -6%;
  bottom: -14%;
}

.mobile-menu-dots--left {
  left: -8%;
  bottom: -18%;
}

/* Belt-and-braces — the MENU tab that opens this is itself display:none
   above 768px (SiteNav.vue), so mobileMenuOpen can't normally go true on
   desktop, but this keeps a stray resize/devtools toggle from leaving a
   full-width overlay stuck over the desktop split-pane layout. */
@media (min-width: 769px) {
  .mobile-menu-overlay {
    display: none;
  }
}
</style>
