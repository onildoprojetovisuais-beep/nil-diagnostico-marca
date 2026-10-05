// POST /api/diagnostico — recebe o lead, valida, grava no Notion (CRM) e avisa por e-mail (Resend).
// Todas as credenciais vêm de variáveis de ambiente da Vercel; nada disso chega ao navegador.
// Sem dependências: usa fetch nativo (Node 18+).

const LANDING_PAGE = 'nil-diagnostico-marca';
const NOTION_VERSION = '2022-06-28';
const SITUACOES = [
  'Meu negócio cresceu e sinto que a marca ficou pra trás',
  'Estamos entrando em uma nova fase e precisamos elevar a marca',
  'Tenho um evento ou produto importante chegando',
  'Minha comunicação perdeu coerência',
  'Ainda não sei exatamente o problema e quero uma leitura externa',
];
const DDDS = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));

// ---------- rate limit (por instância; best-effort em serverless) ----------
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000, MAX_HITS = 5;
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 2000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return arr.length > MAX_HITS;
}

// ---------- sanitização / validação ----------
// remove caracteres de controle, comprime espaços e limita o tamanho
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, max);
const digits = (v) => { let d = String(v ?? '').replace(/\D/g, ''); if (d.length >= 12 && d.startsWith('55')) d = d.slice(2); return d; };

function parse(body) {
  const b = body && typeof body === 'object' ? body : {};
  const wa = digits(b.whatsapp);
  const lead = {
    nome: clean(b.nome, 120),
    whatsapp: wa,
    instagram_ou_site: clean(b.instagram_ou_site, 200),
    negocio: clean(b.o_que_faz ?? b.negocio, 300),
    situacao: clean(b.situacao, 200),
    motivo: clean(b.motivo, 1000),
    utm_source: clean(b.utm_source, 200),
    utm_medium: clean(b.utm_medium, 200),
    utm_campaign: clean(b.utm_campaign, 200),
    utm_content: clean(b.utm_content, 200),
    utm_term: clean(b.utm_term, 200),
    referrer: clean(b.referrer, 500),
    landing_page: LANDING_PAGE,
    created_at: new Date().toISOString(),
  };
  const errors = [];
  if (lead.nome.length < 2) errors.push('nome');
  if (!(wa.length === 10 || wa.length === 11) || !DDDS.has(wa.slice(0, 2)) || (wa.length === 11 && wa[2] !== '9')) errors.push('whatsapp');
  if (lead.instagram_ou_site.length < 3 || /\s/.test(lead.instagram_ou_site)) errors.push('instagram_ou_site');
  if (lead.negocio.length < 2) errors.push('negocio');
  if (!SITUACOES.includes(lead.situacao)) errors.push('situacao');
  return { lead, errors };
}

