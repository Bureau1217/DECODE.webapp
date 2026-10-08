<script setup lang="ts">
// Ported from DECODE.map (app/components/MapFilters.vue) — same behavior
// (one open tab at a time, selecting the active option again clears it),
// restyled to the site's own Martian Mono/brown palette instead of that
// project's own design system.
const props = defineProps<{
  filterOptions: { emitter: string[], platform: string[], period: string[] }
  modelValue: { type: 'emitter' | 'platform' | 'period', value: string } | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: { type: 'emitter' | 'platform' | 'period', value: string } | null]
}>()

const openTab = ref<'emitter' | 'platform' | 'period' | null>(null)

const tabs: { key: 'emitter' | 'platform' | 'period', label: string }[] = [
  { key: 'emitter', label: 'Emitter country' },
  { key: 'platform', label: 'Platform' },
  { key: 'period', label: 'Period' },
]

function selectAll() {
  openTab.value = null
  emit('update:modelValue', null)
}

function toggleTab(key: 'emitter' | 'platform' | 'period') {
  openTab.value = openTab.value === key ? null : key
}

function selectOption(type: 'emitter' | 'platform' | 'period', value: string) {
  if (props.modelValue?.type === type && props.modelValue?.value === value) {
    emit('update:modelValue', null)
    openTab.value = null
  } else {
    emit('update:modelValue', { type, value })
  }
}

function isTabActive(key: string) {
  return props.modelValue?.type === key
}
</script>

<template>
  <div class="map-filters">
    <div class="filter-tabs">
      <button type="button" class="filter-tab" :class="{ active: !modelValue }" @click="selectAll">All</button>
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="filter-tab"
        :class="{ active: isTabActive(tab.key) || openTab === tab.key }"
        @click="toggleTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="openTab && filterOptions[openTab]?.length" class="filter-options">
      <button
        v-for="opt in filterOptions[openTab]"
        :key="opt"
        type="button"
        class="filter-option"
        :class="{ active: modelValue?.type === openTab && modelValue?.value === opt }"
        @click="selectOption(openTab, opt)"
      >
        {{ opt }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.map-filters {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: 'Martian Mono', monospace;
}

.filter-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-tab {
  appearance: none;
  cursor: pointer;
  padding: 6px 12px;
  border: 1px solid #fc7c6a;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.92);
  color: #e2654f;
  font-family: inherit;
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.filter-tab.active {
  background: #fc7c6a;
  color: #fff;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 260px;
}

.filter-option {
  appearance: none;
  cursor: pointer;
  padding: 4px 10px;
  border: 1px solid rgba(252, 124, 106, 0.4);
  border-radius: 0;
  background: rgba(255, 255, 255, 0.92);
  color: #e2654f;
  font-family: inherit;
  font-size: 8pt;
  text-transform: uppercase;
}

.filter-option.active {
  background: #e2654f;
  color: #fff;
  border-color: #e2654f;
}
</style>
