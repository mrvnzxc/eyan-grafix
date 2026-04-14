import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgb(0 0 0 / 0.06), 0 12px 40px rgb(0 0 0 / 0.06)',
        'card-dark': '0 1px 3px rgb(0 0 0 / 0.35), 0 12px 40px rgb(0 0 0 / 0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config
