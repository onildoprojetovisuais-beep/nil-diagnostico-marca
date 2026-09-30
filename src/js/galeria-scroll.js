// Galeria de cases: movimento horizontal dirigido pelo scroll vertical NATIVO.
//
// DECISÃO: sticky + cálculo por scrollY (rAF sob demanda, listener passivo), sem ScrollTrigger pin.
//  - alvo é WebView do Instagram mobile: sem pin-spacer, sem position:fixed alternando, sem refresh do ST
//    e sem depender de GSAP carregado (motion.js só entra depois do load/idle e não roda em reduced-motion).
//  - o runway (root) recebe altura em px = altura do stage + soma dos percursos; o navegador cuida de prender/soltar o sticky.
//  - o estado inteiro é função pura de s = -root.getBoundingClientRect().top (px de scroll dentro do runway),
//    então rolar para cima inverte sozinho e não há acúmulo de erro.
//
// SEGMENTAÇÃO (s em px de scroll; H = altura do stage; vw = largura do stage):
//  D_i  = percurso horizontal do case i (medido pelas caixas dos itens: nada de trecho vazio, 1º e último visíveis)
//  S_i  = max(D_i / SPEED, MIN_HOLD * H)        SPEED: translate por px de scroll (desktop 1.0; mobile 0.9 = mais lento, melhor leitura)
//  T    = TRANS * H                              transição entre cases (0.5 H)
//  a_0 = 0;  a_{i+1} = a_i + S_i + T;  total L = a_{n-1} + S_{n-1};  runway = H + L
//  case i: entrada u=(s-(a_i-T))/T  -> opacidade e(u), hero chega de fora "no sentido próprio" (drift*(1-u)), escala 1.04->1
//          ativo   p=(s-a_i)/S_i    -> x = lerp(x0,x1,p), opacidade 1
//          saída   v=(s-(a_i+S_i))/T-> continua no sentido, opacidade 1-e(v) (soma dos dois = 1: nunca fica vazio), escala 1->0.96
//  e(u)=smoothstep. Case 0 nasce visível (sem entrada); último case não sai (o sticky é liberado no fim do runway).
//
// TECLADO: cases fora de posição ficam com opacity 0 + pointer-events none, mas CONTINUAM na ordem de Tab e na árvore de
// acessibilidade (visibility:hidden/inert impediriam o foco por Tab). No focusin rolamos a página até a posição do item.

