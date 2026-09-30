import { track } from './track.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s, c = document) => c.querySelector(s);

let kbdOpen = false;

const ROOT = document.documentElement;
let anim = 0, tok = 0;

function targetTop() {
  const sec = $('#formulario');
  return Math.max(0, Math.round(sec.getBoundingClientRect().top + scrollY - (innerWidth >= 1024 ? 64 : 0)));
}

/** Rola até o formulário de forma robusta: recalcula o alvo a cada frame (imagens lazy, refresh do ScrollTrigger e
 *  pin-spacers podem mover o alvo) e só termina quando estabiliza. Foca #f-nome ao final. */
export function scrollToForm({ focus = true, instant = false, hash = true } = {}) {
  cancelAnimationFrame(anim);
  const my = ++tok;
  const reduce = RM.matches || instant;
  ROOT.dataset.scrolling = '1';
  const from = scrollY, t0 = performance.now();
  const dur = reduce ? 0 : Math.min(900, 380 + Math.abs(targetTop() - from) * 0.05);
  let cancelled = false, settle = 0;
  const stop = () => { cancelled = true; cancelAnimationFrame(anim); cleanup(); delete ROOT.dataset.scrolling; };
  const evs = ['wheel', 'touchstart', 'keydown', 'mousedown'];
  const cleanup = () => evs.forEach((e) => removeEventListener(e, stop));
  evs.forEach((e) => addEventListener(e, stop, { passive: true, once: true }));
  const finish = () => {
    cleanup();
    delete ROOT.dataset.scrolling;
    if (focus) { const f = $('#f-nome'); if (f) f.focus({ preventScroll: true }); }
  };
  const step = (now) => {
    if (cancelled || my !== tok) return;
    const p = dur ? Math.min(1, (now - t0) / dur) : 1;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const tgt = targetTop();
    scrollTo({ top: from + (tgt - from) * e, behavior: 'instant' });
    if (p < 1) { anim = requestAnimationFrame(step); return; }
    // estabilização: confere o alvo algumas vezes (layout pode ter mudado)
    if (Math.abs(scrollY - tgt) > 3 && settle < 6) { settle++; anim = requestAnimationFrame(step); return; }
    if (settle < 3) { settle = Math.max(settle, 3); setTimeout(() => { if (!cancelled && my === tok) anim = requestAnimationFrame(step); }, 160); return; }
    finish();
  };
  anim = requestAnimationFrame(step);
  if (hash) { try { history.replaceState(null, '', '#diagnostico'); } catch (e) {} }
}

/** Deep link /#diagnostico: o navegador rola antes das imagens lazy; realinha depois do load e do refresh do ScrollTrigger. */
function initDeepLink() {
  if (location.hash !== '#diagnostico' && location.hash !== '#formulario') return;
  let moved = false;
  ['wheel', 'touchstart', 'keydown'].forEach((e) => addEventListener(e, () => { moved = true; }, { once: true, passive: true }));
  const align = () => { if (!moved) scrollToForm({ instant: true, focus: false, hash: false }); };
  if (document.readyState === 'complete') align(); else addEventListener('load', align, { once: true });
  addEventListener('lp:refreshed', align);
  setTimeout(() => removeEventListener('lp:refreshed', align), 6000);
}

export function initCta() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-cta]');
    if (!a) return;
    e.preventDefault();
    const position = a.closest('#cta-fixed') ? 'sticky' : a.closest('#topbar') ? 'header' : 'inline';
    track('cta_click', { location: a.dataset.trackLocation || 'unknown', label: (a.textContent || '').trim(), position });
    scrollToForm();
  });
  initDeepLink();
  initBars();
}

/** Barra fixa inferior (mobile) e topbar (desktop): entram depois do CTA da hero;
 *  saem no formulário, no CTA final e com teclado aberto. */
function initBars() {
  const bar = $('#cta-fixed'), top = $('#topbar');
  const hero = $('#cta-hero'), form = $('#formulario'), fin = $('#cta-final');
  if (!hero || !form || !fin) return;
  const st = { passed: false, form: false, fin: false };
  const inline = new Set(); // CTAs inline visíveis: a barra fixa some para não duplicar o botão
  const apply = () => {
    const on = st.passed && !st.form && !st.fin && !kbdOpen;
    [bar, top].forEach((el) => {
      if (!el) return;
      const vis = el === bar ? on && inline.size === 0 : on;
      el.classList.toggle('is-on', vis);
      el.setAttribute('aria-hidden', vis ? 'false' : 'true');
      el.toggleAttribute('inert', !vis);
      el.querySelectorAll('a').forEach((a) => (a.tabIndex = vis ? 0 : -1));
    });
  };
  const inIo = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? inline.add(e.target) : inline.delete(e.target))); apply(); }, { threshold: 0.6 });
  document.querySelectorAll('main [data-cta]').forEach((a) => inIo.observe(a));
  new IntersectionObserver(([e]) => { st.passed = !e.isIntersecting && e.boundingClientRect.bottom < 0; apply(); }).observe(hero);
  new IntersectionObserver(([e]) => { st.form = e.intersectionRatio >= 0.2 || (e.isIntersecting && e.boundingClientRect.top < 0 && e.boundingClientRect.bottom > innerHeight * 0.5); apply(); }, { threshold: [0, 0.2, 0.5] }).observe(form);
  new IntersectionObserver(([e]) => { st.fin = e.intersectionRatio >= 0.3; apply(); }, { threshold: [0, 0.3] }).observe(fin);
  const inForm = () => document.activeElement && document.activeElement.closest && document.activeElement.closest('#lead-form');
  document.addEventListener('focusin', (e) => { if (e.target.closest('#lead-form')) { kbdOpen = true; apply(); } });
  document.addEventListener('focusout', () => setTimeout(() => { if (!inForm()) { kbdOpen = false; apply(); } }, 60));
  // viewport visual (barra inferior do IG / teclado virtual)
  const vv = window.visualViewport;
  if (vv) {
    let raf = 0;
    const upd = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const gap = Math.max(0, innerHeight - vv.height - vv.offsetTop);
        document.documentElement.style.setProperty('--vvb', gap > 0 && gap < innerHeight * 0.25 ? gap + 'px' : '0px');
        if (vv.height < innerHeight * 0.75) kbdOpen = true; else if (!inForm()) kbdOpen = false;
        apply();
      });
    };
    vv.addEventListener('resize', upd);
    vv.addEventListener('scroll', upd);
  }
}
