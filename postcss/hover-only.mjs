// Wraps every `:hover` selector in `@media (hover: hover)`, so a touch screen
// never applies it. A phone keeps `:hover` on whatever was tapped last, until
// the next tap somewhere else: closed menus and articles stayed filled.
// Done here rather than rule by rule, so a new `:hover` can't bring it back.
//
// A rule mixing both (`.tab:hover, .tab.active`) is split: `.tab.active` has
// to keep applying on touch screens.
const HOVER_QUERY = '(hover: hover)'

function isInsideHoverQuery(rule) {
  for (let node = rule.parent; node; node = node.parent) {
    if (node.type === 'atrule' && node.name === 'media' && node.params.includes(HOVER_QUERY)) return true
  }
  return false
}

export default function hoverOnly() {
  return {
    postcssPlugin: 'hover-only',
    Once(root, { AtRule }) {
      root.walkRules((rule) => {
        if (!rule.selector.includes(':hover') || isInsideHoverQuery(rule)) return
        const hover = rule.selectors.filter((selector) => selector.includes(':hover'))
        const other = rule.selectors.filter((selector) => !selector.includes(':hover'))
        const query = new AtRule({ name: 'media', params: HOVER_QUERY, source: rule.source })
        // Inserted right after the rule (not moved to the end of the file),
        // so it keeps its place in the cascade.
        rule.after(query)
        query.append(rule.clone({ selector: hover.join(', ') }))
        if (other.length) rule.selector = other.join(', ')
        else rule.remove()
      })
    },
  }
}

hoverOnly.postcss = true
