<script setup lang="ts">
defineProps<{
  page: {
    title: string
    slug: string
    template?: string
  }
}>()
</script>

<template>
  <!--
    Generic placeholder for any `intendedTemplate` with no dedicated
    component/select below — currently covers `about`
    (DECODE.cms/site/blueprints/pages/about.yml is still just TODO
    comments, no fields). Replace with a dedicated TemplateAbout.vue + an
    entry in app/kql/page-selects.ts once that blueprint has real fields.
  -->
  <article />
</template>
