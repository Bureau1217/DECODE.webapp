<script setup lang="ts">
import type { ComputedRef } from 'vue'

interface MenuSubItem {
  title: string
  slug: string
  id: string
}

const mobileMenuOpen = useMobileMenuOpen()

// Own cache keys (not 'guide:index'/'page:tools', the keys guide/index.vue
// and tools/index.vue use for their own, much larger selects) — reusing
// those would risk a visitor opening this menu first and caching the
// smaller shape fetched here under that key, leaving the real page
// permanently short of fields it needs once it reads that same cache.
// Not the throw-on-error useKirbyCollection/useKirbyPage wrappers either
// (fatal if the CMS call fails or 404s) — this is decorative nav chrome,
// not core page content, so it fails soft like Splash.vue's own CMS call:
// Guide/Tools just show their header link with no sub-items instead of
// taking the whole app down with them. No `await` — the overlay renders
// immediately and these fill in once they resolve, since this component
// isn't a page and has no Suspense boundary around it (app.vue).
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

const guideItems = computed(() => guideArticles.value?.slice(0, 3) ?? [])
const toolItems = computed(() => toolsPage.value?.tools?.slice(0, 3) ?? [])

// Guide links by id (nestable `default` pages — same reasoning
// guide/index.vue's own GuideCard links use); Tools by slug (flat `tool`
// pages, same as ToolCard.vue).
const SECTION_ITEMS: Record<string, { items: ComputedRef<MenuSubItem[]>, hrefFor: (item: MenuSubItem) => string }> = {
  '/guide': { items: guideItems, hrefFor: (item) => `/guide/${item.id}` },
  '/tools': { items: toolItems, hrefFor: (item) => `/tools/${item.slug}` },
}

function close() {
  mobileMenuOpen.value = false
}
</script>

<template>
  <div class="mobile-menu-overlay" role="dialog" aria-modal="true" aria-label="Site menu">
    <button type="button" class="mobile-menu-close" aria-label="Close menu" @click="close">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
        <line x1="22" y1="2" x2="2" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
      </svg>
    </button>

    <nav class="mobile-menu-list">
      <div v-for="link in NAV_LINKS" :key="link.to" class="mobile-menu-section">
        <NuxtLink :to="link.to" class="mobile-menu-section-header" @click="close">{{ link.label }}</NuxtLink>

        <ol v-if="SECTION_ITEMS[link.to]?.items.value.length" class="mobile-menu-section-items">
          <li v-for="(item, index) in SECTION_ITEMS[link.to]!.items.value" :key="item.id">
            <NuxtLink :to="SECTION_ITEMS[link.to]!.hrefFor(item)" class="mobile-menu-item" @click="close">
              <span class="mobile-menu-item-number">{{ index + 1 }}</span>
              <span class="mobile-menu-item-title" :style="{ backgroundColor: badgeColorFor(index) }">
                {{ item.title }}
              </span>
            </NuxtLink>
          </li>
        </ol>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.mobile-menu-overlay {
  position: fixed;
  z-index: 3;
  left: 0;
  top: 8.5vh;
  right: 0;
  bottom: var(--footer-height);
  overflow-y: auto;
  background: var(--color-brand);
  box-sizing: border-box;
}

.mobile-menu-close {
  position: sticky;
  top: 0;
  z-index: 1;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  appearance: none;
  border: none;
  background: var(--color-brand);
  color: var(--color-surface);
  cursor: pointer;
}

.mobile-menu-section + .mobile-menu-section {
  margin-top: 1px;
}

.mobile-menu-section-header {
  display: block;
  box-sizing: border-box;
  padding: 14px 16px;
  background: var(--color-brand);
  color: var(--color-surface);
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 13pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.35);
}

.mobile-menu-section-items {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--color-surface);
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  box-sizing: border-box;
  padding: 14px 16px;
  text-decoration: none;
  border-bottom: 1px solid var(--color-border);
}

.mobile-menu-item-number {
  flex-shrink: 0;
  color: var(--color-text-soft);
  font-family: var(--font-mono);
  font-size: 11pt;
}

.mobile-menu-item-title {
  padding: 1px 4px;
  color: var(--color-ink);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 13pt;
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
