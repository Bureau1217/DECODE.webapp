import { decipher } from '~/utils/decipher'

// v-decipher: deciphers the .decipher-word spans decipherHtml() put into
// an element's v-html, on mount and again whenever that HTML is replaced
// (fresh spans; words already resolved or running are skipped). Bound to
// `false` (v-decipher="ready"), or to `{ ready: false }`, the element is
// held invisible and left untouched until it turns true; `{ grow: true }`
// makes every word start from one or two of its letters and grow.

type DecipherEl = HTMLElement & { _decipherStops?: (() => void)[] }
type DecipherBinding = boolean | undefined | { ready?: boolean, grow?: boolean }

function options(value: DecipherBinding) {
  if (typeof value === 'object') return { ready: value.ready !== false, grow: !!value.grow }
  return { ready: value !== false, grow: false }
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive<DecipherEl>('decipher', {
    mounted(el, binding) {
      el._decipherStops = []
      const { ready, grow } = options(binding.value as DecipherBinding)
      if (!ready) {
        el.style.visibility = 'hidden'
        return
      }
      el._decipherStops.push(decipher(el, { grow, growMax: 2 }))
    },
    updated(el, binding) {
      const { ready, grow } = options(binding.value as DecipherBinding)
      if (!ready) return
      el.style.visibility = ''
      el._decipherStops?.push(decipher(el, { grow, growMax: 2 }))
    },
    beforeUnmount(el) {
      el._decipherStops?.forEach((stop) => stop())
    },
    getSSRProps: () => ({}),
  })
})
