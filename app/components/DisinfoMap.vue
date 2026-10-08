<script setup lang="ts">
// Ported from DECODE.map (app/components/DisinfoMap.vue) — same Mapbox
// setup, marker/selection/filter logic. Diverges from that project in one
// deliberate way: there, a CampaignPanel slides in from the right, over
// the map itself; here, the selected campaign is exposed via v-model
// instead, so TemplateCampaignsMap.vue can show it in its own left-side
// panel (CampaignInfoPanel.vue) — this site's established "info on the
// left, content on the right" layout (KeywordsPanel, TeamPanel), not that
// project's own floating-drawer-over-the-map one.
import type { CampaignWithReceivers } from '~/composables/useCampaigns'
import worldCountries from '~/data/world-countries.json'

const { campaigns } = useCampaigns()
const { filterOptions, matchesFilter } = useMapFilters(campaigns)

// Our campaign data's country names don't all match world-countries.json's
// own `properties.name` spelling (johan/world.geo.json) — only this one
// diverges among the names this dataset actually uses.
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  'United States': 'United States of America',
}
function geoCountryName(name: string) {
  return COUNTRY_NAME_ALIASES[name] ?? name
}

const selectedCampaign = defineModel<CampaignWithReceivers | null>('campaign', { default: null })
const activeFilter = ref<{ type: 'emitter' | 'platform' | 'period', value: string } | null>(null)

const mapContainer = ref<HTMLDivElement | null>(null)
let map: import('mapbox-gl').Map | null = null
let mapboxgl: typeof import('mapbox-gl').default | null = null

interface EmitterMarkerEntry {
  marker: import('mapbox-gl').Marker
  campaign: CampaignWithReceivers
  el: HTMLDivElement
}

const emitterMarkers: EmitterMarkerEntry[] = []
let receiverMarkers: import('mapbox-gl').Marker[] = []

function selectCampaign(campaign: CampaignWithReceivers) {
  if (selectedCampaign.value?.campaign_id === campaign.campaign_id) {
    deselectCampaign()
    return
  }

  selectedCampaign.value = campaign

  emitterMarkers.forEach(({ el, campaign: c }) => {
    el.classList.toggle('is-selected', c.campaign_id === campaign.campaign_id)
  })

  map?.setFilter('countries-emitter-highlight', ['==', ['get', 'name'], geoCountryName(campaign.emitter_country)])

  renderReceivers(campaign)

  map?.flyTo({
    center: [campaign.emitter_longitude, campaign.emitter_latitude],
    zoom: 2.5,
    speed: 0.8,
  })
}

function deselectCampaign() {
  selectedCampaign.value = null
  emitterMarkers.forEach(({ el }) => el.classList.remove('is-selected'))
  map?.setFilter('countries-emitter-highlight', ['==', ['get', 'name'], ''])
  clearReceivers()
}

function renderReceivers(campaign: CampaignWithReceivers) {
  clearReceivers()
  if (!map || !mapboxgl) return

  map.setFilter('countries-receiver-highlight', [
    'in',
    ['get', 'name'],
    ['literal', campaign.receivers.map((r) => geoCountryName(r.receiver_country))],
  ])

  for (const receiver of campaign.receivers) {
    const el = document.createElement('div')
    el.className = 'receiver-marker'

    const dot = document.createElement('div')
    dot.className = 'receiver-pin'
    el.appendChild(dot)

    // Country-name pill to the right of the pin — same side as the
    // emitter's own label, so both read in the same direction. Target
    // audience stacked below the country name, inside the same pill.
    const label = document.createElement('div')
    label.className = 'receiver-label'

    const country = document.createElement('span')
    country.className = 'receiver-label-country'
    country.textContent = receiver.receiver_country
    label.appendChild(country)

    const target = document.createElement('span')
    target.className = 'receiver-label-target'
    target.textContent = receiver.receiver_target
    label.appendChild(target)

    el.appendChild(label)

    // anchor 'left' — the pin (first child) sits exactly on the
    // coordinate; the label extends rightward from it.
    const marker = new mapboxgl.Marker({ element: el, anchor: 'left' })
      .setLngLat([receiver.receiver_longitude, receiver.receiver_latitude])
      .addTo(map)

    receiverMarkers.push(marker)
  }

  const lines = campaign.receivers.map((r) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [campaign.emitter_longitude, campaign.emitter_latitude],
        [r.receiver_longitude, r.receiver_latitude],
      ],
    },
    properties: {},
  }))

  const source = map.getSource('spread-paths') as import('mapbox-gl').GeoJSONSource | undefined
  source?.setData({ type: 'FeatureCollection', features: lines })
}

function clearReceivers() {
  receiverMarkers.forEach((m) => m.remove())
  receiverMarkers = []
  const source = map?.getSource('spread-paths') as import('mapbox-gl').GeoJSONSource | undefined
  source?.setData({ type: 'FeatureCollection', features: [] })
  map?.setFilter('countries-receiver-highlight', ['in', ['get', 'name'], ['literal', []]])
}

