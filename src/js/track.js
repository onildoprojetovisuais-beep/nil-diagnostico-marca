import { CONFIG } from '../config.js';

const seen = new Set();
let inApp = 'none';
try {
  const ua = navigator.userAgent || '';
  if (/Instagram/i.test(ua)) inApp = 'instagram';
  else if (/FBAN|FBAV/i.test(ua)) inApp = 'facebook';
} catch (e) {}

export const IN_APP = inApp;

const META_STD = { form_submit: 'Lead' };

/** Única porta de saída de eventos. Nunca lança erro; nunca envia PII. */
export function track(event, params = {}, { once = false } = {}) {
  if (once) { if (seen.has(event)) return; seen.add(event); }
  const payload = { event, ...params, page: location.pathname, ts: Date.now() };
  try {
    (window.dataLayer = window.dataLayer || []).push(payload);
    if (typeof window.gtag === 'function' && CONFIG.TRACKING.GA4_ID) {
      window.gtag('event', event, params);
      if (event === 'form_submit') window.gtag('event', 'generate_lead', params);
    }
    if (typeof window.fbq === 'function' && CONFIG.TRACKING.META_PIXEL_ID) {
      if (META_STD[event]) window.fbq('track', META_STD[event], params, { eventID: params.event_id });
      else window.fbq('trackCustom', event.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase()), params);
    }
  } catch (e) {}
  if (CONFIG.ENV !== 'production') console.debug('[track]', event, params);
}

/** UTMs persistidos em sessionStorage (try/catch: WebViews podem bloquear). */
export function getUtms() {
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem('lp_utms') || '{}'); } catch (e) {}
  const q = new URLSearchParams(location.search);
  let changed = false;
  keys.forEach((k) => { if (q.get(k)) { saved[k] = q.get(k); changed = true; } });
  if (changed) { try { sessionStorage.setItem('lp_utms', JSON.stringify(saved)); } catch (e) {} }
  return saved;
}

export function pageView() {
  const u = getUtms();
  track('page_view', { ...u, referrer: document.referrer || '', viewport: `${innerWidth}x${innerHeight}`, in_app: inApp }, { once: true });
}

/** Carrega GTM/GA4/Pixel só se houver IDs, fora do caminho crítico. */
export function loadProviders() {
  const { GTM_ID, GA4_ID, META_PIXEL_ID } = CONFIG.TRACKING;
  const add = (src) => { const s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); };
  try {
    window.dataLayer = window.dataLayer || [];
    if (GTM_ID) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      add(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`);
    }
    if (GA4_ID) {
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GA4_ID);
      add(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`);
    }
    if (META_PIXEL_ID) {
      const n = (window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
      if (!window._fbq) window._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      add('https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', META_PIXEL_ID);
      window.fbq('track', 'PageView');
    }
  } catch (e) {}
}
