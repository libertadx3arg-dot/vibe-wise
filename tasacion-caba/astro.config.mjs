// Astro: arma páginas rápidas (buen SEO). Cloudflare: hosting gratis con uso comercial permitido.
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  site: 'https://planobase.com.ar',
});
