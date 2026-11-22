<script setup lang="ts">
// The guide's and the tools' dotted countries' editor (?shapes, 22 Nov 2026):
// while it's on, each card's shape can be dragged (CardCountry.vue); this
// panel copies their shifts as CARD_SHAPE_OFFSETS (utils/cardCountry.ts),
// resets them, or ends the editing. Mounted by app.vue.
const { offsets, editing, reset, stop, code } = useCardShapes()
const copied = ref(false)
async function copy() {
  const text = code()
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }
  catch { console.info(text) }
}
const moved = computed(() => Object.entries(offsets.value).filter(([, o]) => o.x || o.y))
</script>

<template>
  <aside v-if="editing" class="card-shapes-panel">
    <strong>Formes des cartes</strong>
    <p>Glisser la forme d'une carte (guide, outils) pour la déplacer. Elle reste à cette place sur la page qu'elle ouvre.</p>
    <ul>
      <li v-for="[key, o] in moved" :key="key">{{ key }} : x {{ o.x }} %, y {{ o.y }} %</li>
    </ul>
    <div class="card-shapes-panel-row">
      <button type="button" @click="copy">{{ copied ? 'Copié ✓' : 'Copier le code' }}</button>
      <button type="button" @click="reset">Réinitialiser</button>
      <button type="button" @click="stop">Terminer</button>
    </div>
  </aside>
</template>

<style scoped>
.card-shapes-panel {
  position: fixed;
  right: 16px;
  bottom: calc(var(--footer-height, 36px) + 16px);
  z-index: 2000;
  width: 280px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-ink);
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.4;
}

.card-shapes-panel p,
.card-shapes-panel ul {
  margin: 6px 0;
  padding: 0;
  list-style: none;
}

.card-shapes-panel-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card-shapes-panel button {
  padding: 3px 8px;
  border: 1px solid var(--color-ink);
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
</style>
