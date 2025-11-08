import { defineConfig, type DefaultTheme, type HeadConfig } from 'vitepress'
import { SearchPlugin } from 'vitepress-plugin-search'

const sharedHead: HeadConfig[] = [
  ['meta', { name: 'theme-color', content: '#2563eb' }],
  ['meta', { name: 'description', content: 'Nura.js is the universal framework for voice copilots and automation-friendly experiences.' }],
  ['link', { rel: 'icon', href: '/assets/nura-logo.svg' }],
  ['link', { rel: 'manifest', href: '/manifest.json' }],
  ['meta', { property: 'og:title', content: 'Nura.js Documentation' }],
  ['meta', { property: 'og:description', content: 'Build accessible voice and automation copilots with Nura.js.' }],
  ['meta', { property: 'og:type', content: 'website' }],
  ['meta', { property: 'og:url', content: 'https://docs.nura.dev' }],
  ['meta', { property: 'og:image', content: 'https://docs.nura.dev/assets/nura-logo.svg' }],
  ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ['meta', { name: 'twitter:title', content: 'Nura.js Documentation' }],
  ['meta', { name: 'twitter:description', content: 'Build accessible voice and automation copilots with Nura.js.' }],
  ['link', { rel: 'canonical', href: 'https://docs.nura.dev' }],
]

const enSidebar: DefaultTheme.Sidebar = {
  '/modules/': [
    {
      text: 'Modules',
      items: [
        { text: 'Intents', link: '/modules/intents' },
        { text: 'Transport HTTP', link: '/modules/transport-http' },
        { text: 'Client', link: '/modules/client' },
      ],
    },
  ],
  '/guide/': [
    {
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/guide/introduction' },
        { text: 'Getting Started', link: '/guide/getting-started' },
      ],
    },
  ],
  '/tutorials/': [
    {
      text: 'Examples',
      items: [{ text: 'Recipes', link: '/tutorials/recipes' }],
    },
  ],
  '/api/': [
    {
      text: 'API',
      items: [
        { text: 'Overview', link: '/api/' },
        { text: 'Packages', link: '/api/packages/' },
      ],
    },
  ],
  '/internals/': [
    {
      text: 'Internals',
      items: [
        { text: 'Architecture', link: '/internals/architecture' },
        { text: 'MCP Integration', link: '/internals/mcp' },
      ],
    },
  ],
  '/community/': [
    {
      text: 'Community',
      items: [
        { text: 'Roadmap', link: '/community/roadmap' },
        { text: 'Contributing', link: '/community/contributing' },
        { text: 'Code of Conduct', link: '/community/code-of-conduct' },
        { text: 'Security', link: '/community/security' },
        { text: 'Releasing', link: '/community/releasing' },
      ],
    },
  ],
  '/changelog/': [
    {
      text: 'Changelog',
      items: [{ text: 'Release notes', link: '/changelog/' }],
    },
  ],
}

const esSidebar: DefaultTheme.Sidebar = {
  '/es/guide/': [
    {
      text: 'Guía',
      items: [
        { text: 'Introducción', link: '/es/guide/introduction' },
        { text: 'Inicio rápido', link: '/es/guide/getting-started' },
      ],
    },
  ],
  '/es/tutorials/': [
    {
      text: 'Ejemplos',
      items: [{ text: 'Recetas', link: '/es/tutorials/recipes' }],
    },
  ],
  '/es/api/': [
    {
      text: 'API',
      items: [{ text: 'Visión general', link: '/es/api/' }],
    },
  ],
  '/es/community/': [
    {
      text: 'Comunidad',
      items: [{ text: 'Cómo participar', link: '/es/community/' }],
    },
  ],
  '/es/changelog/': [
    {
      text: 'Registro de cambios',
      items: [{ text: 'Notas de lanzamiento', link: '/es/changelog/' }],
    },
  ],
}

const sharedNavEn: DefaultTheme.NavItem[] = [
  { text: 'Home', link: '/' },
  { text: 'Modules', link: '/modules/intents' },
  { text: 'Guide', link: '/guide/introduction' },
  { text: 'API', link: '/api/' },
  { text: 'Examples', link: '/tutorials/recipes' },
  { text: 'Community', link: '/community/roadmap' },
  { text: 'Changelog', link: '/changelog/' },
]

const sharedNavEs: DefaultTheme.NavItem[] = [
  { text: 'Inicio', link: '/es/' },
  { text: 'Guía', link: '/es/guide/introduction' },
  { text: 'API', link: '/es/api/' },
  { text: 'Ejemplos', link: '/es/tutorials/recipes' },
  { text: 'Comunidad', link: '/es/community/' },
  { text: 'Registro', link: '/es/changelog/' },
]

export default defineConfig({
  title: 'Nura.js',
  description: 'Universal framework for voice copilots and automation AI experiences.',
  lang: 'en-US',
  lastUpdated: true,
  cleanUrls: true,
  appearance: true,
  sitemap: {
    hostname: 'https://docs.nura.dev',
  },
  head: sharedHead,
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: sharedNavEn,
        sidebar: enSidebar,
      },
    },
    es: {
      label: 'Español',
      lang: 'es-ES',
      link: '/es/',
      themeConfig: {
        nav: sharedNavEs,
        sidebar: esSidebar,
      },
    },
  },
  themeConfig: {
    logo: '/assets/nura-logo.svg',
    siteTitle: 'Nura.js',
    outline: [2, 3],
    lastUpdatedText: 'Last updated',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/nura-ai/nura' },
      { icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2Zm.1 3.3c-.9 0-1.6.7-1.6 1.6v6.7c0 .9.7 1.6 1.6 1.6h3.2c.9 0 1.6-.7 1.6-1.6V6.9c0-.9-.7-1.6-1.6-1.6Zm-4.6 2.4c-.6 0-1.1.5-1.1 1.1v7.8c0 .6.5 1.1 1.1 1.1h3.4c.6 0 1.1-.5 1.1-1.1v-7.8c0-.6-.5-1.1-1.1-1.1Z"/></svg>' },
        link: 'https://www.npmjs.com/org/nura',
      },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: '© ' + new Date().getFullYear() + ' Nura.js Maintainers',
    },
    docFooter: {
      prev: 'Previous page',
      next: 'Next page',
    },
  },
  vite: {
    plugins: [
      SearchPlugin({
        tokenize: 'forward',
        previewLength: 62,
        buttonLabel: 'Search docs',
        placeholder: 'Search the docs',
      }),
    ],
  },
})
