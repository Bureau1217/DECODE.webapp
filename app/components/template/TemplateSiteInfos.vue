<script setup lang="ts">
defineProps<{
  page: {
    title: string
    slug: string
    sentences?: { sentence: string }[]
    header_subtitle?: string
    long_description?: string
    informations?: string
  }
}>()
</script>

<template>
  <article>
    <h1>{{ page.title }}</h1>
    <ul v-if="page.sentences?.length">
      <li v-for="(item, index) in page.sentences" :key="index">{{ item.sentence }}</li>
    </ul>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p v-if="page.header_subtitle" v-html="page.header_subtitle" />
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="page.long_description" v-html="page.long_description" />
    <!-- `informations`: scrolling ticker text — add the actual scroll animation (CSS/JS) here. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="page.informations" class="ticker" v-html="page.informations" />
  </article>
</template>
