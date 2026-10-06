/**
 * Client for DECODE.cms's KQL endpoint, via this app's own `/api/kql`
 * server route (server/api/kql.post.ts), which proxies to Kirby's real
 * `/api/query`. Always go through the proxy, never call Kirby directly
 * from here — a direct browser→Kirby call fails CORS preflight every
 * time (confirmed live: Kirby has no OPTIONS handling for `/api/query`),
 * even though server-to-server calls (curl, Node, Nuxt SSR) work fine.
 * See the proxy route for why, and for where kqlUser/kqlPassword
 * (server-only) get used.
 */

export interface KqlBody {
  query: string
  select?: Record<string, unknown>
  pagination?: Record<string, unknown>
}

async function postKql<T>(body: KqlBody): Promise<T> {
  return await $fetch<T>('/api/kql', { method: 'POST', body })
}

/**
 * A single object/page/field query — `result` resolves directly (`null` if
 * nothing matched).
 */
export async function useKql<T = unknown>(body: KqlBody): Promise<T> {
  const response = await postKql<{ result: T }>(body)
  return response.result
}

/**
 * A *collection* query at the top level (e.g. `site.children.filterBy(...)`)
 * — `result` is the bare array directly (confirmed against this KQL
 * version; getkirby/kql's own README shows a `{ data, pagination }`
 * wrapper for collections, which does NOT match what this install
 * actually returns — don't "fix" this back without re-checking live).
 */
export async function useKqlCollection<T = unknown>(body: KqlBody): Promise<T[]> {
  const response = await postKql<{ result: T[] | null }>(body)
  return response.result ?? []
}
