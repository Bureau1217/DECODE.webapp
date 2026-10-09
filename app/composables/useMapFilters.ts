import type { CampaignWithReceivers } from '~/types/campaign'

// Ported from DECODE.map (app/composables/useMapFilters.js) — unchanged
// logic, just typed. Used by DisinfoMap.vue to drive MapFilters.vue's own
// option lists (emitter country / platform / period) and to compute which
// markers should be visible.
export interface MapFilter {
  type: 'emitter' | 'platform' | 'period'
  value: string
}

export function useMapFilters(campaigns: CampaignWithReceivers[]) {
  const filterOptions = computed(() => ({
    emitter: [...new Set(campaigns.map((c) => c.emitter_country))].sort(),
    platform: [...new Set(campaigns.flatMap((c) => c.social_networks ?? []))].sort(),
    period: [...new Set(campaigns.map((c) => c.date_or_period?.split('–')[0]).filter(Boolean))].sort() as string[],
  }))

  function matchesFilter(campaign: CampaignWithReceivers, filter: MapFilter) {
    if (filter.type === 'emitter') return campaign.emitter_country === filter.value
    if (filter.type === 'platform') return campaign.social_networks?.includes(filter.value) ?? false
    if (filter.type === 'period') return campaign.date_or_period?.includes(filter.value) ?? false
    return true
  }

  return {
    filterOptions,
    matchesFilter,
  }
}
