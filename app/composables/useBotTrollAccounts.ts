import accountsData from '~/data/btAccounts.json'
import type { Account } from '~/types/botTroll'

// Ported from DECODE.bot-troll-detector (app/composables/useAccounts.js) —
// same normalisation/lookup logic, static demo dataset (106 accounts, no
// live platform lookup — none of Instagram/X/TikTok offer a free public
// API for this, and scraping would break their terms of service).
const accounts = accountsData as Account[]

/**
 * Accepts a raw handle, an @handle, or a full profile URL and normalises
 * it to a bare handle for matching against the dataset.
 */
export function normaliseHandle(input: string) {
  if (!input) return ''
  let value = input.trim()
  try {
    if (/^https?:\/\//i.test(value)) {
      value = new URL(value).pathname
    }
  } catch {
    // not a URL — treat as a plain handle
  }
  value = value.replace(/^\/+|\/+$/g, '').split('/')[0] ?? ''
  value = value.replace(/^@/, '')
  return value.toLowerCase()
}

export function useBotTrollAccounts() {
  function findByHandle(input: string): Account | null {
    const handle = normaliseHandle(input)
    if (!handle) return null
    return accounts.find((a) => normaliseHandle(a.handle) === handle) ?? null
  }

  return { accounts, findByHandle }
}
