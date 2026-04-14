<script setup lang="ts">
definePageMeta({ layout: 'default' })

const cardClass =
  'flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-600/60 dark:bg-slate-800 dark:shadow-card-dark dark:hover:border-indigo-400/40 dark:hover:bg-slate-800/95 dark:hover:shadow-lg dark:hover:shadow-black/30'
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
    <div class="mx-auto max-w-2xl text-center">
      <p class="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
        Professional photo editing services
      </p>
      <h1 class="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">
        All your edits handled in one place
      </h1>
      <p class="mt-4 text-lg text-slate-600 dark:text-slate-300">
        From graphic design touchups to advanced retouching, we provide complete photo editing services
        for personal brands, ecommerce, and creative teams.
      </p>
      <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
        <NuxtLink
          to="/login"
          class="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700"
        >
          Get started
        </NuxtLink>
        <NuxtLink
          to="/login"
          class="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Client login
        </NuxtLink>
      </div>
    </div>

    <div class="mt-20 grid items-stretch gap-6 md:grid-cols-3">
      <div :class="cardClass">
        <div class="text-2xl text-slate-700 dark:text-slate-200" aria-hidden="true">📝</div>
        <h2 class="mt-3 font-display font-semibold text-slate-900 dark:text-white">Graphic Editing</h2>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Social media graphics, posters, banners, and branded visuals edited to match your style.
        </p>
      </div>
      <div :class="cardClass">
        <div class="text-2xl text-slate-700 dark:text-slate-200" aria-hidden="true">📊</div>
        <h2 class="mt-3 font-display font-semibold text-slate-900 dark:text-white">Photo Retouching</h2>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Skin cleanup, color correction, light balancing, and high-end portrait retouching.
        </p>
      </div>
      <div :class="cardClass">
        <div class="text-2xl text-slate-700 dark:text-slate-200" aria-hidden="true">📷</div>
        <h2 class="mt-3 font-display font-semibold text-slate-900 dark:text-white">Product Photo Editing</h2>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Background removal, shadow creation, object cleanup, and ecommerce-ready output.
        </p>
      </div>
    </div>
  </div>
</template>
