import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'dev-html-transform',
      apply: 'serve',
      transformIndexHtml(html) {
        return html
          .replace(/<link rel="stylesheet"[^>]*assets\/index-[^>]*>/i, '<link rel="stylesheet" href="/src/style.css" />')
          .replace(/<script type="module"[^>]*assets\/index-[^>]*><\/script>/i, '<script type="module" src="/src/main.js"></script>');
      }
    }
  ],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true
  }
});
