// Shape of a Bot / Troll Detector criterion, as returned by the `tool`
// KQL select's `criteria` relation (app/kql/page-selects.ts) — editors
// manage these as child pages of tools/bot-troll-detector in the CMS
// (template: criterion, DECODE.cms/site/blueprints/pages/criterion.yml).
export interface Criterion {
  slug: string
  title: string
  interface_label: string
  category: string
  observable_signal?: string
  why_it_matters?: string
  example_of_evidence?: string
  weight: number
  platforms?: string[]
}

export interface AccountPost {
  id: string
  caption: string
  likes: number
  comments: number
  hashtags: string[]
}

// One demo account (app/data/btAccounts.json) — ported verbatim from the
// DECODE.bot-troll-detector prototype's own accounts.json, kept as a
// static file rather than CMS content (106 accounts, read-only demo
// data, not something editors need to manage).
export interface Account {
  account_id: string
  handle: string
  platform: string
  verified_badge: boolean
  account_created: string
  bio?: string
  geotags?: string[]
  language_setting?: string
  creation_location?: string
  followers_count: number
  following_count: number | null
  posts_count: number
  avg_engagement_pct: number | null
  post_frequency_per_day: number | null
  unique_hashtags_count: number | null
  username_change_count?: number | null
  ai_flagged_posts_count?: number | null
  posts?: AccountPost[]
}

export type Verdict = 'legitimate' | 'suspicious' | 'bot_troll'

// Sent to /api/submit-verdict (server/api/submit-verdict.post.ts), which
// proxies to DECODE.cms's public /submit-verdict route
// (site/plugins/submissions) — each save becomes a `submission` child
// page under tools/bot-troll-detector, visible to editors in the panel.
export const VERDICT_OPTIONS: { value: Verdict, label: string, tone: 'good' | 'warn' | 'bad' }[] = [
  { value: 'legitimate', label: 'Legitimate', tone: 'good' },
  { value: 'suspicious', label: 'Suspicious', tone: 'warn' },
  { value: 'bot_troll', label: 'Likely bot / troll', tone: 'bad' },
]
