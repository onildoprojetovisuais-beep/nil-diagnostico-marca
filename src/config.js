// Configuração central. Nada aqui é segredo: tudo vai para o bundle público.
export const CONFIG = {
  // 'development' liga logs de track() e o modo dry-run do formulário.
  ENV: import.meta.env.MODE,

  SUBMIT: {
    // Função serverless da Vercel (api/diagnostico.js): valida, grava no Notion e avisa por e-mail.
    // As credenciais ficam só nas variáveis de ambiente do servidor.
    // - Em desenvolvimento com `vite` (sem /api), a 404 vira dry-run com aviso no console; use `vercel dev` para testar de verdade.
    // - Em produção, qualquer falha do servidor mostra o erro e preserva os dados (nunca finge sucesso).
    ENDPOINT_URL: '/api/diagnostico',
    FORMAT: 'json',
    HEADERS: {},
    TIMEOUT_MS: 12000,
  },

  // Fallback de contato quando o envio falha. Formato E.164 sem "+": '5511999999999'. Vazio = não mostra o link.
  WHATSAPP_FALLBACK_E164: '',

  // IDs de tracking. Vazios = nada é carregado; track() ainda alimenta window.dataLayer.
  TRACKING: { GTM_ID: '', GA4_ID: '', META_PIXEL_ID: '' },

  FORM_VERSION: '2026-09-v1',

  // Identifica a origem do lead no CRM.
  LANDING_PAGE: 'nil-diagnostico-marca',

  // Link da Política de Privacidade. Vazio = não mostra. Quando existir, aparece ao lado do aviso de consentimento.
  PRIVACY_URL: '',
};
