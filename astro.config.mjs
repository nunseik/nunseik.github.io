import { defineConfig } from 'astro/config';

// User site: served from https://nunseik.github.io/ (repo: nunseik/nunseik.github.io)
export default defineConfig({
  site: 'https://nunseik.github.io',
  trailingSlash: 'always',
  markdown: {
    shikiConfig: { theme: 'vitesse-black' },
  },
});
