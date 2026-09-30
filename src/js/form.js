import { CONFIG } from '../config.js';
import { track, getUtms, IN_APP } from './track.js';
import { submitLead } from './submit.js';

// Textos funcionais NÃO presentes na copy: listados em _planning/TEXTOS-A-APROVAR.md
const MSG = {
  nome: 'Informe seu nome.',
  whatsapp: 'Confira o WhatsApp com DDD, por exemplo (11) 91234-5678.',
  instagram: 'Informe o @ do Instagram ou o site da empresa.',
  faz: 'Conte em poucas palavras o que você faz.',
  situacao: 'Escolha a opção que mais se aproxima.',
  resumo: (n) => (n === 1 ? 'Revise 1 campo.' : `Revise ${n} campos.`),
  enviando: 'Enviando…',
  erroEnvio: 'Não consegui enviar agora. Seus dados continuam aqui, tente de novo em instantes.',
  erroConfig: 'Não consegui enviar agora. Seus dados continuam aqui, tente de novo em instantes.',
  whats: 'Chamar no WhatsApp',
};

const $ = (s, c = document) => c.querySelector(s);
// DDDs existentes no Brasil (rejeita 00, 10, 20, 23, 25...)
const DDDS = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
const DRAFT_KEY = 'lp_draft_v1';

// ---------- WhatsApp: máscara leve preservando o cursor ----------
function digitsOnly(v) {
  let d = v.replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return d.slice(0, 11);
}
function formatBR(d) {
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2), rest = d.slice(2);
  if (d.length <= 6) return `(${ddd}) ${rest}`;
  if (d.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}
function maskPhone(input) {
  const before = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, '').length;
  const d = digitsOnly(input.value);
  const out = formatBR(d);
  input.value = out;
  // reposiciona cursor após o mesmo nº de dígitos
  let pos = 0, cnt = 0;
  while (pos < out.length && cnt < before) { if (/\d/.test(out[pos])) cnt++; pos++; }
  try { input.setSelectionRange(pos, pos); } catch (e) {}
}

// ---------- Validação ----------
const validators = {
  nome: (v) => v.trim().length >= 2,
  whatsapp: (v) => {
    const d = digitsOnly(v);
    const ddd = parseInt(d.slice(0, 2), 10);
    if (d.length < 10 || !DDDS.has(String(ddd))) return false;
    return d.length === 10 || d[2] === '9';
  },
  instagram: (v) => { const t = v.trim(); return t.length >= 3 && !/\s/.test(t); },
  faz: (v) => v.trim().length >= 2,
};

