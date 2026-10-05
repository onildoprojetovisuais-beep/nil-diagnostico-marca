import './css/base.css';
import './css/sections.css';
import './css/motion.css';
import './css/galeria.css';
import './css/galeria-motion.css';
import './css/galeria-lightbox.css';
import { pageView, loadProviders } from './js/track.js';
import { initCta } from './js/cta.js';
import { initNav } from './js/nav.js';
import { initForm } from './js/form.js';
import { initVideos } from './js/media.js';
import { initSinais } from './js/sinais.js';
import { initGaleria } from './js/galeria.js';
import { initTipografia } from './js/tipografia.js';

initTipografia();
pageView();
initCta();
initNav();
initForm();
initVideos();
initSinais();
initGaleria();

// GSAP/ScrollTrigger + trackers de terceiros: fora do caminho crítico (depois de load + idle)
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 1200));
const later = () => idle(() => {
  loadProviders();
  if (!RM) import('./js/motion.js').catch((err) => console.warn('[motion] falhou, conteúdo segue estático', err));
});
if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
