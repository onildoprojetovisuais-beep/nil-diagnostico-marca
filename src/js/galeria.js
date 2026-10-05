// Galeria de cases (seção 04). Renderiza o DOM do contrato a partir de src/data/cases.js.
import { CASES, WIDTHS } from '../data/cases.js';

// import.meta.glob tolera módulo ausente (dev paralelo): vira {} em vez de erro de resolução
const MODS = import.meta.glob(['./galeria-scroll.js', './galeria-lightbox.js']);
const ARROW = '<svg class="cta__seta" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export const getCases = () => CASES;

// sizes coerente com o CSS (galeria.css): mobile = largura por tamanho em vw; desktop idem.
const SIZES = {
  hero: '(min-width: 768px) 50vw, 80vw',
  l: '(min-width: 768px) 36vw, 72vw',
  m: '(min-width: 768px) 28vw, 62vw',
  s: '(min-width: 768px) 20vw, 46vw',
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
// it.v (cases.js) = versão da imagem: troque ao substituir a foto, pois /img/ é cache immutable
const ver = (it) => (it.v ? `?v=${it.v}` : '');
const srcset = (it, ext, ws) => ws.map((w) => `/img/${it.id}-${w}.${ext}${ver(it)} ${w}w`).join(', ');

const PLAY = '<svg class="gal__play" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="23" fill="rgba(17,18,20,.62)" stroke="#F1F2EE" stroke-width="1.5"/><path d="M19 15.5v17l14-8.5z" fill="#F1F2EE"/></svg>';

function media(it, cs, idx, eager) {
  const dims = `width="${it.w}" height="${it.h}"`;
  const load = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  if (it.kind === 'ph') {
    return `<picture class="pic"><img src="/galeria/ph/${cs.id}-${pad(idx + 1)}.svg" alt="" ${dims} ${load} decoding="async"></picture>`;
  }
  if (it.kind === 'video') {
    return `<picture class="pic pic--video foto"><img src="/video/${it.id}-poster.webp" alt="${esc(it.alt || `${cs.nome}, imagem ${idx + 1}`)}" ${dims} ${load} decoding="async">${PLAY}</picture>`;
  }
  const sizes = SIZES[it.size] || SIZES.m;
  const jpgWs = WIDTHS.filter((w) => w <= 800);
  const pos = it.focal ? ` style="object-position:${esc(it.focal)}"` : '';
  return `<picture class="pic ${it.cor ? 'foto--cor' : 'foto'}">` +
    `<source type="image/avif" srcset="${srcset(it, 'avif', WIDTHS)}" sizes="${sizes}">` +
    `<source type="image/webp" srcset="${srcset(it, 'webp', WIDTHS)}" sizes="${sizes}">` +
    `<img src="/img/${it.id}-800.jpg${ver(it)}" srcset="${srcset(it, 'jpg', jpgWs)}" sizes="${sizes}" alt="${esc(it.alt || `${cs.nome}, imagem ${idx + 1}`)}" ${dims} ${load} decoding="async"${pos}>` +
    `</picture>`;
}

function renderItem(it, cs, idx, ci) {
  const total = cs.items.length;
  const eager = ci === 0 && idx < 2;
  const cap = it.caption || '';
  const mira = it.size === 'hero' || it.size === 'l' ? ' mira' : '';
  const label = `Abrir galeria de ${cs.nome}, ${it.kind === 'video' ? 'vídeo' : 'imagem'} ${idx + 1} de ${total}`;
  return `<li class="gal__item gal__item--${it.size} gal__lift--${it.lift}" data-index="${idx}" style="--i:${idx};--par:${idx % 2 ? 1 : -1};--ar:${(it.w / it.h).toFixed(4)}">` +
    `<button type="button" class="gal__btn${mira}" data-case="${esc(cs.id)}" data-index="${idx}" aria-haspopup="dialog" aria-label="${esc(label)}">${media(it, cs, idx, eager)}</button>` +
    `<span class="gal__cap label label--plain">[ ${pad(idx + 1)}${cap ? ' — ' + esc(cap) : ''} ]</span></li>`;
}

function renderCase(cs, ci) {
  const dir = ci % 2 === 0 ? 'rtl' : 'ltr';
  const desc = cs.desc ? `<p class="gal__desc">${esc(cs.desc)}</p>` : '';
  const shown = cs.items.slice(0, cs.preview || cs.items.length);
  const more = `<button type="button" class="gal__more" data-case="${esc(cs.id)}" data-index="0" aria-haspopup="dialog">Ver projeto · ${cs.items.length} imagens ${ARROW}</button>`;
  return `<section class="gal__case${cs.featured ? ' gal__case--feat' : ''}" data-case="${esc(cs.id)}" data-dir="${dir}" data-i="${ci}" aria-label="${esc(cs.nome)}">` +
    `<header class="gal__meta"><span class="gal__count label label--plain">${pad(ci + 1)} / ${pad(CASES.length)}${cs.featured ? ' — Destaque' : ''}</span><h3 class="gal__title">${esc(cs.nome)}</h3>${desc}${more}</header>` +
    `<ul class="gal__track" aria-label="${esc(cs.nome)}: trilha de imagens">${shown.map((it, i) => renderItem(it, cs, i, ci)).join('')}</ul></section>`;
}

export async function initGaleria() {
  const root = document.querySelector('[data-galeria]');
  if (!root || root.dataset.galeriaReady) return;
  root.dataset.galeriaReady = '1';
  root.classList.add('gal');
  root.innerHTML = `<div class="gal__stage"><div class="gal__cases">${CASES.map(renderCase).join('')}</div></div>`;

  try {
    const load = MODS['./galeria-scroll.js'];
    if (!load) throw new Error('galeria-scroll.js ainda não existe');
    const m = await load();
    if (typeof m.initGaleriaScroll === 'function') m.initGaleriaScroll(root);
    else console.warn('[galeria] initGaleriaScroll ausente');
  } catch (e) { console.warn('[galeria] scroll indisponível', e); }
  try {
    const load = MODS['./galeria-lightbox.js'];
    if (!load) throw new Error('galeria-lightbox.js ainda não existe');
    const m = await load();
    if (typeof m.initLightbox === 'function') m.initLightbox(root);
    else console.warn('[galeria] initLightbox ausente');
  } catch (e) { console.warn('[galeria] lightbox indisponível', e); }
}
