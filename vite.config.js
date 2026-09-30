import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync(new URL('./assets/manifest.json', import.meta.url), 'utf8'));
const MAXW = 1200;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

// <x-pic id="..." sizes="..." alt="..." class="..." focal="50% 30%" eager></x-pic>
// vira <picture> AVIF > WebP > JPG com width/height reais (do manifest) => sem CLS.
function picPlugin() {
  return {
    name: 'x-pic',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<x-pic\s+([^>]*?)><\/x-pic>/g, (_, attrs) => {
          const get = (n) => (attrs.match(new RegExp(String.raw`(?:^|\s)` + n + String.raw`="([^"]*)"`)) || [])[1];
          const eager = /(?:^|\s)eager(?:\s|$)/.test(attrs);
          const id = get('id');
          const im = manifest.images.find((i) => i.id === id);
          if (!im) throw new Error(`x-pic: id desconhecido "${id}"`);
          const ws = im.widths.filter((w) => w <= MAXW);
          const fb = Math.max(...ws.filter((w) => w <= 800));
          const set = (ext) => ws.map((w) => `/img/${id}-${w}.${ext} ${w}w`).join(', ');
          const sizes = get('sizes') || '100vw';
          const focal = get('focal') || im.focal;
          const cls = get('class') || '';
          const { width, height } = im.intrinsic;
          return `<picture class="pic ${cls}">` +
            `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` +
            `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
            `<img src="/img/${id}-${fb}.jpg" width="${width}" height="${height}" alt="${esc(get('alt') ?? '')}" ` +
            `style="object-position:${focal}" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}></picture>`;
        }).replace(/%LCP_SRCSET_AVIF%/g, () => {
          const id = 'nil-hero-estudio-tablet';
          const im = manifest.images.find((i) => i.id === id);
          return im.widths.filter((w) => w <= MAXW).map((w) => `/img/${id}-${w}.avif ${w}w`).join(', ');
        });
      },
    },
  };
}

// Aviso de release: produção sem endpoint de leads
function endpointGuard(mode) {
  return {
    name: 'endpoint-guard',
    buildStart() {
      if (mode !== 'production') return;
      const cfg = fs.readFileSync(new URL('./src/config.js', import.meta.url), 'utf8');
      if (/ENDPOINT_URL:\s*''/.test(cfg)) {
        const msg = 'ENDPOINT_URL vazio em src/config.js: em produção o formulário vai falhar explicitamente (nenhum lead será recebido). Configure antes de publicar.';
        // Deploy real (Vercel/CI) sem endpoint: bloqueia. Build local: só avisa. Liberar de propósito: ALLOW_NO_ENDPOINT=1
        if ((process.env.VERCEL || process.env.CI) && !process.env.ALLOW_NO_ENDPOINT) this.error(msg + ' (deploy bloqueado; use ALLOW_NO_ENDPOINT=1 para publicar mesmo assim)');
        this.warn(msg);
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [picPlugin(), endpointGuard(mode)],
  build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 300 },
  server: { host: true },
}));
