<script setup lang="ts">
const page = await useKirbyPage('page:tools', "page('tools')", 'tools')
</script>

<template>
  <TemplateTools :page="page" />
</template>
