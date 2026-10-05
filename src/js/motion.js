// Coreografia GSAP/ScrollTrigger (adaptada de _planning/motion-snippets/motion.js).
// Carregado dinamicamente depois do load e só sem prefers-reduced-motion. Sem Lenis, sem normalizeScroll.
import { gsap } from 'gsap';
import { ScrollTrigger as ST } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ST, SplitText);
document.documentElement.classList.add('js-motion');
ST.config({ ignoreMobileResize: true });

const DIM = '#7C8085', LIT = '#F1F2EE';
const EASE = { out: 'power3.out', inout: 'power2.inOut', none: 'none' };
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => gsap.utils.toArray(s, c);

/* Reveal de headline por máscara de linha (aria-label no original, linhas aria-hidden) */
function revealHeadline(el, { start = 'top 85%', dur = 1.0, stagger = 0.09 } = {}) {
  SplitText.create(el, {
    type: 'lines', mask: 'lines', reduceWhiteSpace: false, linesClass: 'ln', maskClass: 'ln-mask', autoSplit: true, aria: 'auto',
    onSplit: (self) => gsap.from(self.lines, { yPercent: 105, duration: dur, ease: EASE.out, stagger, scrollTrigger: { trigger: el, start, once: true } }),
  });
}

function reveals() {
  ST.batch($$('[data-reveal]'), {
    start: 'top 90%', once: true,
    onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.8, ease: EASE.out, stagger: 0.08, overwrite: true }),
  });
}

function parallax(amt) {
  $$('[data-parallax-wrap]').forEach((w) => {
    const img = $('img', w); if (!img) return;
    gsap.fromTo(img, { yPercent: -amt, scale: 1.12 }, { yPercent: amt, scale: 1.12, ease: 'none',
      scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  });
}

/* destaques em serifada itálica (.hl): o bloco pai ganha .is-in ao entrar; o CSS desenha o pincel/círculo.
   Gatilho no bloco (não no span) porque o SplitText refaz o DOM das linhas ao redimensionar. */
function marks() {
  new Set($$('.hl').map((h) => h.closest('h1, h2, h3, p'))).forEach((b) => {
    if (b) ST.create({ trigger: b, start: 'top 88%', once: true, onEnter: () => b.classList.add('is-in') });
  });
}

function progressBar() {
  const bar = $('#read-progress'); if (!bar) return;
  gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });
}

function hero(desktop) {
  if (!desktop) return;
  gsap.to('#hero [data-hero-inner]', { yPercent: -6, opacity: 0.2, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
}

/* 02: título em linhas, trilho vermelho por eixo (scrub), eixo ativo (desktop) */
function diagnostico(desktop) {
  const axes = $$('#diag .axis');
  // acordeão muda a altura da página: recalcula os gatilhos depois de abrir/fechar
  $$('#diag .axis__d').forEach((d) => d.addEventListener('toggle', () => ST.refresh()));
  axes.forEach((ax) => {
    const ln = $('[data-axis-line]', ax);
    if (ln) gsap.fromTo(ln, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: ax, start: 'top 75%', end: 'bottom 55%', scrub: true } });
    gsap.from(ax, { opacity: 0, y: 28, duration: 0.8, ease: EASE.out, scrollTrigger: { trigger: ax, start: 'top 90%', once: true } });
  });
  if (desktop) {
    // eixo ativo destacado por cor (h3) e trilho, sem baixar opacidade do texto (contraste AA)
    axes.forEach((ax) => ST.create({ trigger: ax, start: 'top 58%', end: 'bottom 58%',
      onToggle: (s) => ax.classList.toggle('is-active', s.isActive) }));
  }
}

/* 01b: declaração editorial — palavras acendem com a rolagem (cor final de cada palavra vem do CSS) */
function intro(desktop) {
  const decl = $('#intro .intro__decl'); if (!decl) return;
  const ps = $$('p', decl);
  ps.forEach((p) => p.setAttribute('aria-label', p.textContent.replace(/\s+/g, ' ').trim()));
  const wrapWords = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/([ \t\r\n]+)/).forEach((t) => {
          if (!t) return;
          if (/^[ \t\r\n]+$/.test(t)) { f.append(' '); return; }
          const w = document.createElement('span'); w.className = 'fw'; w.setAttribute('aria-hidden', 'true'); w.textContent = t; f.append(w);
        });
        n.replaceWith(f);
      } else if (n.nodeType === 1) wrapWords(n);
    });
  };
  ps.forEach(wrapWords);
  const ws = $$('.fw', decl);
  const final = ws.map((w) => getComputedStyle(w).color);
  gsap.set(ws, { color: DIM });
  const resto = $('#intro .intro__texto');
  const build = (stagger, st) => {
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: st });
    tl.to(ws, { color: (i) => final[i], stagger });
    // a linha pequena + assinatura surgem só quando "consegue ver." termina de acender
    if (resto) tl.fromTo(resto, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.5 });
  };
  if (resto) gsap.set(resto, { opacity: 0, y: 16 });
  if (desktop) build(0.5, { trigger: '#intro .wrap', start: 'center center', end: '+=110%', pin: true, scrub: 0.5, anticipatePin: 1 });
  else build(0.4, { trigger: decl, start: 'top 80%', end: 'bottom 30%', scrub: true });
}