// ---------- links rápidos ----------
function perfilUrl(v) {
  const t = v.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/instagram\.com\//i.test(t)) return 'https://' + t.replace(/^\/+/, '');
  if (/^@?[\w.]{1,30}$/.test(t) && !/\.(com|br|net|org|io|co|app|me)$/i.test(t)) return 'https://instagram.com/' + t.replace(/^@/, '');
  if (/\./.test(t)) return 'https://' + t.replace(/^@/, '');
  return '';
}
const zapUrl = (wa) => `https://wa.me/55${wa}`;
const fmtWa = (d) => (d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`);
const origem = (l) => [l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(' / ') || (l.referrer ? 'Referrer: ' + l.referrer : 'Direto');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Notion ----------
const rt = (v) => ({ rich_text: v ? [{ type: 'text', text: { content: v.slice(0, 2000) } }] : [] });
async function saveNotion(l) {
  const token = process.env.NOTION_TOKEN, db = process.env.NOTION_DATABASE_ID;
  if (!token || !db) return { skipped: true };
  const props = {
    'Nome': { title: [{ type: 'text', text: { content: l.nome } }] },
    'WhatsApp': { phone_number: fmtWa(l.whatsapp) },
    'Instagram / Site': rt(l.instagram_ou_site),
    'Negócio': rt(l.negocio),
    'Situação': { select: { name: l.situacao.slice(0, 100) } },
    'Motivo': rt(l.motivo),
    'Origem': { select: { name: l.landing_page } },
    'UTM Source': rt(l.utm_source),
    'UTM Medium': rt(l.utm_medium),
    'UTM Campaign': rt(l.utm_campaign),
    'UTM Content': rt(l.utm_content),
    'Referrer': rt(l.referrer),
    'Data': { date: { start: l.created_at } },
    'Status': { select: { name: 'NOVO' } },
  };
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify({ parent: { database_id: db }, properties: props }),
  });
  if (!res.ok) throw new Error(`notion_${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return { ok: true, url: j.url };
}

// ---------- e-mail (Resend) ----------
async function notify(l, notion) {
  const key = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM;
  const to = (process.env.LEAD_NOTIFY_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!key || !from || !to.length) return { skipped: true };
  const perfil = perfilUrl(l.instagram_ou_site);
  const rows = [
    ['Nome', l.nome], ['WhatsApp', fmtWa(l.whatsapp)], ['Instagram/Site', l.instagram_ou_site], ['Negócio', l.negocio],
    ['Situação', l.situacao], ['Motivo', l.motivo || '—'], ['Origem', origem(l)],
  ];
  const btn = (href, txt, bg) => `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;background:${bg};color:#F1F2EE;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.04em">${txt}</a>`;
  const linhas = rows.map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;color:#A8ADB2;vertical-align:top;white-space:nowrap;border-top:1px solid #2a2c30">${k}</td><td style="padding:8px 0;border-top:1px solid #2a2c30">${esc(v)}</td></tr>`).join('');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#111214;color:#F1F2EE;padding:24px;max-width:560px">
  <p style="margin:0 0 16px;font-size:12px;letter-spacing:.14em;color:#A8ADB2">NOVO DIAGNÓSTICO DE MARCA</p>
  <table style="width:100%;border-collapse:collapse;font-size:15px;line-height:1.45">${linhas}</table>
  <p style="margin:20px 0 0">${perfil ? btn(perfil, 'ABRIR PERFIL', '#2a2c30') : ''}${btn(zapUrl(l.whatsapp), 'ABRIR WHATSAPP', '#C94B3F')}${notion && notion.url ? btn(notion.url, 'ABRIR NO NOTION', '#2a2c30') : ''}</p>
  </div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nWhatsApp: ${zapUrl(l.whatsapp)}` + (perfil ? `\nPerfil: ${perfil}` : '');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: `Novo Diagnóstico de Marca — ${l.nome}`, html, text }),
  });
  if (!res.ok) throw new Error(`resend_${res.status}: ${(await res.text()).slice(0, 300)}`);
  return { ok: true };
}

// ---------- handler ----------
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'method_not_allowed' }); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, error: 'invalid_body' });

  // honeypot: responde como sucesso para não ensinar o bot, mas não grava nem notifica
  if (clean(body.website_url, 200)) return res.status(200).json({ ok: true });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ ok: false, error: 'rate_limited' });

  const { lead, errors } = parse(body);
  if (errors.length) return res.status(422).json({ ok: false, error: 'validation', fields: errors });

  const notionOn = !!(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID);
  const mailOn = !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM && process.env.LEAD_NOTIFY_TO);
  if (!notionOn && !mailOn) {
    console.error('[lead] nenhuma integração configurada (NOTION_* / RESEND_*). Lead NÃO foi salvo.');
    return res.status(503).json({ ok: false, error: 'not_configured' });
  }

  // 1) armazenar (fonte da verdade)  2) notificar. Sucesso exige que pelo menos um dos dois tenha funcionado.
  let notion = { skipped: true }, mail = { skipped: true };
  try { notion = await saveNotion(lead); } catch (e) { notion = { failed: true }; console.error('[lead] notion falhou', e.message); }
  try { mail = await notify(lead, notion); } catch (e) { mail = { failed: true }; console.error('[lead] e-mail falhou', e.message); }

  const saved = notion.ok === true, notified = mail.ok === true;
  if (!saved && !notified) return res.status(502).json({ ok: false, error: 'delivery_failed' });
  if (!saved && notionOn) console.error('[lead] ATENÇÃO: lead notificado por e-mail mas NÃO gravado no Notion', lead.created_at);
  if (!notified && mailOn) console.error('[lead] ATENÇÃO: lead gravado mas e-mail NÃO enviado', lead.created_at);
  return res.status(200).json({ ok: true });
}
