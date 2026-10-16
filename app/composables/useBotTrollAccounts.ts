import accountsData from '~/data/btAccounts.json'
import type { Account } from '~/types/botTroll'

// Ported from DECODE.bot-troll-detector (app/composables/useAccounts.js) —
// static demo dataset (106 accounts, no
// live platform lookup — none of Instagram/X/TikTok offer a free public
// API for this, and scraping would break their terms of service).
const accounts = accountsData as Account[]

export function useBotTrollAccounts() {
  return { accounts }
}
