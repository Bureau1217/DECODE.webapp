<script setup lang="ts">
import { decipher, morph } from '~/utils/decipher'

// A title that deciphers itself in place (app/utils/decipher.ts) on
// mount and whenever its text changes. Screen readers get the plain
// string; the per-character spans are hidden from them.
const props = withDefaults(defineProps<{
  text: string
  // ms before the first run starts (the splash -> home nav tabs wait for
  // their outline to finish drawing). Hidden until then.
  delay?: number
  // Start from a few letters and widen to the full text while
  // deciphering (app/utils/decipher.ts, `grow`), from at most `growMax`
  // letters per word.
  grow?: boolean
  growMax?: number
  // Morph out of this text instead of deciphering (the panel hand-off,
  // usePanelMorph) — first run only.
  from?: string
}>(), {
  delay: 0,
  grow: false,
  growMax: 3,
  from: undefined,
})

const words = computed(() => props.text.split(/(\s+)/).map((part) => ({
  space: /^\s+$/.test(part),
  part,
  chars: [...part],
})))

const root = ref<HTMLElement | null>(null)
let stop = () => {}
const waiting = ref(props.delay > 0)
let delayTimer: ReturnType<typeof setTimeout> | undefined
let firstRun = true
function run() {
  stop()
  if (!root.value) return
  stop = firstRun && props.from !== undefined ? morph(root.value, props.from) : decipher(root.value, { grow: props.grow, growMax: props.growMax })
  firstRun = false
}
onMounted(() => {
  if (!props.delay) return run()
  delayTimer = setTimeout(() => {
    waiting.value = false
    nextTick(run)
  }, props.delay)
})
watch(() => props.text, run, { flush: 'post' })
onBeforeUnmount(() => {
  clearTimeout(delayTimer)
  stop()
})
</script>

<template>
  <span ref="root" class="decipher-text" :style="waiting ? { visibility: 'hidden' } : undefined">
    <span class="decipher-sr">{{ text }}</span>
    <span :key="text" aria-hidden="true">
      <template v-for="(word, w) in words" :key="w">
        <template v-if="word.space">{{ word.part }}</template>
        <span v-else class="decipher-word"><span v-for="(char, c) in word.chars" :key="c" class="decipher-char">{{ char }}</span></span>
      </template>
    </span>
  </span>
</template>
