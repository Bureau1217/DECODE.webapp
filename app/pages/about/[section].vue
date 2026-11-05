<script setup lang="ts">
// Legal terms and Credits (TeamPanel.vue's two links): CMS text on the about
// page, opened in the right panel beside the team.
const route = useRoute()
const language = useLanguage()
const SECTIONS: Record<string, { field: 'legal_content' | 'credits_content', en: string, fr: string }> = {
  legal: { field: 'legal_content', en: 'Legal terms', fr: 'Mentions légales' },
  credits: { field: 'credits_content', en: 'Credits', fr: 'Crédits' },
}
const section = computed(() => SECTIONS[route.params.section as string])
if (!section.value) throw createError({ statusCode: 404, statusMessage: 'Page non trouvée' })

const page = await useKirbyPage<{ legal_content?: ContentBlock[], credits_content?: ContentBlock[] }>('page:about', "page('about')", 'about')
const title = computed(() => (language.value === 'fr' ? section.value!.fr : section.value!.en))

usePageSeo({
  title: () => title.value,
  description: () => cmsText({ text: page.value?.[section.value!.field]?.[0]?.content?.text }, 'text'),
})
</script>

<template>
  <TemplateAboutSection :title="title" :blocks="page?.[section!.field] ?? []" />
</template>
