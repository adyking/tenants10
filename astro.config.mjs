import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://tenants10.com',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de', 'fr', 'it'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
