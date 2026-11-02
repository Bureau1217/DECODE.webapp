/**
 * Whether this device has a real pointer. A tap also fires an emulated
 * `mouseenter`, with no `mouseleave` until the next tap elsewhere — JS hover
 * effects check this so they can't stay stuck on, the same way
 * postcss/hover-only.mjs does for CSS `:hover`.
 */
export function canHover(): boolean {
  return window.matchMedia('(hover: hover)').matches
}
