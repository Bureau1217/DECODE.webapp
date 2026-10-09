// Shape of a Campaigns Maps campaign, as returned by the `tool` KQL select's
// `campaigns` relation (app/kql/page-selects.ts) — editors manage these as
// child pages of tools/campaigns-map in the CMS (template: campaign,
// DECODE.cms/site/blueprints/pages/campaign.yml), not a static data file.
export interface Receiver {
  receiver_country: string
  receiver_target?: string
  target_type?: string
  receiver_latitude: number
  receiver_longitude: number
  notes?: string
}

export interface Campaign {
  slug: string
  title: string
  cover_image?: { url: string, alt?: string } | null
  short_description?: string
  emitter_country: string
  emitter_actor: string
  date_or_period: string
  social_networks?: string[]
  strategy_used?: string[]
  sources?: string[]
  page_content?: string
  emitter_latitude: number
  emitter_longitude: number
}

export interface CampaignWithReceivers extends Campaign {
  receivers: Receiver[]
}
