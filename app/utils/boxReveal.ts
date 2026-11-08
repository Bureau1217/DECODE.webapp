// Letters coming in, or going, as 2xA Studio's intro (2xa.studio), taken apart:
// each segment of the text (a word, or a full stop on its own) has a front, a
// cursor running through it from the left, one segment starting after another.
// Behind the front, each letter goes through a trail of states:
// - in: hidden ahead of it; at it, a solid block (the letter hidden under it);
//   just behind, the letter inverted (page colour on an ink box); further back,
//   only an outline round it; then plain.
// - out: plain ahead of it, then outlined as it nears; at it, a solid block;
//   just behind, inverted; then gone.
// Coming in, the front moves in jumps (a letter or two at a time, now and then
// stalling), each letter's thresholds a little off the others', a few
// flickering back for a step. Going, it's one steady front across the whole
// text, quicker, with a shorter trail. Either way the whole updates in steps
// (STEP_MS), not smoothly.
// Black and white: the states are drawn with the text's own colour and the
// page's (styled in Splash.vue).
export interface BoxRevealOptions {
  mode: 'in' | 'out'
  delay?: number // ms before the first segment
  segmentGap?: number // ms between segments starting
  lettersPerSecond?: number // the front's mean speed
  // One even front through the whole text (no jumps, stalls, offsets or
  // flicker), drawn every `stepMs` (default STEP_MS): smooth, not stepped.
  steady?: boolean
  stepMs?: number
}

const STEP_MS = 50
// Where each state starts, in letters behind the front (in), and ahead of / behind it (out).
const IN_TRAIL = { block: 0, invert: 1, outline: 2.4, plain: 4.2 }
const OUT_TRAIL = { outline: -1.2, block: 0, invert: 0.8, gone: 1.6 }
const OUT_LETTERS_PER_SECOND = 22
const FLICKER = 0.06 // chance per step that a settled letter shows inverted for a step (in only, near the front)

// Splits the text into letters (spans), grouped by segment: words, and full
// stops on their own. Once: the spans stay until unwrapBoxReveal.
function wrap(root: HTMLElement) {
  if (!root.querySelector('.box-char')) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    while (walker.nextNode()) nodes.push(walker.currentNode as Text)
    for (const node of nodes) {
      if (!node.nodeValue?.trim()) continue
      const holder = document.createElement('span')
      holder.className = 'box-text'
      for (const part of node.nodeValue.split(/(\s+|\.)/)) {
        if (!part) continue
        if (/^\s+$/.test(part)) { holder.append(document.createTextNode(part)); continue }
        const segment = document.createElement('span')
        segment.className = 'box-word'
        for (const char of part) {
          const c = document.createElement('span')
          c.className = 'box-char'
          c.textContent = char
          segment.append(c)
        }
        holder.append(segment)
      }
      node.replaceWith(holder)
    }
  }
  return [...root.querySelectorAll<HTMLElement>('.box-word')].map((segment) => [...segment.querySelectorAll<HTMLElement>('.box-char')])
}

export function unwrapBoxReveal(root: HTMLElement) {
  for (const holder of root.querySelectorAll<HTMLElement>('.box-text')) holder.replaceWith(document.createTextNode(holder.textContent ?? ''))
}

// A front's path: when it reaches each letter, in jumps of one or two letters,
// now and then holding a step longer.
// Steady: a letter every `perLetter`, no jumps or stalls.
function frontTimes(count: number, start: number, perLetter: number, steady = false) {
  const times: number[] = []
  let at = start
  let i = 0
  while (i <= count + 6) {
    const jump = !steady && Math.random() < 0.3 ? 2 : 1
    for (let j = 0; j < jump; j++) times[i++] = at
    at += steady ? perLetter : perLetter * jump * (0.6 + Math.random() * 0.8) + (Math.random() < 0.12 ? STEP_MS * 2 : 0)
  }
  return times
}

export function boxReveal(root: HTMLElement, options: BoxRevealOptions) {
  const { mode, delay = 0, segmentGap = 140, lettersPerSecond = 16, steady = false, stepMs = STEP_MS } = options
  const wrapped = wrap(root)
  root.classList.remove('box-waiting')
  // Going: all the letters as one segment, one steady front.
  const segments = mode === 'in' && !steady ? wrapped : [wrapped.flat()]
  const perLetter = 1000 / (mode === 'in' ? lettersPerSecond : OUT_LETTERS_PER_SECOND)
  // Each segment's front, and each letter's own slight offset on the trail.
  const plans = segments.map((chars, s) => ({
    chars,
    times: frontTimes(chars.length, delay + s * segmentGap * (0.8 + Math.random() * 0.4), perLetter, mode === 'out' || steady),
    jitter: chars.map(() => (steady ? 0 : (Math.random() * 2 - 1) * (mode === 'in' ? 0.35 : 0.1))),
  }))
  const end = Math.max(...plans.map((plan) => plan.times[plan.times.length - 1]!)) + stepMs
  // Where the front is (in letters) at a time: between the letters it has reached.
  const frontAt = (times: number[], t: number) => {
    if (t < times[0]!) return -Infinity
    let i = 0
    while (i + 1 < times.length && times[i + 1]! <= t) i++
    return i
  }
  const state = (distance: number) => {
    if (mode === 'in') {
      if (distance < IN_TRAIL.block) return 'hidden'
      if (distance < IN_TRAIL.invert) return 'block'
      if (distance < IN_TRAIL.outline) return 'invert'
      if (distance < IN_TRAIL.plain) return 'outline'
      return 'plain'
    }
    if (distance < OUT_TRAIL.outline) return 'plain'
    if (distance < OUT_TRAIL.block) return 'outline'
    if (distance < OUT_TRAIL.invert) return 'block'
    if (distance < OUT_TRAIL.gone) return 'invert'
    return 'hidden'
  }
  const draw = (t: number) => {
    for (const plan of plans) {
      const front = frontAt(plan.times, t)
      plan.chars.forEach((c, i) => {
        let next = state(front - i + plan.jitter[i]!)
        if (mode === 'in' && !steady && next === 'plain' && front - i < 8 && Math.random() < FLICKER) next = 'invert'
        if (c.dataset.box !== next) c.dataset.box = next
      })
    }
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const started = performance.now()
  const tick = () => {
    const t = performance.now() - started
    draw(t)
    if (t < end) timer = setTimeout(tick, stepMs)
    else for (const plan of plans) for (const c of plan.chars) c.dataset.box = mode === 'in' ? 'plain' : 'hidden'
  }
  if (mode === 'in') for (const plan of plans) for (const c of plan.chars) c.dataset.box = 'hidden'
  tick()
  return {
    duration: end,
    // The front's own time (steady: one letter every perLetter).
    perLetter,
    letters: segments.flat().length,
    stop: () => clearTimeout(timer),
  }
}
