// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
  ],

  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },

  supabase: {
    // Must be set or every Auth/REST call fails with "No API key found in request"
    url: process.env.SUPABASE_URL,
    key:
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    // localStorage + PKCE is more reliable for OAuth on localhost than chunked cookies.
    // Nitro routes accept Authorization: Bearer from composables/useApiFetch.ts.
    useSsrCookies: false,
    // `secure: true` cookies are not stored on http://localhost in some browsers — breaks OAuth return.
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      // With useSsrCookies: false the server has no session; skip global SSR redirect so
      // client middleware (client-only / owner) can enforce auth after localStorage hydrates.
      exclude: ['/', '/login', '/confirm', '/submit*', '/my-requests*', '/dashboard*'],
    },
  },

  runtimeConfig: {
    // Server-only: Nitro does not expose arbitrary process.env to route handlers; these must be in runtimeConfig.
    // .env keys DATABASE_URL / SUPABASE_JWT_SECRET are read when the config loads (or set NUXT_DATABASE_URL / NUXT_SUPABASE_JWT_SECRET at runtime).
    databaseUrl: process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL || '',
    supabaseJwtSecret:
      process.env.NUXT_SUPABASE_JWT_SECRET || process.env.SUPABASE_JWT_SECRET || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },

  nitro: {
    // Keep runtime deps external, but force tracing so serverless bundles include them.
    externals: {
      external: ['postgraphile', 'pg', 'jsonwebtoken'],
      traceInclude: ['node_modules/postgraphile/**/*', 'node_modules/pg/**/*'],
    },
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'EyanGraFix',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'EyanGraFix — professional graphic and photo editing services.',
        },
      ],
      link: [
        // .ico first: many browsers still request /favicon.ico; ours is generated from the logo PNGs.
        { rel: 'icon', href: '/favicon.ico?v=6', sizes: 'any' },
        { rel: 'shortcut icon', href: '/favicon.ico?v=6' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png?v=6' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png?v=6' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/favicon.png?v=6' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png?v=6' },
      ],
    },
  },
})
