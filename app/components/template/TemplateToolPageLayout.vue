<script setup lang="ts">
import { decipherIn } from '~/utils/decipher'
// Shared layout for the 3 custom tool pages (TemplateCampaignsMap.vue,
// TemplateBotTrollDetector.vue, TemplateSourceReliability.vue): a fixed
// left panel (InfoPanel-based — passed in via the `panel` slot) and an
// offset right content column reacting to the same readingMode state,
// both kept at the exact formula used throughout the site (SiteNav +
// SiteIndexBar = 8.5vh, SiteFooter = var(--footer-height)).
// `scrollable` (default true) gives the content column `min-height` +
// `overflow-y: auto`, like BotTrollAccountPanel/SourcePluginInfoPanel's
// own prose content. TemplateCampaignsMap.vue passes `:scrollable="false"`
// instead — DisinfoMap needs to exactly fill a fixed `height`, not scroll
// past it (a map has no "more content below the fold" to reveal).
// `exit` is the top-right close cross (ToolExitButton.vue) every tool
// page gets, in that tool's own colors. `intro` (optional) is the
// entrance state until Start: ToolIntro.vue in the left panel's place,
// a Start button (filled with `start`) in the content column's — or,
// with `cover: true`, the tool's own `panel` slot stays on the left with
// its entries emptied (slot prop `empty`), and the content column shows
// ToolCover.vue (a resource-page-style screen filled with `cover`, the
// tool's own fill color).
// Start fills the entries in.
const props = withDefaults(defineProps<{
  readingMode?: boolean
  scrollable?: boolean
  exit: { accent: string, textColor?: string }
  intro?: { title: string, description?: string, credits?: string, band: string, bandText: string, start: string, cover?: string, build?: 'wipe' | 'fade' } | null
}>(), {
  readingMode: false,
  scrollable: true,
  intro: null,
})

// Per visit, not remembered — arriving at the tool again shows the
// entrance screen again.
const started = ref(!props.intro)

// Same mobile INDEX/content swap as app.vue's own .app-content/InfoPanel
// pair — this layout reimplements that identical 50vw-panel/offset-
// content split independently (see the file-top comment), so it needs
// the same mobile override independently too.
const mobileIndexOpen = useMobileIndexOpen()

// Start: the cover fades out over the content, which builds itself in
// underneath (`build`: a wipe down, or a plain fade for the map), while
// the left panel's now-filled rows decipher. Arriving on the tool does
// the same to the panel's entrance state. Either way each word grows
// out of a single letter, and only the rows on screen run it — the rest
// of a long list never shows the effect anyway.
const emit = defineEmits<{ start: [] }>()
const root = ref<HTMLElement | null>(null)
let stopDecipher: (() => void)[] = []
function decipherPanel() {
  stopDecipher.forEach((stop) => stop())
  const panel = root.value?.querySelector<HTMLElement>(':scope > .info-panel')
  if (!panel) return
  stopDecipher = [...panel.querySelectorAll<HTMLElement>('h3, li, .src-row')]
    .filter((el) => el.getBoundingClientRect().top < window.innerHeight)
    .map((el) => decipherIn(el, { grow: true, growMax: 1 }))
}
async function start() {
  started.value = true
  emit('start')
  await nextTick()
  decipherPanel()
}
// Exit cross: text scrambles out, then the content column shrinks back
// into this tool's card on /tools (useToolCloseTransition).
const route = useRoute()
const { close, style: closeStyle } = useToolCloseTransition(() => String(route.params.tool), () => root.value)

// Nuxt mounts a new page off-screen (detached) before swapping it in:
// wait until it's actually in the document.
let waitFrame = 0
onMounted(() => {
  const wait = () => {
    if (root.value?.isConnected) decipherPanel()
    else waitFrame = requestAnimationFrame(wait)
  }
  wait()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(waitFrame)
  stopDecipher.forEach((stop) => stop())
})
</script>