export function initForm() {
  const form = $('#lead-form');
  if (!form) return;
  const status = $('#form-status'), errEnvio = $('#form-erro-envio'), btn = $('#form-submit'), progress = $('#form-progress');
  const startedAt = { t: 0 };
  let sending = false, done = false;

  const el = {
    nome: $('#f-nome'), whatsapp: $('#f-whatsapp'), instagram: $('#f-instagram'), faz: $('#f-faz'), motivo: $('#f-motivo'),
    situacao: form.querySelectorAll('input[name="situacao"]'),
  };
  const errBox = (k) => $(`#err-${k}`);

  function setError(k, on) {
    const box = errBox(k);
    if (!box) return;
    box.textContent = on ? MSG[k] : '';
    box.hidden = !on;
    if (k === 'situacao') el.situacao.forEach((r) => r.setAttribute('aria-invalid', on ? 'true' : 'false'));
    else { el[k].setAttribute('aria-invalid', on ? 'true' : 'false'); }
  }
  function isValid(k) {
    if (k === 'situacao') return [...el.situacao].some((r) => r.checked);
    return validators[k](el[k].value);
  }
  const keys = ['nome', 'whatsapp', 'instagram', 'faz', 'situacao'];
  function updateProgress() {
    const n = keys.filter(isValid).length;
    progress.style.transform = `scaleX(${n / keys.length})`;
  }

  // draft (sessionStorage; falha silenciosa)
  function saveDraft() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        nome: el.nome.value, whatsapp: el.whatsapp.value, instagram: el.instagram.value, faz: el.faz.value, motivo: el.motivo.value,
        situacao: ([...el.situacao].find((r) => r.checked) || {}).value || '',
      }));
    } catch (e) {}
  }
  function loadDraft() {
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
      if (!d) return;
      el.nome.value = d.nome || ''; el.whatsapp.value = d.whatsapp || ''; el.instagram.value = d.instagram || '';
      el.faz.value = d.faz || ''; el.motivo.value = d.motivo || '';
      el.situacao.forEach((r) => { r.checked = r.value === d.situacao; });
    } catch (e) {}
  }
  loadDraft();
  updateProgress();
  let dt = 0;
  const debounceSave = () => { clearTimeout(dt); dt = setTimeout(saveDraft, 300); };

  // form_start (1x)
  form.addEventListener('focusin', (e) => {
    const t = e.target;
    if (!t.matches('input, textarea')) return;
    if (!startedAt.t) { startedAt.t = Date.now(); track('form_start', { first_field: t.id || t.name, via: 'cta' }, { once: true }); }
  });

  // máscara + validação por campo
  el.whatsapp.addEventListener('input', () => maskPhone(el.whatsapp));
  el.whatsapp.addEventListener('paste', (e) => {
    const txt = (e.clipboardData || window.clipboardData || {}).getData ? (e.clipboardData || window.clipboardData).getData('text') : '';
    if (!txt) return;
    e.preventDefault();
    el.whatsapp.value = formatBR(digitsOnly(txt));
    el.whatsapp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  ['nome', 'whatsapp', 'instagram', 'faz'].forEach((k) => {
    el[k].addEventListener('blur', () => { if (el[k].value.trim() !== '' || el[k].dataset.touched) { el[k].dataset.touched = '1'; setError(k, !isValid(k)); } });
    el[k].addEventListener('input', () => { if (el[k].getAttribute('aria-invalid') === 'true' && isValid(k)) setError(k, false); });
  });
  el.situacao.forEach((r) => r.addEventListener('change', () => setError('situacao', false)));
  form.addEventListener('input', () => { updateProgress(); debounceSave(); if (status.textContent) status.textContent = ''; });
  form.addEventListener('change', () => { updateProgress(); debounceSave(); });

  // Enter avança para o próximo campo (exceto textarea/botão)
  const order = [el.nome, el.whatsapp, el.instagram, el.faz];
  order.forEach((inp, i) => inp.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const nxt = order[i + 1];
    if (nxt) nxt.focus(); else { const r = [...el.situacao].find((x) => x.checked) || el.situacao[0]; r.focus(); }
  }));

  // scroll do foco acima do teclado virtual
  form.addEventListener('focusin', (e) => {
    if (!e.target.matches('input:not([type="radio"]), textarea')) return;
    const t = e.target;
    setTimeout(() => {
      const vh = (window.visualViewport ? window.visualViewport.height : innerHeight);
      const r = t.getBoundingClientRect();
      if (r.top < 80 || r.bottom > vh - 24) t.scrollIntoView({ block: 'center', behavior: 'smooth' });  // só se estiver escondido (teclado)
    }, 350);
  });

  function hidden(payloadDigits) {
    const u = getUtms();
    return {
      ...u,
      whatsapp_e164: payloadDigits ? '+55' + payloadDigits : '',
      page_url: location.href.split('#')[0],
      referrer: document.referrer || '',
      submitted_at: new Date().toISOString(),
      form_version: CONFIG.FORM_VERSION,
      in_app: IN_APP,
    };
  }

  function buildWhatsLink(data) {
    const num = (CONFIG.WHATSAPP_FALLBACK_E164 || '').replace(/\D/g, '');
    if (!num) return '';
    const txt = `Quero meu Diagnóstico de Marca.\nNome: ${data.nome}\nInstagram ou site: ${data.instagram_ou_site}\nO que faço: ${data.o_que_faz}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending || done) return;
    errEnvio.hidden = true; errEnvio.textContent = '';
    const bad = keys.filter((k) => !isValid(k));
    keys.forEach((k) => setError(k, bad.includes(k)));
    if (bad.length) {
      status.textContent = MSG.resumo(bad.length);
      track('form_validation_error', { fields: bad });
      const first = bad[0] === 'situacao' ? el.situacao[0] : el[bad[0]];
      first.focus({ preventScroll: true });
      first.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const fd = new FormData(form);
    const hp = fd.get('website_url');
    const d = digitsOnly(el.whatsapp.value);
    const data = {
      nome: el.nome.value.trim(), whatsapp: el.whatsapp.value, instagram_ou_site: el.instagram.value.trim(),
      o_que_faz: el.faz.value.trim(), situacao: ([...el.situacao].find((r) => r.checked) || {}).value, motivo: el.motivo.value.trim(),
      ...hidden(d),
    };
    const key = ([...el.situacao].find((r) => r.checked) || { dataset: {} }).dataset.key;
    const eventId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

    // loading
    sending = true;
    btn.setAttribute('aria-busy', 'true');
    btn.setAttribute('aria-disabled', 'true');
    const rot = $('.cta__rot', btn), oldRot = rot.textContent;
    rot.textContent = MSG.enviando;
    [el.nome, el.whatsapp, el.instagram, el.faz, el.motivo].forEach((i) => (i.readOnly = true));

    try {
      if (hp) { track('form_spam_blocked'); await new Promise((r) => setTimeout(r, 400)); }   // honeypot: finge sucesso sem enviar e SEM evento de conversão
      else await submitLead(data);
      done = true;
      if (!hp) track('form_submit', { situacao: key, has_motivo: !!data.motivo, event_id: eventId, time_to_submit_s: startedAt.t ? Math.round((Date.now() - startedAt.t) / 1000) : 0 });
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (e2) {}
      const box = $('#form-box'), ok = $('#sucesso');
      box.style.minHeight = box.offsetHeight + 'px'; // sem CLS na troca
      form.hidden = true; ok.hidden = false;
      $('.progresso', box).hidden = true;
      ok.focus({ preventScroll: true });
      ok.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (err) {
      const reason = err.reason || 'network';
      track('form_submit_error', { reason });
      errEnvio.textContent = reason === 'endpoint_missing' ? MSG.erroConfig : MSG.erroEnvio;
      const w = buildWhatsLink(data);
      if (w) { errEnvio.append(' '); const a = document.createElement('a'); a.href = w; a.rel = 'noopener'; a.textContent = MSG.whats; errEnvio.append(a); }
      errEnvio.hidden = false;
      [el.nome, el.whatsapp, el.instagram, el.faz, el.motivo].forEach((i) => (i.readOnly = false));
    } finally {
      sending = false;
      btn.removeAttribute('aria-busy'); btn.removeAttribute('aria-disabled');
      rot.textContent = oldRot;
    }
  });
}
