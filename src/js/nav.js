import { track } from './track.js';

const $ = (s, c = document) => c.querySelector(s);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const conn = navigator.connection || {};
const SLOW = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
const ROOT = document.documentElement;

let anim = 0;

function offset() { const b = $('#site-header .site-header__bar'); return b ? b.offsetHeight : 0; }

/** Rola até a seção recalculando o alvo a cada frame (pin-spacers do ScrollTrigger e imagens lazy movem o layout). */
function scrollToSection(id) {
  const el = id === 'topo' ? document.body : document.getElementById(id);
  if (!el) return;
  cancelAnimationFrame(anim);
  const target = () => (id === 'topo' ? 0 : Math.max(0, Math.round(el.getBoundingClientRect().top + scrollY - offset())));
  const from = scrollY, t0 = performance.now();
  const dur = RM ? 0 : Math.min(900, 380 + Math.abs(target() - from) * 0.05);
  let settle = 0, cancelled = false;
  const evs = ['wheel', 'touchstart', 'keydown'];
  const stop = () => { cancelled = true; cancelAnimationFrame(anim); evs.forEach((e) => removeEventListener(e, stop)); };
  evs.forEach((e) => addEventListener(e, stop, { passive: true, once: true }));
  const step = (now) => {
    if (cancelled) return;
    const p = dur ? Math.min(1, (now - t0) / dur) : 1;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const t = target();
    scrollTo({ top: from + (t - from) * e, behavior: 'instant' });
    if (p < 1 || (Math.abs(scrollY - t) > 3 && settle++ < 6)) { anim = requestAnimationFrame(step); return; }
    stop();
  };
  anim = requestAnimationFrame(step);
  try { history.replaceState(null, '', id === 'topo' ? location.pathname : '#' + id); } catch (e) {}
}

export function initNav() {
  const header = $('#site-header'), btn = $('#menu-btn'), menu = $('#menu'), video = $('#menu-video');
  if (!header || !btn || !menu) return;
  const inertTargets = ['#conteudo', '#cta-fixed'].map((s) => $(s)).filter(Boolean);
  let open = false;

  const setOpen = (v, { restoreFocus = true } = {}) => {
    if (v === open) return;
    open = v;
    btn.setAttribute('aria-expanded', String(v));
    btn.setAttribute('aria-label', v ? 'Fechar menu' : 'Abrir menu');
    header.classList.toggle('is-open', v);
    ROOT.classList.toggle('menu-open', v);
    inertTargets.forEach((el) => el.toggleAttribute('inert', v));
    if (v) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-on'));
      if (video && !RM && !SLOW) {
        if (!video.src) { video.src = video.dataset.src; video.load(); }
        const p = video.play(); if (p && p.catch) p.catch(() => {});
      }
      const first = $('.menu__lista a', menu); if (first) first.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-on');
      if (video) video.pause();
      setTimeout(() => { if (!open) menu.hidden = true; }, RM ? 0 : 320);
      if (restoreFocus) btn.focus({ preventScroll: true });
    }
  };

  btn.addEventListener('click', () => { setOpen(!open); if (open) track('menu_open', {}); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setOpen(false); });
  // 1024+ não tem menu hambúrguer: fecha se redimensionar
  matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setOpen(false, { restoreFocus: false }); });

  // trava o foco dentro do menu aberto
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...menu.querySelectorAll('a[href]')].concat(btn);
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-nav]');
    if (a) {
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      track('nav_click', { target: id, location: a.closest('.menu') ? 'menu' : 'header' });
      const wasOpen = open;
      setOpen(false, { restoreFocus: false });
      // espera o `inert` sair antes de medir/rolar
      setTimeout(() => scrollToSection(id), wasOpen ? 30 : 0);
    } else if (e.target.closest('.menu [data-cta]')) {
      setOpen(false, { restoreFocus: false });
    }
  });

  // fundo sólido depois que sai do topo + link da seção atual
  const links = [...header.querySelectorAll('.site-header__nav a')];
  const secs = links.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
  let raf = 0;
  const update = () => {
    raf = 0;
    header.classList.toggle('is-solid', scrollY > 24);
    const line = offset() + innerHeight * 0.3;
    let cur = -1;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= line) cur = i; });
    // do formulário em diante nenhum link fica ativo
    const form = document.getElementById('formulario');
    if (form && form.getBoundingClientRect().top <= line) cur = -1;
    links.forEach((a, i) => (i === cur ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', update);
  update();
}
