// Vídeos: src só quando chegam perto da viewport, sem saveData/2g/reduced-motion; play/pause por visibilidade; 1 por vez.
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const conn = navigator.connection || {};
const SLOW = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');

export function initVideos() {
  const vids = [...document.querySelectorAll('video[data-autoplay]')];
  if (!vids.length) return;
  let current = null, userPaused = false;
  const watch = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting && !document.hidden && !userPaused) {
      if (current && current !== v) current.pause();
      current = v;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } else { v.pause(); if (current === v) current = null; }
  }), { threshold: 0.4 });
  const load = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const v = e.target;
    load.unobserve(v);
    v.poster = v.dataset.poster; // poster só quando chega perto (não pesa no carregamento inicial)
    if (RM || SLOW) return;      // reduced-motion / saveData / 2g: fica só o poster, vídeo não é baixado
    const id = v.closest('[data-vid]').dataset.vid;
    v.muted = true; v.playsInline = true; v.loop = true;
    v.src = `/video/${id}-720.mp4`;
    v.load();
    watch.observe(v);
  }), { rootMargin: '200px 0px' });
  vids.forEach((v) => load.observe(v));
  // WCAG 2.2.2: controle para pausar/retomar os vídeos em loop
  if (!RM && !SLOW) {
    const box = document.querySelector('.videos');
    if (box) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'videos__pausa label label--plain';
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = 'Pausar vídeos';
      btn.addEventListener('click', () => {
        userPaused = !userPaused;
        btn.setAttribute('aria-pressed', String(userPaused));
        btn.textContent = userPaused ? 'Retomar vídeos' : 'Pausar vídeos';
        if (userPaused) vids.forEach((v) => v.pause());
        else if (current) { const p = current.play(); if (p && p.catch) p.catch(() => {}); }
        else vids.forEach((v) => { const r = v.getBoundingClientRect(); if (v.src && r.top < innerHeight && r.bottom > 0) { current = v; const p = v.play(); if (p && p.catch) p.catch(() => {}); } });
      });
      box.append(btn);
    }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) vids.forEach((v) => v.pause()); });
}
