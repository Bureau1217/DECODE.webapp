<script setup lang="ts">
const page = await useKirbyPage('page:about', "page('about')", 'about')

// "Title of the website" (SiteFooter.vue's own "DE.CO.DE" brand text) —
// not a field on the about page itself, it's the separate site_infos
// singleton (content/infos/) — reused here instead of hardcoding the
// same string a second place.
const siteInfos = await useKirbyPage('page:infos', "page('infos')", 'site_infos')

usePageSeo({
  title: () => cmsText(page.value, 'title') ?? 'About',
  description: () => cmsText(page.value, 'header_subtitle') ?? cmsText(siteInfos.value, 'long_description'),
})
</script>

<template>
  <TemplateAbout :page="page" :site-title="siteInfos.title" />
</template>
