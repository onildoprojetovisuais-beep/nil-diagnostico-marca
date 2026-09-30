// Configuração central. Nada aqui é segredo: tudo vai para o bundle público.
export const CONFIG = {
  // 'development' liga logs de track() e o modo dry-run do formulário.
  ENV: import.meta.env.MODE,

  SUBMIT: {
    // Endpoint que recebe o lead (Apps Script/Sheets, Formspree, webhook...). VAZIO por padrão.
    // - Em desenvolvimento, vazio => simula sucesso e avisa no console (console.warn).
    // - Em produção, vazio => o envio FALHA explicitamente (nunca finge sucesso).
    ENDPOINT_URL: '',
    FORMAT: 'json',        // 'json' | 'form' (Apps Script costuma preferir 'form')
    HEADERS: {},
    TIMEOUT_MS: 12000,
  },

  // Fallback de contato quando o envio falha. Formato E.164 sem "+": '5511999999999'. Vazio = não mostra o link.
  WHATSAPP_FALLBACK_E164: '',

  // IDs de tracking. Vazios = nada é carregado; track() ainda alimenta window.dataLayer.
  TRACKING: { GTM_ID: '', GA4_ID: '', META_PIXEL_ID: '' },

  FORM_VERSION: '2026-09-v1',
};
