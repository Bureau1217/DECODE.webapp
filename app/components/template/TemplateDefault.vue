<script setup lang="ts">
interface Ref {
  title: string
  slug: string
  id: string
}

interface File {
  url: string
  alt?: string
}

defineProps<{
  page: Ref & {
    header_subtitle?: string
    header_image?: File | null
    page_image_preview?: File | null
    content?: unknown[]
    subpages?: Ref[]
    themes?: Ref[]
    concepts?: Ref[]
    platforms?: Ref[]
    questions?: Ref[]
    tools?: Ref[]
  }
}>()
</script>

<template>
  <article>
    <header>
      <img v-if="page.header_image" :src="page.header_image.url" :alt="page.header_image.alt || page.title">
      <h1>{{ page.title }}</h1>
      <p v-if="page.header_subtitle">{{ page.header_subtitle }}</p>
    </header>

    <!--
      `content` is the raw blocks array (fieldsets: citation, cta, gallery,
      resources, text — see DECODE.cms/site/blueprints/blocks/*.yml).
      Render each block by `type` here once block rendering is built.
    -->
    <pre v-if="page.content?.length">{{ page.content }}</pre>

    <nav v-if="page.subpages?.length">
      <h2>Sous-pages</h2>
      <ul>
        <li v-for="sub in page.subpages" :key="sub.id">
          <!-- `sub.id` is the full path (handles arbitrarily nested default pages). -->
          <NuxtLink :to="`/guide/${sub.id}`">{{ sub.title }}</NuxtLink>
        </li>
      </ul>
    </nav>

    <aside v-if="page.themes?.length || page.concepts?.length || page.platforms?.length || page.questions?.length">
      <h2>Mots-clés</h2>
      <ul>
        <li v-for="tag in page.themes ?? []" :key="tag.id">
          <NuxtLink :to="`/keywords/themes/${tag.slug}`">{{ tag.title }}</NuxtLink>
        </li>
        <li v-for="tag in page.concepts ?? []" :key="tag.id">
          <NuxtLink :to="`/keywords/concepts/${tag.slug}`">{{ tag.title }}</NuxtLink>
        </li>
        <li v-for="tag in page.platforms ?? []" :key="tag.id">
          <NuxtLink :to="`/keywords/platforms/${tag.slug}`">{{ tag.title }}</NuxtLink>
        </li>
        <li v-for="tag in page.questions ?? []" :key="tag.id">
          <NuxtLink :to="`/keywords/question/${tag.slug}`">{{ tag.title }}</NuxtLink>
        </li>
      </ul>
    </aside>

    <aside v-if="page.tools?.length">
      <h2>Outils</h2>
      <ul>
        <li v-for="tool in page.tools" :key="tool.id">
          <NuxtLink :to="`/tools/${tool.slug}`">{{ tool.title }}</NuxtLink>
        </li>
      </ul>
    </aside>
  </article>
</template>
