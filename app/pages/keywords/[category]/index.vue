<script setup lang="ts">
// `category` is any root page with template `tags` (themes, concepts,
// platforms, question, …) — `/keywords` is a Nuxt-only namespace, these
// still live at Kirby root with no `keywords` prefix.
const route = useRoute()
const category = assertSafeKirbyId(String(route.params.category))

const page = await useKirbyPage(`keywords:${category}`, `page('${category}')`, 'tags', { exact: true })

const language = useLanguage()
// Its own description, instead of the site's. A category added later says what it can.
const DESCRIPTIONS: Record<string, { en: string, fr: string }> = {
  concepts: {
    en: 'Key concepts of online disinformation, defined: astroturfing, bot networks, deepfakes, echo chambers, malinformation, synthetic media and more.',
    fr: 'Les concepts clés de la désinformation en ligne, définis : astroturfing, réseaux de bots, deepfakes, chambres d’écho, malinformation et plus encore.',
  },
  platforms: {
    en: 'How disinformation spreads on TikTok, Facebook, X, Instagram, Telegram and YouTube, and what to look out for on each platform.',
    fr: 'Comment la désinformation circule sur TikTok, Facebook, X, Instagram, Telegram et YouTube, et à quoi faire attention sur chaque plateforme.',
  },
  question: {
    en: 'Practical questions about disinformation: how to recognize a coordinated campaign, spot manipulated images and understand the role of algorithms.',
    fr: 'Questions pratiques sur la désinformation : reconnaître une campagne coordonnée, repérer une image manipulée, comprendre le rôle des algorithmes.',
  },
  themes: {
    en: 'The themes running through online disinformation: AI, politics, psychology, social media, filter bubbles and visual verification.',
    fr: 'Les grands thèmes de la désinformation en ligne : IA, politique, psychologie, réseaux sociaux, bulles de filtre et vérification visuelle.',
  },
}
usePageSeo({
  title: () => cmsText(page.value, 'title'),
  description: () => {
    const fr = language.value === 'fr'
    const known = DESCRIPTIONS[category]
    if (known) return fr ? known.fr : known.en
    const title = cmsText(page.value, 'title')
    return title && (fr ? `${title} : mots-clés du guide DE.CO.DE sur la désinformation.` : `${title}: keywords from the DE.CO.DE guide to disinformation.`)
  },
})
useBreadcrumbJsonLd(() => [
  [language.value === 'fr' ? 'Mots-clés' : 'Keywords', '/keywords'],
  [cmsText(page.value, 'title') ?? category, route.path],
])
</script>

<template>
  <TemplateTags :page="page" />
</template>
