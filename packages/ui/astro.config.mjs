import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
  server: {
    host: '0.0.0.0',
    port: 4321,
  },
  vite: {
    define: {
      'import.meta.env.MASTRA_API_URL': JSON.stringify(
        process.env.MASTRA_API_URL || 'http://localhost:4111'
      ),
    },
  },
});
