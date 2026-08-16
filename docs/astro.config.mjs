// @ts-check
import { fileURLToPath } from 'node:url'
import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import starlightLinksValidator from 'starlight-links-validator'

const templatesDir = fileURLToPath(new URL('../templates/react/ts', import.meta.url))

export default defineConfig({
  site: 'https://naay99999.github.io',
  base: '/react-thai-zip',
  integrations: [
    starlight({
      title: 'react-thaizip',
      description: 'Ready-to-use Thai address components for React and Next.js',
      defaultLocale: 'root',
      locales: {
        root: { label: 'ไทย', lang: 'th' },
        en: { label: 'English', lang: 'en' },
      },
      customCss: ['./src/styles/component-demo.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/naay99999/react-thai-zip' },
      ],
      plugins: [starlightLinksValidator({ errorOnRelativeLinks: false })],
      sidebar: [{ label: 'Core API', link: 'https://naay99999.github.io/thai-zip/' }],
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { '@': templatesDir },
      dedupe: ['react', 'react-dom'],
    },
  },
})
