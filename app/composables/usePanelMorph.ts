// Hand-off between the two left panels (KeywordsPanel.vue <-> TeamPanel.vue,
// app.vue swaps them on /about): the outgoing panel records its texts in
// reading order (band titles and rows) as it unmounts; the incoming one,
// if that record is recent, morphs each of its own texts out of the one
// that sat in the same position (DecipherText's `from`, app/utils/
// decipher.ts `morph`) — the panel seems to rewrite itself in place.
type PanelName = 'keywords' | 'team'

interface PanelTexts {
  panel: PanelName
  texts: string[]
  at: number
}

// Long enough to cover the incoming panel's own data fetch.
const FRESH_MS = 4000

export function usePanelMorph(panel: PanelName) {
  const source = useState<PanelTexts | null>('panel-morph-source', () => null)

  // The incoming panel's starting texts — only from the *other* panel,
  // and only if recent — read once at setup, then cleared so a later
  // remount deciphers normally.
  const s = source.value
  const record = s && s.panel !== panel && Date.now() - s.at < FRESH_MS ? s.texts : null
  source.value = null

  return {
    // Source text for the incoming panel's text at `index`, if any.
    fromAt: (index: number) => (record ? record[index] ?? '' : undefined),
    // Called by the outgoing panel.
    save: (texts: string[]) => { source.value = { panel, texts, at: Date.now() } },
  }
}
