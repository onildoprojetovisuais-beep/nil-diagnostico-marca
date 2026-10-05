// 03 Os Sinais: palco sticky (scrollytelling) + acordeão. Sem interceptar roda/toque: só lê a posição do scroll.
// A altura da área de scroll (#sinais-run) = palco + uma "etapa" por item. Se o palco aberto passar da tela,
// o top do sticky fica negativo e o scroll natural percorre o conteúdo (sem rolagem interna).
export function initSinais() {
  const run = document.getElementById('sinais-run'), stage = document.getElementById('sinais-stage');
  const items = [...document.querySelectorAll('#sinais .sinal')];
  if (!run || !stage || !items.length) return;
  const idxDots = [...document.querySelectorAll('#sinais-idx li')], idxWrap = document.getElementById('sinais-idx');
  const rows = items.map((li) => ({ li, btn: li.querySelector('.sinal__btn'), panel: li.querySelector('.sinal__panel') }));
  const n = rows.length;
  document.documentElement.classList.add('js-acc');
  // imagens do item 02 carregam já, para o acordeão abrir sem salto
  run.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });

  // número: contorno → preenchido, guiado pela rolagem dentro da etapa e suavizado (lerp) para soar orgânico
  const nums = items.map((li) => li.querySelector('.sinal__num'));
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fillNow = 0, fillTo = 0, fillRaf = 0;
  const paintFill = () => { const n = nums[active]; if (n) n.style.setProperty('--fill', fillNow.toFixed(3)); };
  function fillTick() {
    fillNow += (fillTo - fillNow) * 0.09;
    if (Math.abs(fillTo - fillNow) < 0.002) { fillNow = fillTo; fillRaf = 0; } else fillRaf = requestAnimationFrame(fillTick);
    paintFill();
  }
  const ease = (t) => t * t * (3 - 2 * t);
  function setFillTarget(S, snap) {
    const f = prog(S) - active;
    fillTo = calm ? 1 : ease(Math.max(0, Math.min(1, (f - 0.08) / 0.5)));
    if (snap || calm) { fillNow = fillTo; paintFill(); } else if (!fillRaf) fillRaf = requestAnimationFrame(fillTick);
  }

  let vh = innerHeight, vw = innerWidth, stageH = 0, step = 0, k0 = 0, s0 = 0, active = -1, raf = 0;
  const scrolled = () => -run.getBoundingClientRect().top;
  const pinStart = (h) => Math.max(0, h - vh);
  const prog = (S) => k0 + Math.max(0, S - s0) / step;

  function setOpen(i, open) {
    const r = rows[i];
    r.btn.setAttribute('aria-expanded', String(open));
    r.panel.classList.toggle('is-open', open);
  }
  function closeAll(except = -1) { rows.forEach((_, i) => { if (i !== except) setOpen(i, false); }); }

  function setActive(a) {
    if (a === active) return;
    active = a;
    nums.forEach((n, i) => { if (n && i !== a) n.style.setProperty('--fill', '0'); });
    rows.forEach((r, i) => {
      r.li.classList.toggle('is-past', i < a);
      r.li.classList.toggle('is-on', i === a);
      if (idxDots[i]) idxDots[i].classList.toggle('is-on', i === a);
    });
    // o scroll muda a etapa: fecha o que estava aberto (o clique é quem abre)
    rows.forEach((r, i) => { if (i !== a && r.btn.getAttribute('aria-expanded') === 'true') setOpen(i, false); });
  }

  // recalcula geometria mantendo o progresso contínuo (evita trocar de etapa quando a altura do palco muda)
  function measure(force) {
    const S = scrolled(), p = active < 0 ? 0 : prog(S);
    const h = stage.offsetHeight;
    if (!force && h === stageH) return;
    const oldStep = step;
    stageH = h;
    step = Math.max(320, Math.round(vh * 0.55));
    s0 = pinStart(stageH);
    k0 = oldStep ? p - Math.max(0, S - s0) / step : 0;
    stage.style.setProperty('--pin-top', Math.min(0, vh - stageH) + 'px');
    run.style.height = stageH + n * step + 'px';
    update();
  }
  function update() {
    raf = 0;
    const S = scrolled();
    const prev = active;
    setActive(Math.max(0, Math.min(n - 1, Math.floor(prog(S) + 1e-6))));
    setFillTarget(S, prev !== active);
    if (idxWrap) { const r = run.getBoundingClientRect(); idxWrap.classList.toggle('is-vis', r.top < vh * 0.5 && r.bottom > vh * 0.5); }
  }
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };

  rows.forEach((r, i) => r.btn.addEventListener('click', () => {
    const open = r.btn.getAttribute('aria-expanded') !== 'true';
    closeAll(i); setOpen(i, open);
  }));

  addEventListener('scroll', onScroll, { passive: true });
  let lastW = vw, lastH = vh, rt = 0;
  addEventListener('resize', () => {
    // barra de endereço do mobile muda só a altura: ignora variação pequena
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 150) return;
    clearTimeout(rt);
    rt = setTimeout(() => { lastW = vw = innerWidth; lastH = vh = innerHeight; measure(true); window.dispatchEvent(new Event('lp:sinais-size')); }, 150);
  });
  new ResizeObserver(() => { measure(false); window.dispatchEvent(new Event('lp:sinais-size')); }).observe(stage);
  measure(true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => measure(true));
}
