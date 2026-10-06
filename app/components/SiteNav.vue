<script setup lang="ts">
// Keywords (/keywords) is reachable from articles and the home page's
// keyword list, but deliberately not linked here — not a top-level nav item.
const links = [
  { to: '/', label: 'Home' },
  { to: '/guide', label: 'Investigation Guide' },
  { to: '/tools', label: 'TOOLS AGAINST DISINFORMATION' },
  { to: '/resources', label: 'resources' },
  { to: '/about', label: 'ABOUT' },
]
</script>

<template>
  <nav class="site-nav">
    <NuxtLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
  </nav>
</template>
