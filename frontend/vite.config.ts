import { writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { SITEMAP_PATHS, SITE_URL } from './src/data/seo';

function sitemapPlugin(): Plugin {
  return {
    name: 'sitemap-generator',
    apply: 'build',
    closeBundle() {
      const today = new Date().toISOString().slice(0, 10);
      const urls = SITEMAP_PATHS.map(({ path: p, changeFrequency, priority }) => {
        const loc = `${SITE_URL}${p === '/' ? '' : p}`;
        return [
          '  <url>',
          `    <loc>${loc}</loc>`,
          `    <lastmod>${today}</lastmod>`,
          `    <changefreq>${changeFrequency}</changefreq>`,
          `    <priority>${priority.toFixed(2)}</priority>`,
          '  </url>',
        ].join('\n');
      });
      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        '',
      ].join('\n');
      const outDir = path.resolve(__dirname, 'dist');
      writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf8');
      console.log(`[sitemap] wrote ${urls.length} URLs to dist/sitemap.xml`);
    },
  };
}

export default defineConfig({
  plugins: [react(), sitemapPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: true, // Allow all hostnames (gentletap.co, www.gentletap.co, custom domains)
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
