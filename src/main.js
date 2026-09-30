import './css/base.css';
import './css/sections.css';
import './css/motion.css';
import { pageView, loadProviders } from './js/track.js';
import { initCta } from './js/cta.js';
import { initForm } from './js/form.js';
import { initVideos } from './js/media.js';

pageView();
initCta();
initForm();
initVideos();

// GSAP/ScrollTrigger + trackers de terceiros: fora do caminho crítico (depois de load + idle)
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 1200));
const later = () => idle(() => {
  loadProviders();
  if (!RM) import('./js/motion.js').catch((err) => console.warn('[motion] falhou, conteúdo segue estático', err));
});
if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
