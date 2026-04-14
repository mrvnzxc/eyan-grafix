<template>
  <NuxtLayout name="default">
    <div class="flex min-h-[calc(100vh-8rem)] flex-col bg-slate-50 dark:bg-slate-950 md:flex-row">
      <DashboardSidebar />
      <div class="flex-1 overflow-auto p-4 md:p-8">
        <slot />
      </div>
    </div>
  </NuxtLayout>
</template>