<template>
  <div ref="root" class="tool-page">
    <!-- Cover intros keep the tool's own panel mounted throughout: it shows
         its entries emptied ("-") until Start, then fills them in. -->
    <ToolIntro
      v-if="intro && !intro.cover && !started"
      :title="intro.title"
      :description="intro.description"
      :credits="intro.credits"
      :band="intro.band"
      :band-text="intro.bandText"
    />
    <slot v-else name="panel" :empty="!started" />

    <div
      v-if="intro && !started && !intro.cover"
      class="tool-page-content tool-page-start"
      :class="{ 'reading-mode': readingMode, 'mobile-index-open': mobileIndexOpen }"
    >
      <button type="button" class="tool-page-start-btn btn-fill text-label" :style="{ '--btn-fill': intro.start }" @click="start">
        Start
      </button>
    </div>
    <div
      v-else
      class="tool-page-content"
      :class="{ 'reading-mode': readingMode, scrollable: scrollable || !started, 'mobile-index-open': mobileIndexOpen }"
      :style="closeStyle"
    >
      <div
        v-if="started"
        class="tool-page-build"
        :class="intro ? `is-${intro.build ?? 'wipe'}` : null"
      >
        <slot name="content" />
      </div>
      <Transition name="tool-cover-out">
        <div v-if="intro?.cover && !started" class="tool-page-cover">
          <ToolCover
            :title="intro.title"
            :description="intro.description"
            :credits="intro.credits"
            :fill="intro.cover"
            @start="start"
          />
        </div>
      </Transition>
    </div>
    <!-- Outside .tool-page-content on purpose: that column is transformed
         on mobile (its INDEX slide), which would make it the containing
         block for this fixed button instead of the viewport. -->
    <ToolExitButton class="tool-page-exit" :accent="exit.accent" :text-color="exit.textColor" @click.capture="close" />
  </div>
</template>

<style scoped>
.tool-page {
  position: relative;
}

.tool-page-content {
  /* Holds the fading cover (.tool-page-cover) over the content. */
  position: relative;
  margin-left: 50vw;
  transition: margin-left 0.5s ease;
}

.tool-page-content.reading-mode {
  margin-left: 25vw;
}

/* Exactly the room between the index bar and the footer either way; a
   scrollable column scrolls inside it (its own scroller, so content can
   stick to its bottom edge — the extension's download bar). */
.tool-page-content {
  height: calc(100vh - 8.5vh - var(--footer-height));
}

.tool-page-content.scrollable {
  overflow-y: auto;
}

/* At least the column's height (as tall as its content when scrolling);
   the map (not scrollable) fills it exactly. */
.tool-page-build {
  min-height: 100%;
}

.tool-page-content:not(.scrollable) .tool-page-build {
  height: 100%;
}

/* Start: the content builds itself in as the cover fades off it — a
   wipe from the top for the panels, a plain fade for the map. */
.tool-page-build.is-wipe {
  animation: tool-page-wipe 0.9s cubic-bezier(0.45, 0, 0.2, 1) 0.15s both;
}

.tool-page-build.is-fade {
  animation: tool-page-fade 0.8s ease 0.2s both;
}

@keyframes tool-page-wipe {
  from {
    clip-path: inset(0 0 100% 0);
  }

  to {
    clip-path: inset(0 0 0 0);
  }
}

@keyframes tool-page-fade {
  from {
    opacity: 0;
  }
}

.tool-page-cover {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.tool-cover-out-leave-active {
  transition: opacity 0.6s ease;
}

.tool-cover-out-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .tool-page-build.is-wipe,
  .tool-page-build.is-fade {
    animation: none;
  }
}

/* Entrance state's right column — just the Start button, centered.
   Same shape as Splash.vue's own CTA; fill/hover from .btn-fill. */
.tool-page-start {
  height: calc(100vh - 8.5vh - var(--footer-height));
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-page-start-btn {
  appearance: none;
  border-radius: 0;
  padding: 18px 48px;
  cursor: pointer;
}

/* Viewport's top-right corner, just under SiteNav + SiteIndexBar (8.5vh)
   — same spot whether the content column scrolls or not, and above
   DisinfoMap.vue's own overlays (z-index 2). */
.tool-page-exit {
  position: fixed;
  top: calc(8.5vh + 14px);
  right: 14px;
  z-index: 3;
}

/* No side-by-side split below 768px — same reasoning as app.vue's own
   .app-content mobile override: the panel slot (InfoPanel.vue-based,
   same mobile media query) takes the full screen instead of a 50vw/25vw
   slice beside this, and the two slide vertically past each other (a
   visible scroll/slide, not an instant display swap) when the same
   mobile-index-open state toggles. */
@media (max-width: 768px) {
  .tool-page-content,
  .tool-page-content.reading-mode {
    margin-left: 0;
    position: fixed;
    top: 8.5vh;
    bottom: var(--footer-height);
    left: 0;
    width: 100%;
    transform: translateY(0);
    transition: transform 0.4s ease;
  }

  .tool-page-content.scrollable {
    min-height: 0;
    height: auto;
    overflow-x: hidden;
  }

  .tool-page-content:not(.scrollable) {
    height: auto;
  }

  .tool-page-content.mobile-index-open {
    transform: translateY(-100%);
    pointer-events: none;
  }
}
</style>
