// Typographic "deciphering" (DecipherText.vue for titles, decipherHtml()
// + the v-decipher directive for CMS rich text, CSS in main.css).
//
// Each word starts with its own letters scrambled into wrong positions
// (never random characters, so widths and line breaks hold). Then, at
// short irregular intervals (MIN_GAP–MAX_GAP ms), discrete swaps snap
// letters into their correct places: several words at once, each word
// starting at its own moment, and a letter that has landed stays put.
// Everything is resolved by DURATION. A quick opacity reveal (CSS,
// .decipher-reveal) runs first; the reordering itself is at full opacity.

const DURATION = 1200
const MIN_GAP = 50
const MAX_GAP = 100
// Words past this index render already resolved — a long article body
// stays cheap, and what's below the fold doesn't need deciphering.
const MAX_WORDS = 260

interface Word {
  el: HTMLElement
  charEls: HTMLElement[]
  // Arrangement the swaps move toward: the true text when deciphering,
  // a scramble of it when scrambling out (scrambleOut below).
  final: string[]
  current: string[]
  // When each correction happens (ms from start), ascending.
  fixes: number[]
  // scrambleOut only: when each character vanishes (ms from start). It
  // goes invisible in place, so nothing around it reflows.
  removeAt?: number[]
  // decipher's `grow` mode only: when each character joins the text (ms
  // from start); until then it takes no space at all.
  revealAt?: number[]
  // Same, for plain-text words (no .decipher-char spans): which letters
  // are in the text so far.
  revealed?: boolean[]
}

function shuffled<T>(items: T[]) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

// A permutation of the word's letters with as few letters in place as a
// few tries allow (words like "all" can't be fully scrambled).
function scramble(final: string[]) {
  let best = final
  let bestFixed = final.length + 1
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = shuffled(final)
    const fixed = candidate.filter((c, i) => c === final[i]).length
    if (fixed < bestFixed) {
      best = candidate
      bestFixed = fixed
    }
    if (fixed === 0) break
  }
  return best
}

function render(word: Word) {
  if (word.charEls.length) word.charEls.forEach((c, i) => { c.textContent = word.current[i]! })
  // Plain-text word in grow mode: only the letters revealed so far.
  else if (word.revealed) word.el.textContent = word.current.filter((_, i) => word.revealed![i]).join('')
  else word.el.textContent = word.current.join('')
}

// One correction: a random still-wrong position gets its right letter,
// swapped in from wherever that letter currently sits (preferring a
// spot that is itself wrong, so no settled letter is disturbed).
function correct(word: Word) {
  const wrong = word.current.map((c, i) => (c === word.final[i] ? -1 : i)).filter((i) => i >= 0)
  if (!wrong.length) return
  const i = wrong[Math.floor(Math.random() * wrong.length)]!
  const want = word.final[i]
  const j = wrong.find((k) => k !== i && word.current[k] === want)
    ?? word.current.findIndex((c, k) => k !== i && c === want)
  if (j < 0) return
  ;[word.current[i], word.current[j]] = [word.current[j]!, word.current[i]!]
}

// Applies each word's scheduled swaps at irregular MIN_GAP–MAX_GAP ms
// steps until `duration`, then snaps every word to its target. Returns a
// stop function that snaps immediately.
function run(words: Word[], duration: number) {
  const t0 = performance.now()
  let timer = setTimeout(function tick() {
    const t = performance.now() - t0
    if (t >= duration) {
      words.forEach(settle)
      return
    }
    for (const word of words) {
      word.removeAt?.forEach((at, i) => {
        if (at <= t) word.charEls[i]!.style.visibility = 'hidden'
      })
      let changed = false
      word.revealAt?.forEach((at, i) => {
        if (at > t) return
        if (word.revealed) {
          if (!word.revealed[i]) {
            word.revealed[i] = true
            changed = true
          }
        } else {
          word.charEls[i]!.style.display = ''
        }
      })
      while (word.fixes.length && word.fixes[0]! <= t) {
        word.fixes.shift()
        correct(word)
        changed = true
      }
      if (changed) render(word)
    }
    timer = setTimeout(tick, MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP))
  }, MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP))

  return () => {
    clearTimeout(timer)
    words.forEach(settle)
  }
}

