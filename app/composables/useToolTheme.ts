// Single lookup table for the "this tool's own custom page reskins the
// whole app shell" pattern — was 3 identical `route.path === '/tools/...'`
// computed properties, copy-pasted into SiteNav.vue, SiteIndexBar.vue and
// SiteFooter.vue (9 near-duplicate lines total), each paired with its own
// ~20-line block of per-theme CSS. Adding a 4th themed tool is now a
// one-line addition here instead of touching those 3 files.
//
// `chromeAccent` is whichever of a tool's two accent tokens
// (app/assets/css/main.css) actually has enough contrast for nav/index-
// bar/footer text and fills — Campaigns Maps' coral is saturated enough
// to use directly (its light accent token), but Bot/Troll Detector's
// teal and Source Reliability's purple are too washed out at that
// lightness, so those two use their "deep" token instead. All three
// chrome components already made this same per-tool choice independently
// before this composable existed — this just gives it one home. Each
// tool's *own* page content (e.g. DisinfoMap.vue) still reaches both
// tokens directly where it genuinely needs both shades.
interface ToolTheme {
  path: string
  chromeAccent: string
}

const TOOL_THEMES: ToolTheme[] = [
  { path: '/tools/campaigns-map', chromeAccent: 'var(--tool-campaigns-accent)' },
  { path: '/tools/bot-troll-detector', chromeAccent: 'var(--tool-bottroll-accent-deep)' },
  { path: '/tools/source-reliability-plugin', chromeAccent: 'var(--tool-sourcerel-accent-deep)' },
]

export function useToolTheme() {
  const route = useRoute()
  const theme = computed(() => TOOL_THEMES.find((t) => t.path === route.path) ?? null)

  return {
    theme,
    isThemed: computed(() => theme.value !== null),
  }
}
