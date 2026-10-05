// Copia apenas os assets usados para public/ e gera OG, favicon e apple-touch-icon.
// Uso: npm run assets  (idempotente; a pasta assets/ é a fonte, public/ é o que vai para o build)
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { pathToFileURL } from 'url';
import { makePlaceholders } from './make-placeholders.mjs';

const root = path.resolve(import.meta.dirname, '..');
const A = (...p) => path.join(root, 'assets', ...p);
const P = (...p) => path.join(root, 'public', ...p);
const manifest = JSON.parse(fs.readFileSync(A('manifest.json'), 'utf8'));

// Imagens/vídeos da galeria vêm de src/data/cases.js (fonte única); a lista abaixo cobre o que é usado fora dela.
const { CASES } = await import(pathToFileURL(path.join(root, 'src/data/cases.js')).href);
const EXTRA_IMAGES = [
  'nil-hero-estudio-tablet', 'nil-frontal-poltrona', 'nil-hero-luz-dramatica', 'jaque-retrato-luz',
  'nil-cartazes-feminino-moderno',
];
const galItems = CASES.flatMap((c) => c.items);
export const USED_IMAGES = [...new Set([...EXTRA_IMAGES, ...galItems.filter((i) => i.kind === 'img' && !i.local).map((i) => i.id)])];
const USED_VIDEOS = [...new Set(galItems.filter((i) => i.kind === 'video').map((i) => i.id))];
const MAXW = 1200;

const mk = (d) => fs.mkdirSync(d, { recursive: true });
mk(P('img')); mk(P('video')); mk(P('fonts')); mk(P('brand')); mk(P('og'));

let bytes = 0;
const cp = (src, dst) => { fs.copyFileSync(src, dst); bytes += fs.statSync(dst).size; };

// Imagens: avif + webp em todas as larguras (<=1200), jpg só no fallback (<=800)
for (const id of USED_IMAGES) {
  const im = manifest.images.find((i) => i.id === id);
  if (!im) throw new Error('id fora do manifest: ' + id);
  const ws = im.widths.filter((w) => w <= MAXW);
  for (const w of ws) for (const ext of ['avif', 'webp']) cp(A('img', `${id}-${w}.${ext}`), P('img', `${id}-${w}.${ext}`));
  const fb = Math.max(...ws.filter((w) => w <= 800));
  cp(A('img', `${id}-${fb}.jpg`), P('img', `${id}-${fb}.jpg`));
}

// Vídeos: só a versão 720 em MP4/H.264 (toca em todo lugar; webm descartado por peso) e poster reduzido (540w)
for (const id of USED_VIDEOS) {
  // versão anonimizada (rostos e crachás borrados, enquadramento fechado): ver scripts/video-anon/anon.py
  cp(A('video', `${id}-720-anon.mp4`), P('video', `${id}-720.mp4`));
  {
    const out = P('video', `${id}-poster.webp`);
    await sharp(A('video', `${id}-poster-anon.jpg`)).resize({ width: 540 }).webp({ quality: 70 }).toFile(out);
    bytes += fs.statSync(out).size;
  }
}

// Logos
for (const f of ['logo-white-480.webp', 'logo-white-960.webp']) cp(A('brand', f), P('brand', f));

// Fontes (latin, variáveis, woff2) vindas do npm
const fontMap = {
  'inter-latin-wght-normal.woff2': '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  'libre-baskerville-latin-400-italic.woff2': '@fontsource/libre-baskerville/files/libre-baskerville-latin-400-italic.woff2',
  'jetbrains-mono-latin-wght-normal.woff2': '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
};
for (const [n, s] of Object.entries(fontMap)) cp(path.join(root, 'node_modules', s), P('fonts', n));

// Favicon SVG (ícone Pixel Rain em branco sobre grafite) + apple-touch-icon
const iconSvg = fs.readFileSync(A('brand', 'ICONE WHITE.svg'), 'utf8');
const inner = iconSvg.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-700 -560 4628 4628"><rect x="-700" y="-560" width="4628" height="4628" fill="#111214"/>${inner}</svg>`;
fs.writeFileSync(P('favicon.svg'), favicon);
await sharp(Buffer.from(favicon)).resize(180, 180).png().toFile(P('apple-touch-icon.png'));

// OG 1200x630: retrato P&B à direita, grafite à esquerda, logo + frase do Hero
const portrait = await sharp(A('img', 'nil-hero-estudio-tablet-1200.jpg'))
  .resize(560, 630, { fit: 'cover', position: sharp.gravity.north }).grayscale().modulate({ brightness: 0.92 }).linear(1.18, -12).toBuffer();
const fade = Buffer.from(`<svg width="560" height="630"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#111214" stop-opacity="1"/><stop offset=".45" stop-color="#111214" stop-opacity="0"/></linearGradient></defs><rect width="560" height="630" fill="url(#g)"/></svg>`);
const logo = await sharp(A('brand', 'logo-white-480.png')).resize({ width: 190 }).toBuffer();
const text = Buffer.from(`<svg width="700" height="420" xmlns="http://www.w3.org/2000/svg">
<style>.a{font:800 62px Arial,Helvetica,sans-serif;fill:#F1F2EE;letter-spacing:-2px}.b{font:700 22px Arial,Helvetica,sans-serif;fill:#A8ADB2}</style>
<text class="a" x="0" y="70">Seu negócio</text><text class="a" x="0" y="140">cresceu.</text>
<text class="a" x="0" y="230">Sua marca</text><text class="a" x="0" y="300">acompanhou?</text>
<rect x="0" y="342" width="56" height="4" fill="#C94B3F"/>
<text class="b" x="0" y="392">Diagnóstico de Percepção de Marca</text></svg>`);
const og = P('og', 'og-diagnostico-1200x630.jpg');
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#111214' } })
  .composite([{ input: portrait, left: 640, top: 0 }, { input: fade, left: 640, top: 0 }, { input: logo, left: 64, top: 52 }, { input: text, left: 64, top: 120 }])
  .jpeg({ quality: 82, mozjpeg: true }).toFile(og);
bytes += fs.statSync(og).size;

const nph = await makePlaceholders();
console.log(`public/ pronto (${nph} placeholders). ${(bytes / 1024 / 1024).toFixed(1)} MB copiados/gerados.`);