// Swap times for `count` corrections: the word starts at its own moment
// within the first ~40% of `duration`, then spreads them over the rest.
function schedule(count: number, duration: number) {
  const start = 80 + Math.random() * duration * 0.4
  const span = duration - 60 - start
  return Array.from({ length: count }, () => start + Math.random() * span).sort((a, b) => a - b)
}

function settle(word: Word) {
  word.current = [...word.final]
  word.fixes = []
  render(word)
  if (word.removeAt) word.charEls.forEach((c) => { c.style.visibility = 'hidden' })
  if (word.revealAt) word.charEls.forEach((c) => { c.style.display = '' })
  if (word.revealed) word.revealed = word.revealed.map(() => true)
  word.el.classList.add('is-settled')
}

// Deciphers every not-yet-resolved .decipher-word inside `root`. Returns
// a stop function that snaps everything to its final text.
//
// `grow`: every word starts as just 1-`growMax` of its letters and gains
// the rest one by one over the first ~75% of the run — widening to its
// full length while it deciphers.
//
// `reveal: false` skips the quick opacity fade-in — for text inside a CSS
// mask (the splash headline): an animated element inside a masked one
// makes Chrome stop applying the mask properly.
export function decipher(root: HTMLElement, { grow = false, growMax = 3, reveal = true } = {}): () => void {
  const els = [...root.querySelectorAll<HTMLElement>('.decipher-word:not(.is-settled):not(.is-running)')]
  if (!els.length) return () => {}

  const words: Word[] = els.map((el) => {
    el.classList.add('is-running')
    const charEls = [...el.querySelectorAll<HTMLElement>('.decipher-char')]
    const final = charEls.length ? charEls.map((c) => c.textContent ?? '') : [...(el.textContent ?? '')]
    const current = scramble(final)
    const fixes = schedule(current.filter((c, i) => c !== final[i]).length, DURATION)
    return { el, charEls, final, current, fixes }
  })

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    words.forEach(settle)
    return () => {}
  }

  if (grow) {
    for (const word of words) {
      const indices = word.final.map((_, i) => i)
      const shown = new Set(shuffled(indices).slice(0, 1 + Math.floor(Math.random() * growMax)))
      word.revealAt = indices.map((i) => (shown.has(i) ? 0 : 60 + Math.random() * DURATION * 0.75))
      if (word.charEls.length) indices.forEach((i) => { if (!shown.has(i)) word.charEls[i]!.style.display = 'none' })
      else word.revealed = indices.map((i) => shown.has(i))
    }
  }

  // Scrambled before the first paint on a client-side navigation, so the
  // true text never shows first; the reveal fades this state in.
  words.forEach(render)
  if (reveal) {
    root.classList.remove('decipher-reveal')
    void root.offsetWidth
    root.classList.add('decipher-reveal')
    // Not left on afterwards (see `reveal` above).
    setTimeout(() => root.classList.remove('decipher-reveal'), 250)
  }

  return run(words, DURATION)
}

// The reverse, for text on its way out (Splash.vue's exit): every
// character of `root`'s text is wrapped in its own span on the spot (the
// element is about to unmount, so rewriting its DOM under Vue is safe).
// Over `duration` the letters keep swapping into a scramble while, from
// a quarter of the way in, more and more of them vanish in place, until
// nothing is left.
export function scrambleOut(root: HTMLElement, duration: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  const words: Word[] = []
  for (const node of nodes) {
    if (!node.nodeValue?.trim()) continue
    const frag = document.createDocumentFragment()
    for (const part of node.nodeValue.split(/(\s+)/)) {
      if (!part) continue
      if (/^\s+$/.test(part)) {
        frag.append(part)
        continue
      }
      const el = document.createElement('span')
      el.style.whiteSpace = 'nowrap'
      const current = [...part]
      const charEls = current.map((char) => {
        const c = document.createElement('span')
        c.textContent = char
        el.append(c)
        return c
      })
      frag.append(el)
      const final = scramble(current)
      words.push({
        el,
        charEls,
        final,
        current,
        fixes: schedule(final.filter((c, k) => c !== current[k]).length, duration * 0.8),
        removeAt: current.map(() => duration * (0.25 + Math.random() * 0.7)),
      })
    }
    node.replaceWith(frag)
  }
  return run(words, duration)
}

