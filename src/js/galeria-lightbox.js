// Lightbox da galeria de cases. <dialog> modal criado sob demanda; uma instância reutilizada.
// API: initLightbox(root) (delegação em .gal__btn) e openLightbox(caseId, index, opener).
// Eventos (document): galeria:open / galeria:close, detail {caseId, index}.
import { CASES, WIDTHS } from '../data/cases.js';

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const srcset = (id, ext, ws) => ws.map((w) => `/img/${id}-${w}.${ext} ${w}w`).join(', ');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const ICON = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_PREV = ICON('M15 5l-7 7 7 7');
const ICON_NEXT = ICON('M9 5l7 7-7 7');
const ICON_X = ICON('M6 6l12 12M18 6L6 18');

let dlg, els, state = null, bound = null;
const caseById = (id) => CASES.find((c) => c.id === id);
const phSrc = (cs, i) => `/galeria/ph/${cs.id}-${pad(i + 1)}.svg`;

function pictureHtml(it, cs, i, thumb = false) {
  const alt = thumb ? '' : it.alt || `${cs.nome}, imagem ${i + 1}`;
  if (it.kind === 'ph') return `<img src="${phSrc(cs, i)}" alt="${esc(alt)}" width="${it.w}" height="${it.h}" decoding="async">`;
  if (it.kind === 'video') return `<picture class="foto"><img src="/video/${it.id}-poster.webp" alt="${esc(alt)}" width="${it.w}" height="${it.h}" decoding="async"></picture>`;
  const sizes = thumb ? '64px' : '100vw';
  const ws = thumb ? [480] : WIDTHS;
  return `<picture class="${it.cor ? 'foto--cor' : 'foto'}"><source type="image/avif" srcset="${srcset(it.id, 'avif', ws)}" sizes="${sizes}"><source type="image/webp" srcset="${srcset(it.id, 'webp', ws)}" sizes="${sizes}">` +
    `<img src="/img/${it.id}-800.jpg" alt="${esc(alt)}" width="${it.w}" height="${it.h}" decoding="async"></picture>`;
}

function build() {
  dlg = document.createElement('dialog');
  dlg.className = 'lb';
  dlg.setAttribute('aria-label', 'Galeria de imagens');
  dlg.innerHTML =
    `<div class="lb__grain" aria-hidden="true"></div>` +
    `<div class="lb__inner">` +
    `<header class="lb__top"><span class="lb__proj label label--plain"></span><span class="lb__count label label--plain" aria-hidden="true"></span>` +
    `<button type="button" class="lb__btn lb__close" aria-label="Fechar galeria">${ICON_X}</button></header>` +
    `<div class="lb__body">` +
    `<button type="button" class="lb__btn lb__nav lb__prev" aria-label="Imagem anterior">${ICON_PREV}</button>` +
    `<div class="lb__media"></div>` +
    `<p class="lb__cap label label--plain"></p>` +
    `<button type="button" class="lb__btn lb__nav lb__next" aria-label="Próxima imagem">${ICON_NEXT}</button>` +
    `</div><div class="lb__thumbs" role="group" aria-label="Miniaturas"></div></div>` +
    `<p class="lb__live" role="status" aria-live="polite"></p><div class="lb__pre" aria-hidden="true"></div>`;
  document.body.appendChild(dlg);
  const q = (s) => dlg.querySelector(s);
  els = { proj: q('.lb__proj'), count: q('.lb__count'), close: q('.lb__close'), prev: q('.lb__prev'), next: q('.lb__next'), media: q('.lb__media'), cap: q('.lb__cap'), thumbs: q('.lb__thumbs'), live: q('.lb__live'), pre: q('.lb__pre') };

  els.close.addEventListener('click', () => closeLightbox());
  els.prev.addEventListener('click', () => go(-1));
  els.next.addEventListener('click', () => go(1));
  els.thumbs.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b && state) show(+b.dataset.i, Math.sign(+b.dataset.i - state.index)); });
  dlg.addEventListener('keydown', onKey);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeLightbox(); }); // Esc: fecha pelo nosso fluxo
  dlg.addEventListener('click', (e) => { const t = e.target; if (t === dlg || t === els.media || t.classList.contains('lb__body') || t.classList.contains('lb__inner')) closeLightbox(); });
  dlg.addEventListener('close', () => { if (state) teardown(); });
  // swipe horizontal na mídia (touch-action: pan-y pinch-zoom no CSS mantém a rolagem vertical)
  let sx = 0, sy = 0, sid = null;
  els.media.addEventListener('pointerdown', (e) => { if (e.target.closest('video') || (e.pointerType === 'mouse' && e.button !== 0)) return; sid = e.pointerId; sx = e.clientX; sy = e.clientY; });
  els.media.addEventListener('pointerup', (e) => {
    if (e.pointerId !== sid || !state) return; sid = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1);
  });
  els.media.addEventListener('pointercancel', () => { sid = null; });
}

function focusables() {
  return [...dlg.querySelectorAll('button:not([disabled]), video[controls]')].filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function onKey(e) {
  if (!state) return;
  if (e.key === 'Tab') {
    const f = focusables(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (e.shiftKey && (a === first || !dlg.contains(a))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (a === last || !dlg.contains(a))) { e.preventDefault(); first.focus(); }
    return;
  }
  if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); return; }
  if (e.target.tagName === 'VIDEO') return; // setas controlam o vídeo focado
  if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  else if (e.key === 'Home') { e.preventDefault(); show(0, -1); }
  else if (e.key === 'End') { e.preventDefault(); show(state.cs.items.length - 1, 1); }
}

