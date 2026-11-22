<script setup lang="ts">
// A country in white dots (22 Nov 2026), cropped by one of a box's corners:
// the guide's and the tools' cards (GuideCard.vue, ToolCard.vue), and the
// pages they open, in the same corner (TemplateDefault.vue, ToolCover.vue).
// Which one and where: utils/cardCountry.ts; moved from there by its card's
// own shift (CARD_SHAPE_OFFSETS), set by dragging it on a card with ?shapes
// (useCardShapes, CardShapesPanel.vue). Its size: --country-size (a width)
// on the box.
import { cardCountryFor, type CardKind } from '~/utils/cardCountry'

const props = defineProps<{
  kind: CardKind
  index: number
  /** On a card: draggable while the shapes' editor is on. */
  editable?: boolean
}>()

const pick = computed(() => cardCountryFor(props.kind, props.index))
const key = computed(() => `${props.kind}-${props.index}`)
const { offsets, editing, set } = useCardShapes()
const offset = computed(() => offsets.value[key.value] ?? { x: 0, y: 0 })
const canDrag = computed(() => props.editable && editing.value)

// Dragging: the pointer's move in % of the shape's own size; the click that
// ends it kept from opening the card.
const el = ref<SVGSVGElement | null>(null)
function onDown(event: PointerEvent) {
  if (!canDrag.value || !el.value) return
  event.preventDefault()
  event.stopPropagation()
  const box = el.value.getBoundingClientRect()
  const from = { x: event.clientX, y: event.clientY, ox: offset.value.x, oy: offset.value.y }
  const move = (ev: PointerEvent) => set(key.value, from.ox + ((ev.clientX - from.x) / box.width) * 100, from.oy + ((ev.clientY - from.y) / box.height) * 100)
  const up = () => {
    window.removeEventListener('pointermove', move)
    const block = (ev: MouseEvent) => { ev.preventDefault(); ev.stopPropagation() }
    window.addEventListener('click', block, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', block, { capture: true }), 0)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up, { once: true })
}
</script>

<template>
  <svg
    ref="el"
    class="card-country"
    :class="[`is-${pick.corner}`, { 'is-editing': canDrag, 'is-card': editable }]"
    :viewBox="`0 0 ${pick.shape.cols} ${pick.shape.rows}`"
    preserveAspectRatio="xMidYMid meet"
    :style="{ translate: `${offset.x}% ${offset.y}%` }"
    aria-hidden="true"
    @pointerdown="onDown"
  >
    <circle v-for="([x, y], k) in pick.shape.cells" :key="k" :cx="x + 0.5" :cy="y + 0.5" r="0.36" />
  </svg>
</template>

<style scoped>
/* Half out of the box at its corner (the box crops it), under the box's own
   content. */
.card-country {
  position: absolute;
  z-index: 0;
  width: var(--country-size, 62%);
  height: auto;
  aspect-ratio: 1;
  fill: #fff;
  opacity: 0.6;
  pointer-events: none;
}

:root[data-theme='dark'] .card-country {
  opacity: 0.22;
}

/* The shapes' editor (?shapes): over everything, outlined, to be dragged. */
.card-country.is-editing {
  z-index: 5;
  opacity: 0.85;
  outline: 1px dashed #fff;
  cursor: move;
  pointer-events: auto;
  touch-action: none;
}

.card-country.is-tl {
  top: calc(var(--country-size, 62%) * -0.22);
  left: calc(var(--country-size, 62%) * -0.22);
}

.card-country.is-tr {
  top: calc(var(--country-size, 62%) * -0.22);
  right: calc(var(--country-size, 62%) * -0.22);
}

.card-country.is-br {
  bottom: calc(var(--country-size, 62%) * -0.22);
  right: calc(var(--country-size, 62%) * -0.22);
}

.card-country.is-bl {
  bottom: calc(var(--country-size, 62%) * -0.22);
  left: calc(var(--country-size, 62%) * -0.22);
}

/* Mobile (22 Nov 2026): a card's title is at its top, its image under it, the
   width of the card: its shape round the title, in a top corner on its own
   side, without the desktop's shifts (CARD_SHAPE_OFFSETS: another layout). */
@media (max-width: 1150px) {
  .card-country.is-card {
    translate: none !important;
  }

  .card-country.is-card.is-bl {
    bottom: auto;
    top: calc(var(--country-size, 62%) * -0.22);
  }

  .card-country.is-card.is-br {
    bottom: auto;
    top: calc(var(--country-size, 62%) * -0.22);
  }
}
</style>