// Morphs a DecipherText root (its .decipher-char spans) from another
// string into its own text — the panel hand-off (usePanelMorph): one
// panel's texts turn into the next one's in place. Characters are lined
// up by position (spaces ignored): each position starts on the source's
// letter there and snaps to its own at its own moment; positions the
// source didn't reach appear at theirs; source letters past the end of
// the new text drop away one by one. Done by DURATION.
export function morph(root: HTMLElement, from: string): () => void {
  const charEls = [...root.querySelectorAll<HTMLElement>('.decipher-char')]
  const finals = charEls.map((c) => c.textContent ?? '')
  const source = [...from.replace(/\s+/g, '')]
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !charEls.length) return () => {}

  const fixAt = charEls.map(() => 120 + Math.random() * DURATION * 0.75)
  charEls.forEach((c, i) => {
    if (i < source.length) c.textContent = source[i]!
    else c.style.display = 'none'
  })
  // Leftover source letters, after the last word.
  const tail = document.createElement('span')
  tail.setAttribute('aria-hidden', 'true')
  let tailText = source.slice(charEls.length).join('')
  tail.textContent = tailText
  charEls.at(-1)?.parentElement?.after(tail)
  const tailDrops = [...tailText].map(() => 120 + Math.random() * DURATION * 0.75).sort((a, b) => a - b)

  const finish = () => {
    charEls.forEach((c, i) => {
      c.textContent = finals[i]!
      c.style.display = ''
    })
    tail.remove()
  }

  const t0 = performance.now()
  let timer = setTimeout(function tick() {
    const t = performance.now() - t0
    if (t >= DURATION) return finish()
    charEls.forEach((c, i) => {
      if (fixAt[i]! <= t) {
        c.textContent = finals[i]!
        c.style.display = ''
      }
    })
    while (tailDrops.length && tailDrops[0]! <= t) {
      tailDrops.shift()
      tailText = tailText.slice(0, -1)
      tail.textContent = tailText
    }
    timer = setTimeout(tick, MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP))
  }, MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP))

  return () => {
    clearTimeout(timer)
    finish()
  }
}

// Deciphers any element's existing text in place (Splash.vue's arrival
// build), every word growing from 1-`growMax` letters (`grow: false`
// keeps each word at full length — for text whose exact width matters,
// like the splash headline's measured backing mask). The text
// nodes are swapped for temporary .decipher-word/.decipher-char spans for
// the run, then the original nodes themselves are put back, so anything
// still holding a reference to them (Vue's own render) stays intact.
export function decipherIn(root: HTMLElement, { grow = true, growMax = 2, reveal = true } = {}): () => void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  const swaps: { original: Text, inserted: Node[] }[] = []
  for (const node of nodes) {
    if (!node.nodeValue?.trim()) continue
    const inserted: Node[] = []
    for (const part of node.nodeValue.split(/(\s+)/)) {
      if (!part) continue
      if (/^\s+$/.test(part)) {
        inserted.push(document.createTextNode(part))
        continue
      }
      const word = document.createElement('span')
      word.className = 'decipher-word'
      word.style.whiteSpace = 'nowrap'
      for (const char of part) {
        const c = document.createElement('span')
        c.className = 'decipher-char'
        c.textContent = char
        word.append(c)
      }
      inserted.push(word)
    }
    node.replaceWith(...inserted)
    swaps.push({ original: node, inserted })
  }

  const stop = decipher(root, { grow, growMax, reveal })
  let restored = false
  const restore = () => {
    if (restored) return
    restored = true
    for (const { original, inserted } of swaps) {
      inserted[0]?.parentNode?.replaceChild(original, inserted[0])
      inserted.slice(1).forEach((n) => n.parentNode?.removeChild(n))
    }
  }
  const timer = setTimeout(restore, DURATION + 120)
  return () => {
    clearTimeout(timer)
    stop()
    restore()
  }
}

// Wraps the first MAX_WORDS words of a CMS rich-text string in
// .decipher-word spans for the v-decipher directive. Tags pass through;
// only the text between them is split, on whitespace (entities like
// &amp; stay whole inside their word).
export function decipherHtml(html: string | undefined | null) {
  if (!html) return ''
  let count = 0
  return html
    .split(/(<[^>]*>)/)
    .map((part) => (part.startsWith('<')
      ? part
      : part.replace(/\S+/g, (word) => (count++ < MAX_WORDS ? `<span class="decipher-word">${word}</span>` : word))))
    .join('')
}
