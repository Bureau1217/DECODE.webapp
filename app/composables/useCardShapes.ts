// The guide's and the tools' dotted countries (CardCountry.vue): each card's
// own shift from its corner, x and y in % of the shape's own size
// (CARD_SHAPE_OFFSETS, utils/cardCountry.ts), the same on the page it opens.
// ?shapes on any page (22 Nov 2026) turns on their editor until "Terminer":
// drag a card's shape, its shift kept in this browser (localStorage) until
// "Copier le code" is pasted over CARD_SHAPE_OFFSETS.
import { CARD_SHAPE_OFFSETS, type CardShapeOffsets } from '~/utils/cardCountry'

const STORE = 'decode:card-shapes-1'
const EDIT_FLAG = 'decode:card-shapes-edit'

export function useCardShapes() {
  const offsets = useState<CardShapeOffsets>('card-shape-offsets', () => structuredClone(CARD_SHAPE_OFFSETS))
  const editing = useState('card-shapes-editing', () => false)
  const loaded = useState('card-shapes-loaded', () => false)

  if (import.meta.client && !loaded.value) {
    loaded.value = true
    onMounted(() => {
      try {
        if (useRoute().query.shapes !== undefined) localStorage.setItem(EDIT_FLAG, '1')
        editing.value = localStorage.getItem(EDIT_FLAG) === '1'
        if (editing.value) {
          const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null')
          if (saved && typeof saved === 'object') offsets.value = { ...offsets.value, ...saved }
        }
      }
      catch {}
    })
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(offsets.value)) }
    catch {}
  }
  function set(key: string, x: number, y: number) {
    offsets.value = { ...offsets.value, [key]: { x: Math.round(x), y: Math.round(y) } }
    save()
  }
  function reset() {
    offsets.value = structuredClone(CARD_SHAPE_OFFSETS)
    try { localStorage.removeItem(STORE) }
    catch {}
  }
  function stop() {
    editing.value = false
    try { localStorage.removeItem(EDIT_FLAG) }
    catch {}
  }
  const code = () => {
    const lines = Object.entries(offsets.value)
      .filter(([, o]) => o.x || o.y)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([key, o]) => `  '${key}': { x: ${o.x}, y: ${o.y} },`)
    return `export const CARD_SHAPE_OFFSETS: CardShapeOffsets = {\n${lines.join('\n')}\n}\n`
  }

  return { offsets, editing, set, reset, stop, code }
}
