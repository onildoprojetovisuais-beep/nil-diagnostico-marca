import { CONFIG } from '../config.js';

/** Envia o lead ao endpoint configurado. Em produção sem endpoint FALHA (nunca finge sucesso). */
export async function submitLead(payload) {
  const { ENDPOINT_URL, TIMEOUT_MS, FORMAT, HEADERS } = CONFIG.SUBMIT;
  if (!ENDPOINT_URL) {
    if (CONFIG.ENV === 'production') {
      const e = new Error('ENDPOINT_NOT_CONFIGURED');
      e.reason = 'endpoint_missing';
      throw e;
    }
    console.warn('[lead:dry-run] ENDPOINT_URL vazio em src/config.js. Simulando sucesso (só em desenvolvimento).', payload);
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, dryRun: true };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT_URL, {
      method: 'POST', signal: ctrl.signal, keepalive: true,
      headers: FORMAT === 'json' ? { 'Content-Type': 'application/json', ...HEADERS } : HEADERS,
      body: FORMAT === 'json' ? JSON.stringify(payload) : new URLSearchParams(payload),
    });
    if (!res.ok) {
      // `vite dev` não serve /api: em desenvolvimento, simula sucesso (use `vercel dev` para o fluxo real)
      if (res.status === 404 && CONFIG.ENV !== 'production') {
        console.warn('[lead:dry-run] /api/diagnostico não existe neste servidor (use `vercel dev`). Simulando sucesso.', payload);
        return { ok: true, dryRun: true };
      }
      const e = new Error('HTTP_' + res.status);
      e.reason = res.status === 429 ? 'rate_limited' : res.status >= 500 ? 'http_5xx' : 'http_4xx';
      throw e;
    }
    // sucesso só quando o servidor confirma explicitamente
    let j = null;
    try { j = await res.json(); } catch (e) {}
    if (!j || j.ok !== true) { const e = new Error('NO_CONFIRMATION'); e.reason = 'no_confirmation'; throw e; }
    return { ok: true };
  } catch (err) {
    if (err.name === 'AbortError') { const e = new Error('TIMEOUT'); e.reason = 'timeout'; throw e; }
    if (!err.reason) err.reason = 'network';
    throw err;
  } finally { clearTimeout(t); }
}
