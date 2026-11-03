import { createMemoryHistory, createWebHistory } from 'vue-router'
import type { RouterConfig } from 'nuxt/schema'

// French lives under /fr/… (server/middleware/language.ts). As the router's
// base rather than as routes of its own: every link it renders gets the prefix,
// while route.path stays '/guide' or '/tools/…' in both languages, so nothing
// that reads it needs to know about languages. A language switch is a full
// page load, so one app instance only ever has one base.
export default <RouterConfig>{
  history: (base) => {
    const french = import.meta.client
      ? /^\/fr(\/|$)/.test(window.location.pathname)
      : useRequestEvent()?.context.language === 'fr'
    const routerBase = french ? '/fr' : base
    return import.meta.client ? createWebHistory(routerBase) : createMemoryHistory(routerBase)
  },
}
