<script setup lang="ts">
// `about`'s blueprint (DECODE.cms/site/blueprints/pages/about.yml) is still
// just TODO comments — no fields yet, so this renders via TemplateFallback
// (title only) until that blueprint is filled in.
const page = await useKirbyPage("page:about", "page('about')", 'about')
</script>

<template>
  <TemplateFallback :page="page" />
</template>
