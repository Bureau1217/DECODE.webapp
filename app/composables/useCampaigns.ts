import campaignsData from '~/data/campaigns.json'
import receiversData from '~/data/receivers.json'

// Ported from DECODE.map (app/composables/useCampaigns.js) — same two JSON
// tables (Campaign Profile / Receivers), joined here by campaign_id so
// each campaign carries its own receivers directly. Shapes match that
// project's own data files verbatim; see app/data/campaigns.json for a
// full example (title, emitter_country, emitter_actor, date_or_period,
// social_networks, strategy_used, sources, page_content, emitter lat/lng).
export interface Receiver {
  campaign_id: string
  receiver_country: string
  receiver_target: string
  target_type?: string
  receiver_latitude: number
  receiver_longitude: number
  notes?: string
}

export interface Campaign {
  campaign_id: string
  title: string
  cover_image?: string
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

export function useCampaigns() {
  const campaigns = campaignsData as Campaign[]
  const receivers = receiversData as Receiver[]

  const campaignsWithReceivers: CampaignWithReceivers[] = campaigns.map((campaign) => ({
    ...campaign,
    receivers: receivers.filter((r) => r.campaign_id === campaign.campaign_id),
  }))

  function getCampaignById(id: string) {
    return campaignsWithReceivers.find((c) => c.campaign_id === id) ?? null
  }

  return {
    campaigns: campaignsWithReceivers,
    receivers,
    getCampaignById,
  }
}
