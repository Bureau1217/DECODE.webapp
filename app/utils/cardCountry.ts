// Which dotted country a guide or tool card shows, and in which corner
// (CardCountry.vue): the same on the card and on the page it opens
// (TemplateDefault.vue, ToolCover.vue), so it stays where it was.
// app/data/cardCountries.json: 27 countries (scripts/card-countries.mjs) and the
// splash's two old pixel shapes (scripts/card-splash-shapes.mjs).
import cardCountries from '~/data/cardCountries.json'

export type CardCorner = 'tl' | 'tr' | 'br' | 'bl'
export type CardKind = 'guide' | 'tool'
export interface CardShape { cols: number, rows: number, cells: [number, number][] }

export const CARD_SHAPES = cardCountries as unknown as Record<string, CardShape>
// The countries in turn (not the splash's shapes, kept for the first cards).
const NAMES = Object.keys(CARD_SHAPES).filter((name) => !name.startsWith('splash-')).sort()

function shuffled<T>(list: T[], seed: number) {
  const out = [...list]
  let a = seed * 2654435761
  for (let i = out.length - 1; i > 0; i--) {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    const j = Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

// Per kind: a seed (the guide's and the tools' countries differ), the corners
// in turn (the guide's image hides its top corners: the bottom ones; the
// tools' text is on the right: the right ones), and the first card's own
// (22 Nov 2026): the splash's old shapes, as in the references.
const KINDS: Record<CardKind, { seed: number, corners: CardCorner[], first: { shape: string, corner: CardCorner } }> = {
  guide: { seed: 3, corners: ['bl', 'br'], first: { shape: 'splash-group-42', corner: 'tl' } },
  tool: { seed: 11, corners: ['tr', 'br'], first: { shape: 'splash-ca', corner: 'tr' } },
}
const ORDERS = Object.fromEntries(Object.entries(KINDS).map(([kind, { seed }]) => [kind, shuffled(NAMES, seed)])) as Record<CardKind, string[]>

/**
 * Each card's shape moved from its corner (`${kind}-${index}`), x and y in % of
 * the shape's own size, on the card and the page it opens. Set by dragging
 * (?shapes, useCardShapes): its "Copier le code" gives this object back.
 */
export type CardShapeOffsets = Record<string, { x: number, y: number }>
export const CARD_SHAPE_OFFSETS: CardShapeOffsets = {
  'guide-0': { x: -15, y: 5 },
  'guide-2': { x: 20, y: 0 },
  'tool-0': { x: -15, y: -56 },
  'tool-1': { x: 136, y: 26 },
}

export function cardCountryFor(kind: CardKind, index: number): { shape: CardShape, corner: CardCorner } {
  const { seed, corners, first } = KINDS[kind]
  if (index === 0) return { shape: CARD_SHAPES[first.shape]!, corner: first.corner }
  const order = ORDERS[kind]
  return { shape: CARD_SHAPES[order[index % order.length]!]!, corner: corners[(index + seed) % corners.length]! }
}