const SPEED_DESK = 1.0, SPEED_MOB = 0.9; // translate px por px de scroll
const MIN_HOLD = 0.5;   // percurso mínimo (em H) para cases curtos
const TRANS = 0.5;      // transição entre cases (em H)
const DRIFT_CAP = 0.25; // deslocamento máximo de entrada/saída (em vw)
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function initGaleriaScroll(root) {
  if (!root || root.__galScroll) return root && root.__galScroll;
  const stage = root.querySelector('.gal__stage');
  const cases = [...root.querySelectorAll('.gal__case')];
  if (!stage || !cases.length) return null;

  const mqRM = matchMedia('(prefers-reduced-motion: reduce)');
  const mqMob = matchMedia('(max-width: 767px)');
  const items = cases.map((el) => ({
    el, track: el.querySelector('.gal__track'), dir: el.dataset.dir === 'ltr' ? 'ltr' : 'rtl',
    D: 0, S: 0, a: 0, x0: 0, x1: 0, drift: 0, o: -1, x: NaN, sc: NaN, p: -1, ints: [], // ints: [l, r] de cada item
    seg: null,
  }));
  const n = items.length;
  let L = 0, H = 0, vw = 0, T = 0, active = false, frozen = false, raf = 0, lastW = 0, lastH = 0, lastRunway = -1;
  let prog = null;

  /* indicador de progresso: um traço por case, preenchido por scaleX(--seg-p) */
  function buildProg() {
    if (prog) return;
    prog = document.createElement('div');
    prog.className = 'gal__prog';
    prog.setAttribute('aria-hidden', 'true');
    items.forEach((it) => {
      const s = document.createElement('i'); s.className = 'gal__prog-seg';
      s.appendChild(document.createElement('b'));
      prog.appendChild(s); it.seg = s;
    });
    stage.appendChild(prog);
  }

  /* mede tudo com transforms zerados; devolve a fração atual dentro do runway para preservá-la */
  function measure() {
    items.forEach((it) => { if (it.track) it.track.style.transform = 'none'; it.el.style.transform = 'none'; });
    H = stage.clientHeight; vw = stage.clientWidth;
    const st = stage.getBoundingClientRect();
    const speed = mqMob.matches ? SPEED_MOB : SPEED_DESK;
    T = TRANS * H;
    let a = 0;
    items.forEach((it, i) => {
      const lis = it.track ? [...it.track.children] : [];
      let Lm = Infinity, Rm = -Infinity;
      lis.forEach((li) => { const r = li.getBoundingClientRect(); if (r.width) { Lm = Math.min(Lm, r.left - st.left); Rm = Math.max(Rm, r.right - st.left); } });
      if (!isFinite(Lm)) { Lm = 0; Rm = vw; }
      it.ints = lis.map((li) => { const r = li.getBoundingClientRect(); return [r.left - st.left, r.right - st.left]; });
      const pad = clamp(Lm, 0, vw * 0.15); // respiro das pontas (espelha o padding da esquerda)
      if (it.dir === 'rtl') { // hero à esquerda (x=0), conteúdo vai para a esquerda até o último item entrar inteiro
        it.x0 = 0; it.x1 = Math.min(0, vw - Rm - pad);
      } else {                // ltr (row-reverse): hero na ponta direita; track vai para a direita até o último item (à esquerda) aparecer
        it.x1 = Math.max(0, -Lm + pad); it.x0 = Math.min(it.x1, vw - Rm - pad);
      }
      it.D = Math.abs(it.x1 - it.x0);
      it.S = Math.max(it.D / speed, MIN_HOLD * H);
      it.drift = Math.min(T * speed, DRIFT_CAP * vw);
      it.a = a; a += it.S + (i < n - 1 ? T : 0);
      it.o = -1; it.x = NaN; it.sc = NaN; it.p = -1; // invalida cache
    });
    L = a;
    return L;
  }

  const s0 = () => -root.getBoundingClientRect().top;

  function layout() {
    if (!active) return;
    const before = s0(), oldL = L;
    const keep = oldL > 0 && before > 0 && before < oldL ? before / oldL : null;
    measure();
    const runway = Math.round(H + L);
    if (runway !== lastRunway) {
      root.style.height = runway + 'px';
      lastRunway = runway;
      // motion.js (ScrollTrigger das seções abaixo) recalcula offsets com este evento
      dispatchEvent(new Event('lp:sinais-size'));
    }
    if (keep != null && Math.abs(L - oldL) > 1) {
      const top = root.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + keep * L, behavior: 'instant' });
    }
    render();
  }

  function setCase(it, o, x, sc, p) {
    if (o !== it.o) {
      it.o = o;
      const on = o > 0.02;
      it.el.style.opacity = o.toFixed(3);
      it.el.style.pointerEvents = o > 0.3 ? 'auto' : 'none';
      it.el.style.setProperty('--case-o', o.toFixed(3));
      it.el.style.zIndex = on ? '1' : '0';
    }
    if (x !== it.x || sc !== it.sc) {
      it.x = x; it.sc = sc;
      if (it.track) it.track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      it.el.style.transform = sc === 1 ? 'none' : `scale(${sc.toFixed(4)})`;
    }
    if (p !== it.p) {
      it.p = p;
      it.el.style.setProperty('--case-p', p.toFixed(4));
      if (it.seg) it.seg.style.setProperty('--seg-p', p.toFixed(4));
    }
  }

  function render() {
    raf = 0;
    if (!active || frozen) return;
    const s = clamp(s0(), 0, L);
    root.style.setProperty('--gal-p', (L > 0 ? s / L : 0).toFixed(4));
    let cur = 0;
    items.forEach((it, i) => {
      const inStart = it.a - T, outStart = it.a + it.S, hasIn = i > 0, hasOut = i < n - 1;
      const sgn = it.dir === 'rtl' ? 1 : -1; // +X = vem da direita (rtl); ltr vem da esquerda
      let o, x, sc = 1, p;
      if (hasIn && s < inStart) { o = 0; x = it.x0 + sgn * it.drift; sc = 1.04; p = 0; }
      else if (hasIn && s < it.a) { const u = smooth((s - inStart) / T); o = u; x = it.x0 + sgn * it.drift * (1 - u); sc = 1.04 - 0.04 * u; p = 0; cur = i; }
      else if (s <= outStart || !hasOut) { const q = it.S ? clamp((s - it.a) / it.S, 0, 1) : 0; o = 1; x = it.x0 + (it.x1 - it.x0) * q; p = q; cur = i; }
      else if (s < outStart + T) { const v = smooth((s - outStart) / T); o = 1 - v; x = it.x1 - sgn * it.drift * v; sc = 1 - 0.04 * v; p = 1; if (v < 0.5) cur = i; }
      else { o = 0; x = it.x1 - sgn * it.drift; sc = 0.96; p = 1; }
      setCase(it, o, x, sc, p);
    });
    root.dataset.galCase = String(cur);
  }

  const request = () => { if (!raf && active && !frozen) raf = requestAnimationFrame(render); };

  /* teclado: rola até a posição em que o item focado aparece inteiro */
  function scrollToItem(ci, ii) {
    const it = items[ci]; if (!it || !L) return;
    const [l, r] = it.ints[ii] || [0, vw];
    const lo = Math.min(it.x0, it.x1), hi = Math.max(it.x0, it.x1);
    const x = clamp(vw / 2 - (l + r) / 2, lo, hi);
    const q = it.D ? clamp((x - it.x0) / (it.x1 - it.x0), 0, 1) : 0;
    const top = root.getBoundingClientRect().top + scrollY + it.a + q * it.S;
    scrollTo({ top, behavior: mqRM.matches ? 'auto' : 'smooth' });
  }
  let noFocusScrollUntil = 0;
  function onFocusIn(e) {
    if (!active || frozen || performance.now() < noFocusScrollUntil) return; // lightbox aberta / foco devolvido no fechamento: não mexer no scroll
    let fv = true; try { fv = e.target.matches(':focus-visible'); } catch (_) {}
    if (!fv) return; // clique/toque não deve rolar a página: só navegação por teclado
    const tr = e.target.classList && e.target.classList.contains('gal__track') ? e.target : null; // track é tabindex=0
    if (tr) { const c = cases.indexOf(tr.closest('.gal__case')); if (c >= 0 && items[c].o < 0.6) scrollToItem(c, 0); return; }
    const btn = e.target.closest && e.target.closest('.gal__btn'); if (!btn) return;
    const cs = btn.closest('.gal__case'); const ci = cases.indexOf(cs); if (ci < 0) return;
    const ii = Number(btn.dataset.index ?? btn.closest('.gal__item')?.dataset.index ?? 0);
    const it = items[ci], s = s0();
    const [l, r] = it.ints[ii] || [0, vw];
    const visible = it.o > 0.6 && l + it.x > -2 && r + it.x < vw + 2;
    if (!visible) scrollToItem(ci, ii);
  }

  /* modos */
  function enable() {
    if (active) return;
    active = true;
    root.classList.remove('gal--static'); root.classList.add('gal--anim');
    root.querySelectorAll('.gal__track').forEach((t) => t.removeAttribute('tabindex')); // sem rolagem própria: sem tab stop extra
    buildProg();
    layout();
  }
  function disable() {
    active = false; frozen = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    root.classList.remove('gal--anim'); root.classList.add('gal--static');
    root.querySelectorAll('.gal__track').forEach((t) => t.setAttribute('tabindex', '0')); // trilha rolável por teclado
    root.style.height = ''; lastRunway = -1;
    root.style.removeProperty('--gal-p');
    root.removeAttribute('data-gal-case');
    items.forEach((it) => {
      ['opacity', 'pointer-events', 'z-index', 'transform'].forEach((p) => it.el.style.removeProperty(p));
      it.el.style.removeProperty('--case-o'); it.el.style.removeProperty('--case-p');
      if (it.track) it.track.style.removeProperty('transform');
    });
    dispatchEvent(new Event('lp:sinais-size'));
  }
  const applyMode = () => (mqRM.matches ? disable() : enable());

  /* listeners (todos passivos; nunca interceptam wheel/touch) */
  addEventListener('scroll', request, { passive: true });
  let rz = 0;
  const relayout = () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (!active) return;
      if (frozen) { pendingLayout = true; return; }
      layout();
    }, 120);
  };
  let pendingLayout = false;
  const onResize = () => {
    // a barra de endereço do mobile dispara resize só de altura; o stage é 100svh e não muda: ignora
    if (innerWidth === lastW && stage.clientHeight === lastH) return;
    lastW = innerWidth; lastH = stage.clientHeight; relayout();
  };
  lastW = innerWidth; lastH = stage.clientHeight;
  addEventListener('resize', onResize, { passive: true });
  addEventListener('orientationchange', relayout, { passive: true });
  document.fonts && document.fonts.ready.then(relayout);
  addEventListener('load', relayout, { once: true });
  root.addEventListener('load', relayout, true); // load de imagens (não borbulha; captura)
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(relayout);
    items.forEach((it) => it.track && ro.observe(it.track));
  }
  mqRM.addEventListener('change', applyMode);
  mqMob.addEventListener('change', relayout);
  root.addEventListener('focusin', onFocusIn);

  document.addEventListener('galeria:open', () => { frozen = true; if (raf) { cancelAnimationFrame(raf); raf = 0; } });
  document.addEventListener('galeria:close', () => {
    noFocusScrollUntil = performance.now() + 600;
    frozen = false;
    // a lightbox restaura o scrollY; espera 2 frames e re-sincroniza
    requestAnimationFrame(() => requestAnimationFrame(() => { if (pendingLayout) { pendingLayout = false; layout(); } else render(); }));
  });

  const api = { refresh: layout, get total() { return L; }, get segments() { return items.map((it) => ({ a: it.a, S: it.S, D: it.D, dir: it.dir })); } };
  root.__galScroll = api;
  applyMode();
  return api;
}