function go(d) { if (!state) return; const n = state.cs.items.length; show((state.index + d + n) % n, d); }

function stopVideos() { dlg.querySelectorAll('video').forEach((v) => { try { v.pause(); } catch { /* noop */ } v.removeAttribute('src'); v.load(); }); }

function show(i, dir = 0) {
  const { cs } = state; const it = cs.items[i]; const n = cs.items.length;
  const hadFocusInMedia = els.media.contains(document.activeElement);
  stopVideos();
  state.index = i;
  els.media.innerHTML = it.kind === 'video'
    ? `<video controls muted playsinline preload="none" poster="/video/${it.id}-poster.webp" src="/video/${it.id}-720.mp4" aria-label="${esc(it.alt || it.caption || cs.nome)}"></video>`
    : pictureHtml(it, cs, i);
  if (hadFocusInMedia) els.close.focus({ preventScroll: true });
  els.media.dataset.kind = it.kind;
  const cap = it.kind === 'ph' ? '' : it.caption || '';
  els.cap.textContent = cap ? `[ ${pad(i + 1)} — ${cap} ]` : `[ ${pad(i + 1)} ]`;
  els.count.innerHTML = `<b>${pad(i + 1)}</b> / ${pad(n)}`;
  els.live.textContent = `Imagem ${i + 1} de ${n}${it.alt ? ': ' + it.alt : ''}`;
  els.thumbs.querySelectorAll('[data-i]').forEach((b) => { if (+b.dataset.i === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  const cur = els.thumbs.querySelector('[aria-current]');
  if (cur && els.thumbs.offsetParent !== null) els.thumbs.scrollTo({ left: cur.offsetLeft - els.thumbs.clientWidth / 2 + cur.clientWidth / 2, behavior: 'instant' });
  if (dir && !reduced() && els.media.animate) els.media.animate([{ opacity: 0, transform: `translate3d(${dir * 28}px,0,0)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
  // pré-carrega vizinhas via <picture> escondido (mesma fonte que seria escolhida ao exibir)
  els.pre.innerHTML = [-1, 1].map((d) => cs.items[(i + d + n) % n]).filter((x) => x.kind === 'img').map((x) => pictureHtml(x, cs, 0)).join('');
}

function lockScroll() {
  const de = document.documentElement, y = window.scrollY;
  const sbw = window.innerWidth - de.clientWidth;
  state.prev = { y, htmlSB: de.style.scrollBehavior, htmlOv: de.style.overflow, htmlPr: de.style.paddingRight };
  de.style.scrollBehavior = 'auto';
  de.style.overflow = 'hidden';
  if (sbw > 0) de.style.paddingRight = sbw + 'px';
  if (IOS) { const b = document.body.style; state.prev.body = { pos: b.position, top: b.top, w: b.width }; b.position = 'fixed'; b.top = `-${y}px`; b.width = '100%'; }
}
function unlockScroll() {
  const de = document.documentElement, p = state.prev;
  if (IOS) { const b = document.body.style; b.position = p.body.pos; b.top = p.body.top; b.width = p.body.w; }
  de.style.overflow = p.htmlOv; de.style.paddingRight = p.htmlPr;
  window.scrollTo({ top: p.y, left: 0, behavior: 'instant' });
  if (window.scrollY !== p.y) window.scrollTo(0, p.y);
  requestAnimationFrame(() => { de.style.scrollBehavior = p.htmlSB; });
}

export function openLightbox(caseId, index = 0, opener = null) {
  const cs = caseById(caseId); if (!cs || state) return;
  if (!dlg) build();
  state = { cs, index: 0, opener: opener || document.activeElement, caseId };
  lockScroll();
  const idx = Math.min(Math.max(index | 0, 0), cs.items.length - 1);
  document.dispatchEvent(new CustomEvent('galeria:open', { detail: { caseId, index: idx } }));
  els.proj.textContent = cs.nome;
  dlg.setAttribute('aria-label', `Galeria: ${cs.nome}`);
  els.thumbs.innerHTML = cs.items.map((it, i) => `<button type="button" class="lb__thumb" data-i="${i}" aria-label="Ir para a imagem ${i + 1} de ${cs.items.length}">${pictureHtml(it, cs, i, true)}</button>`).join('');
  els.prev.hidden = els.next.hidden = cs.items.length < 2;
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else { dlg.setAttribute('open', ''); dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); }
  show(idx, 0);
  els.close.focus({ preventScroll: true });
}

function closeLightbox() {
  if (!state) return;
  if (dlg.open && typeof dlg.close === 'function') dlg.close(); // dispara 'close' -> teardown
  else { dlg.removeAttribute('open'); teardown(); }
}

function teardown() {
  const s = state;
  stopVideos();
  els.media.innerHTML = ''; els.pre.innerHTML = ''; els.thumbs.innerHTML = '';
  unlockScroll();
  state = null;
  document.dispatchEvent(new CustomEvent('galeria:close', { detail: { caseId: s.caseId, index: s.index } }));
  const o = s.opener;
  if (o && o.isConnected && typeof o.focus === 'function') o.focus({ preventScroll: true });
  if (window.scrollY !== s.prev.y) window.scrollTo({ top: s.prev.y, behavior: 'instant' });
}

export function initLightbox(root) {
  if (!root || bound === root) return;
  bound = root;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-case][data-index]'); if (!b || !root.contains(b)) return;
    e.preventDefault();
    openLightbox(b.dataset.case, +b.dataset.index || 0, b);
  });
}
