<script setup lang="ts">
// Ensures tab title + favicon links are present after client navigation (mirrors nuxt.config head).
useHead({
  titleTemplate: (titleChunk) =>
    titleChunk && titleChunk !== 'EyanGraFix' ? `${titleChunk} · EyanGraFix` : 'EyanGraFix',
  link: [
    { rel: 'icon', href: '/favicon.ico?v=6', sizes: 'any' },
    { rel: 'shortcut icon', href: '/favicon.ico?v=6' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png?v=6' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png?v=6' },
    { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/favicon.png?v=6' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png?v=6' },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppToasts />
</template>