watch(activeFilter, () => {
  const visible = activeFilter.value
    ? new Set(campaigns.filter((c) => matchesFilter(c, activeFilter.value!)).map((c) => c.campaign_id))
    : null

  for (const { el, campaign } of emitterMarkers) {
    const show = !visible || visible.has(campaign.campaign_id)
    el.style.display = show ? '' : 'none'
  }

  if (selectedCampaign.value && visible && !visible.has(selectedCampaign.value.campaign_id)) {
    deselectCampaign()
  }
})

onMounted(async () => {
  const config = useRuntimeConfig()
  mapboxgl = (await import('mapbox-gl')).default
  mapboxgl.accessToken = config.public.mapboxToken

  // A blank custom style (no Mapbox-hosted basemap) — background +
  // world-countries fill/line are added below once it's loaded. Gives
  // full control over the flat, line-art look the reference calls for,
  // which the default photographic/labeled basemaps don't.
  map = new mapboxgl.Map({
    container: mapContainer.value!,
    style: { version: 8, sources: {}, layers: [] },
    center: [10, 25],
    zoom: 1.5,
    projection: 'mercator',
    // No "(i)" attribution control — paired with the CSS below that also
    // hides the Mapbox wordmark logo control (always added regardless of
    // this option), for a fully chrome-free map per the design reference.
    attributionControl: false,
  })

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')

  map.on('load', () => {
    // Ocean/background wash.
    map!.addLayer({
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#fbd9d2' },
    })

    // Country shapes — white fill, coral outline (johan/world.geo.json's
    // combined countries.geo.json, bundled as app/data/world-countries.json).
    map!.addSource('countries', {
      type: 'geojson',
      data: worldCountries as GeoJSON.FeatureCollection,
    })
    map!.addLayer({
      id: 'countries-fill',
      type: 'fill',
      source: 'countries',
      paint: { 'fill-color': '#ffffff' },
    })

    // Selected campaign's own country shapes, not just their pins — light
    // red for its receivers, full red for its emitter (emitter added after
    // so it wins where a country is somehow both, though that never
    // happens in this dataset). Empty filters at rest; selectCampaign/
    // renderReceivers/deselectCampaign below update them to match.
    map!.addLayer({
      id: 'countries-receiver-highlight',
      type: 'fill',
      source: 'countries',
      // A lighter tint of the emitter's own FC7C6A below, not a
      // different hue — keeps "selected campaign" reading as one color
      // family, just fainter for the receiving side.
      paint: { 'fill-color': '#fbcec4' },
      filter: ['in', ['get', 'name'], ['literal', []]],
    })
    map!.addLayer({
      id: 'countries-emitter-highlight',
      type: 'fill',
      source: 'countries',
      paint: { 'fill-color': '#fc7c6a' },
      filter: ['==', ['get', 'name'], ''],
    })

    map!.addLayer({
      id: 'countries-line',
      type: 'line',
      source: 'countries',
      // Thinner than the first pass (1px) — a lighter hairline per the
      // latest reference.
      paint: { 'line-color': '#e2654f', 'line-width': 0.5 },
    })

    map!.addSource('spread-paths', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })

    map!.addLayer({
      id: 'spread-paths-layer',
      type: 'line',
      source: 'spread-paths',
      paint: {
        'line-color': '#e2654f',
        'line-width': 1.5,
        'line-dasharray': [4, 3],
        'line-opacity': 0.75,
      },
    })

    for (const campaign of campaigns) {
      const el = document.createElement('div')
      el.className = 'emitter-marker'
      el.setAttribute('aria-label', campaign.title)
      el.setAttribute('role', 'button')
      el.setAttribute('tabindex', '0')

      const dot = document.createElement('div')
      dot.className = 'emitter-pin'
      el.appendChild(dot)

      // Country-name label to the right of the pin, clear of the
      // propagation lines (which fan out further right only once this
      // one is selected) and of CampaignInfoPanel on the left. Actor
      // stacked below the country name, inside the same pill — only
      // shown once this emitter is the selected one (CSS, .is-selected),
      // so the map isn't cluttered with every campaign's actor at once.
      const label = document.createElement('div')
      label.className = 'emitter-label'

      const country = document.createElement('span')
      country.className = 'emitter-label-country'
      country.textContent = campaign.emitter_country
      label.appendChild(country)

      const actor = document.createElement('span')
      actor.className = 'emitter-label-actor'
      actor.textContent = campaign.emitter_actor
      label.appendChild(actor)

      el.appendChild(label)

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        selectCampaign(campaign)
      })
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') selectCampaign(campaign)
      })

      // anchor 'left' — the pin (first child, left end of the row) sits
      // exactly on the coordinate; the label extends rightward from it
      // rather than the two sharing the marker's center and drifting
      // off-point.
      const marker = new mapboxgl!.Marker({ element: el, anchor: 'left' })
        .setLngLat([campaign.emitter_longitude, campaign.emitter_latitude])
        .addTo(map!)

      emitterMarkers.push({ marker, campaign, el })
    }

    // Frame every emitter on arrival, rather than the fixed center/zoom
    // above (just a reasonable fallback for the instant before this
    // fires) — so nothing starts off-screen regardless of which
    // campaigns the data happens to have.
    if (campaigns.length) {
      const bounds = new mapboxgl!.LngLatBounds()
      for (const campaign of campaigns) {
        bounds.extend([campaign.emitter_longitude, campaign.emitter_latitude])
      }
      map!.fitBounds(bounds, { padding: 160, maxZoom: 3, duration: 0 })
    }
  })

  map.on('click', () => deselectCampaign())

  // Mapbox's own `trackResize` only reacts to the window's resize event,
  // not its container's — so when reading mode animates .campaigns-map-
  // content's margin-left (TemplateCampaignsMap.vue), the canvas is left
  // at its old pixel size even though the container element has already
  // grown/shrunk. Watch the container directly and nudge Mapbox to match.
  const resizeObserver = new ResizeObserver(() => map?.resize())
  resizeObserver.observe(mapContainer.value!)
  onBeforeUnmount(() => resizeObserver.disconnect())
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="map-wrapper">
    <MapFilters v-model="activeFilter" :filter-options="filterOptions" class="map-filters-overlay" />
    <div ref="mapContainer" class="disinfo-map" />
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.disinfo-map {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-filters-overlay {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 2;
}

/* Row, pin then label — label sits to the right of the pin (script's own
   anchor: 'left' is what keeps the pin itself exactly on-point). */
.map-wrapper :deep(.emitter-marker) {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  outline: none;
}

/* Square, not a circle — the reference's own emitter markers. Light red
   at rest; .is-selected below deepens it to full red — "other" (not
   currently selected) emitters stay this light shade even once one is
   chosen. */
.map-wrapper :deep(.emitter-pin) {
  width: 12px;
  height: 12px;
  background: #f4a89c;
  border: 1px solid #fff;
  border-radius: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.map-wrapper :deep(.emitter-marker:hover) .emitter-pin {
  transform: scale(1.2);
}

/* Selected emitter: full red, grown larger and solid rather than gaining
   a glow — same "one plain filled square, no label" look the reference
   gives its own selected/emitter point. */
.map-wrapper :deep(.emitter-marker.is-selected) .emitter-pin {
  width: 18px;
  height: 18px;
  background: #d9291c;
  transform: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* Red rectangle, white text — the emitter's own label pill, same shape
   as the receiver one below but in the "source" color instead of white.
   Light red at rest, matching the pin's own unselected shade; .is-selected
   below deepens it to full red, same pairing as the pin above. Column,
   not a single line — the actor sits below the country name. */
.map-wrapper :deep(.emitter-label) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 3px 8px;
  background: #f4a89c;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: background-color 0.15s ease;
}

.map-wrapper :deep(.emitter-marker.is-selected) .emitter-label {
  background: #d9291c;
}

.map-wrapper :deep(.emitter-label-country) {
  color: #fff;
  font-family: 'Martian Mono', monospace;
  font-weight: 700;
  font-size: 9pt;
  white-space: nowrap;
}

/* Hidden until this emitter is the selected one — otherwise every
   campaign's actor shows at once and the map reads as cluttered. */
.map-wrapper :deep(.emitter-label-actor) {
  display: none;
  color: #fff;
  font-family: 'Martian Mono', monospace;
  font-size: 7pt;
  line-height: 1.3;
  max-width: 150px;
  text-align: left;
  white-space: normal;
}

.map-wrapper :deep(.emitter-marker.is-selected) .emitter-label-actor {
  display: block;
}

.map-wrapper :deep(.receiver-marker) {
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.map-wrapper :deep(.receiver-pin) {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  background: #fc7c6a;
  border: 1px solid #fff;
  border-radius: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

/* Country-name pill next to each receiver (target) point — white
   rectangle, red text — the inverse of the emitter's own label above.
   Column, not a single line — the target audience sits below the
   country name. */
.map-wrapper :deep(.receiver-label) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 3px 8px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.map-wrapper :deep(.receiver-label-country) {
  color: #d9291c;
  font-family: 'Martian Mono', monospace;
  font-weight: 700;
  font-size: 9pt;
  white-space: nowrap;
}

.map-wrapper :deep(.receiver-label-target) {
  color: #d9291c;
  font-family: 'Martian Mono', monospace;
  font-size: 7pt;
  line-height: 1.3;
  max-width: 150px;
  text-align: left;
  white-space: normal;
}

/* Mapbox's own wordmark control — always added regardless of the
   `attributionControl` map option above, hidden here per the design
   reference's chrome-free map. */
.map-wrapper :deep(.mapboxgl-ctrl-logo) {
  display: none !important;
}
</style>