/* 06: traço de pincel + pergunta final cinética (palavra a palavra, scrub) */
function sobre(desktop) {
  const pincel = $('#sobre .pincel');
  if (pincel) gsap.fromTo(pincel, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: EASE.inout, scrollTrigger: { trigger: pincel, start: 'top 88%', once: true } });
  $$('#sobre .prosa p').forEach((p) => gsap.from(p, { opacity: 0, y: 20, duration: 0.7, ease: EASE.out, scrollTrigger: { trigger: p, start: 'top 90%', once: true } }));
  const q = $('#sobre [data-final-question]'); if (!q) return;
  const label = q.textContent.replace(/[ \t\r\n]+/g, ' ').trim();
  q.setAttribute('aria-label', label.replace(/ /g, ' '));
  q.innerHTML = label.split(' ').map((w) => `<span class="fw" aria-hidden="true">${w}</span>`).join(' ');
  const ws = $$('.fw', q);
  // palavras "apagadas" em cinza AA (>= 4,5:1 sobre grafite) e "acesas" em gelo
  gsap.set(ws, { color: DIM });
  if (desktop) {
    gsap.to(ws, { color: LIT, stagger: 0.5, ease: 'none',
      scrollTrigger: { trigger: '#sobre .final-q-wrap', start: 'top 25%', end: '+=90%', pin: true, scrub: 0.5, anticipatePin: 1 } });
  } else {
    gsap.to(ws, { color: LIT, stagger: 0.4, ease: 'none', scrollTrigger: { trigger: q, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  }
}

/* 07 e 08 */
function formCta() {
  // Formulário: sem animação de opacidade/visibility nos campos (Tab, foco e leitor de tela sempre funcionam).
  const c = $('#cta-final');
  if (c) gsap.fromTo($$('[data-cta-line]', c), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: EASE.inout, scrollTrigger: { trigger: c, start: 'top 60%', once: true } });
}

/* faixa inclinada: marquee contínuo (loop sem emenda). A rolagem acelera e inverte o sentido conforme a direção. */
function faixa() {
  const band = $('.faixa__in'); if (!band) return;
  const base = [...band.children].slice(0, band.children.length / 2);
  if (!base.length) return;
  const trk = document.createElement('div');
  trk.className = 'faixa__trk';
  base.forEach((s) => trk.appendChild(s));
  band.replaceChildren(trk);
  band.classList.add('is-marquee');

  let setW = 0, x = 0, dir = 1, boost = 0;
  const measure = () => {
    trk.querySelectorAll('[data-clone]').forEach((c) => c.remove());
    const gap = parseFloat(getComputedStyle(trk).columnGap) || 0;
    const last = base[base.length - 1];
    setW = last.offsetLeft + last.offsetWidth + gap - base[0].offsetLeft;
    const copies = Math.ceil((band.offsetWidth + setW) / setW);
    for (let i = 0; i < copies; i++) base.forEach((s) => { const c = s.cloneNode(true); c.dataset.clone = ''; trk.appendChild(c); });
  };
  measure();
  document.fonts?.ready.then(measure);
  addEventListener('resize', () => { clearTimeout(faixa.t); faixa.t = setTimeout(measure, 250); });

  const wrapX = () => gsap.utils.wrap(-setW, 0);
  ST.create({ trigger: '.faixa', start: 'top bottom', end: 'bottom top',
    onToggle: (s) => { s.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick); },
    onUpdate: (s) => { dir = s.direction; boost = Math.min(Math.abs(s.getVelocity()) / 5, 500); } });

  function tick(_t, dt) {
    boost *= 0.94; // amortece o impulso da rolagem
    x = wrapX()(x - dir * (30 + boost * 0.6) * dt / 1000);
    gsap.set(trk, { x });
  }
}

function init() {
  progressBar();
  faixa();
  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 1024px)', mobile: '(max-width: 1023px)' }, (ctx) => {
    const { desktop } = ctx.conditions;
    // ordem de criação = ordem do DOM (regra de pins do ScrollTrigger)
    hero(desktop);
    $$('[data-split]').forEach((h) => revealHeadline(h));
    diagnostico(desktop);
    reveals();
    marks();
    parallax(desktop ? 6 : 3);
    intro(desktop);
    sobre(desktop);
    formCta();
  });
  // Um único refresh com debounce; adiado enquanto o CTA está rolando (evita cancelar a rolagem)
  let rt = 0;
  const refresh = () => {
    clearTimeout(rt);
    rt = setTimeout(function go() {
      if (document.documentElement.dataset.scrolling) { rt = setTimeout(go, 200); return; }
      ST.refresh();
    }, 300);
  };
  window.addEventListener('lp:sinais-size', refresh);
  ST.addEventListener('refresh', () => window.dispatchEvent(new Event('lp:refreshed')));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  $$('img').forEach((i) => { if (!i.complete) i.addEventListener('load', refresh, { once: true }); });
  refresh();

  // Preserva a posição ao cruzar 1024px (rotação de iPad / redimensionar): ancora na seção sob o olhar
  const secs = $$('[data-chapter]');
  let anchor = null, freeze = false, fz = 0;
  const record = () => {
    if (freeze) return;
    const mid = innerHeight * 0.4;
    for (const el of secs) { const r = el.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) { anchor = { el, f: (mid - r.top) / r.height }; return; } }
  };
  addEventListener('scroll', record, { passive: true });
  addEventListener('resize', () => { freeze = true; clearTimeout(fz); fz = setTimeout(() => { freeze = false; record(); }, 700); });
  record();
  matchMedia('(min-width: 1024px)').addEventListener('change', () => {
    const a = anchor;
    setTimeout(() => {
      ST.refresh();
      if (a) { const r = a.el.getBoundingClientRect(); scrollTo(0, scrollY + r.top + a.f * r.height - innerHeight * 0.4); }
    }, 200);
  });
  // segurança: se algo falhar, revela tudo
  setTimeout(() => { if (!ST.getAll().length) document.documentElement.classList.remove('js-motion'); }, 3000);
}

init();
