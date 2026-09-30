# LP Nil · Diagnóstico de Percepção de Marca

Landing page do link da bio do Nil (Diretor Criativo, Studio Pixel Rain). Objetivo único: solicitar o Diagnóstico de Percepção de Marca (gratuito). Tráfego principal: Instagram mobile (390px).

Stack: Vite (vanilla) + GSAP/ScrollTrigger/SplitText via npm. Sem framework, sem Lenis, sem WebGL. Site estático.

## Comandos

```bash
npm install
npm run dev        # http://localhost:5173  (formulário em modo dry-run: simula sucesso + console.warn)
npm run build      # gera dist/  (avisa se ENDPOINT_URL estiver vazio)
npm run preview    # serve dist/ em http://localhost:4173 (mesmo comportamento de produção)
npm run assets     # regenera public/ a partir de assets/ (só se mudar as imagens/vídeos usados)
```

## Estrutura

```
index.html                 markup + copy (fonte de verdade: copy/landing_page_diagnostico_percepcao_marca.md)
vite.config.js             plugin <x-pic> (gera <picture> AVIF/WebP/JPG com width/height do manifest) + aviso de endpoint
vercel.json                cache imutável e headers
src/main.js                bootstrap (CSS, track, CTA, form, vídeos; GSAP só depois do load+idle)
src/config.js              ENDPOINT, WhatsApp fallback, IDs de tracking
src/css/                   base.css (tokens, fontes, botão, grão), sections.css (8 capítulos), motion.css
src/js/track.js            track(): page_view, cta_click, form_start, form_submit, form_submit_error...
src/js/cta.js              scroll suave + foco no 1º campo, barra fixa mobile, topbar desktop
src/js/form.js             máscara WhatsApp, validação, estados, rascunho em sessionStorage
src/js/submit.js           submitLead(): envio ao endpoint
src/js/media.js            vídeos lazy (IntersectionObserver, saveData, 1 por vez, pausa fora da viewport)
src/js/motion.js           GSAP/ScrollTrigger (import dinâmico, desligado com prefers-reduced-motion)
scripts/video-anon/        anon.py anonimiza os clipes ARMI (rostos e crachás) a partir de assets/video
scripts/prepare-assets.mjs copia só os assets usados de assets/ para public/, gera OG, favicon e apple-touch-icon
public/                    o que vai para o build (img/, video/, fonts/, brand/, og/, favicon...)
assets/                    ORIGINAIS/fonte (34 MB; não são publicados)
copy/  _planning/          copy e documentação de planejamento/QA
```

Para trocar uma foto: edite o `<x-pic id="...">` no `index.html` (o `id` vem de `assets/manifest.json`), inclua o id em `USED_IMAGES` em `scripts/prepare-assets.mjs` e rode `npm run assets`.

## Configurar o endpoint do formulário (obrigatório antes de publicar)

Em `src/config.js`:

```js
SUBMIT: { ENDPOINT_URL: 'https://...', FORMAT: 'json' /* ou 'form' */, HEADERS: {}, TIMEOUT_MS: 12000 }
WHATSAPP_FALLBACK_E164: '5511999999999'   // opcional: mostra link "Chamar no WhatsApp" quando o envio falha
```

- Vazio em `npm run dev`: simula sucesso e avisa no console (`[lead:dry-run]`).
- Vazio em produção: o envio FALHA explicitamente com mensagem ao usuário (nunca finge sucesso) `npm run build` avisa localmente e BLOQUEIA na Vercel/CI (variável `VERCEL` ou `CI`); `ALLOW_NO_ENDPOINT=1` libera de propósito.
- Opções de destino (recomendação do doc de UX): Google Apps Script (Web App) gravando em Google Sheets, Formspree, webhook (Make/Zapier/n8n), Supabase (insert-only com RLS) ou uma Vercel Function em `/api/lead`. Apps Script costuma exigir `FORMAT: 'form'`.
- Payload enviado: `nome, whatsapp, whatsapp_e164, instagram_ou_site, o_que_faz, situacao, motivo, utm_*, fbclid, page_url, referrer, submitted_at, form_version, in_app`.
- Honeypot (`website_url`): se preenchido, a UI mostra sucesso mas nada é enviado.

## Analytics

Em `src/config.js`, `TRACKING: { GTM_ID, GA4_ID, META_PIXEL_ID }`. Só carregam se preenchidos, depois de `load` + idle. `track()` sempre alimenta `window.dataLayer`, mesmo sem IDs, e nunca envia dados pessoais.

| Evento | Quando | Parâmetros |
|---|---|---|
| `page_view` | carregamento (1x) | utm_*, referrer, viewport, in_app |
| `cta_click` | qualquer `[data-cta]` | location (hero, diagnostico, sinais, sticky_bar, header, cta_final), label, position |
| `form_start` | 1º foco em campo (1x) | first_field |
| `form_submit` | envio com sucesso | situacao (chave curta), has_motivo, event_id, time_to_submit_s |
| `form_submit_error` | falha de envio | reason (network, timeout, http_4xx, http_5xx, endpoint_missing) |
| `form_validation_error` | submit inválido | fields (ids, sem valores) |

Mapeamento: Meta `form_submit` vira `Lead`, demais viram eventos custom; GA4 recebe `form_submit` e `generate_lead`. Em desenvolvimento os eventos aparecem no console (`[track]`).

## Deploy na Vercel

1. Preencha `ENDPOINT_URL` (e o que mais precisar) em `src/config.js` e troque `https://DOMINIO-A-DEFINIR/` no `index.html` (canonical, og:url, og:image, JSON-LD) pelo domínio final.
2. `vercel` (preview) ou `vercel --prod`. Framework preset "Vite" (ou "Other"), build `npm run build`, output `dist`. `vercel.json` já define cache imutável para `/fonts`, `/img`, `/video`, `/brand`, `/assets` e headers de segurança.
3. Decisão pendente: indexação. Padrão = indexável. Para esconder do Google: `index.html` (`<meta name="robots" content="noindex, follow">`) e `public/robots.txt` (`Disallow: /`).

## Verificações rápidas

- 390x844: H1 + CTA visíveis sem scroll; sem scroll horizontal de 360 a 1440.
- `prefers-reduced-motion`: nada anima, GSAP nem é carregado, vídeos ficam só no poster.
- Peso inicial (sem cache, mobile): ~230 KB (HTML 9 + CSS 8 + JS 6 + GSAP 49 + fontes ~135 + foto hero 10-21 + logo 10, tudo gzip/brotli). Página completa com vídeos: ~8 MB, carregada sob demanda.
