import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'ScaleRepublic API',
  description: 'Public trading API documentation for ScaleRepublic',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/stocks' },
      { text: 'Changelog', link: '/api/changelog' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Authentication', link: '/guide/authentication' },
            { text: 'Rate limits', link: '/guide/rate-limits' },
            { text: 'Errors', link: '/guide/errors' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Stocks', link: '/api/stocks' },
            { text: 'Portfolio', link: '/api/portfolio' },
            { text: 'Changelog', link: '/api/changelog' },
          ],
        },
      ],
    },
  },
});
