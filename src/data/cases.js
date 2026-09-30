// FONTE ÚNICA dos cases da galeria (seção 04 — Provas). Para trocar/adicionar imagem: edite só aqui.
//  kind 'img'  : id do assets/manifest.json (arquivos /img/<id>-<w>.{avif,webp,jpg}; jpg só no fallback <=800)
//  kind 'video': clipe mudo local (/video/<id>-720.mp4 + /video/<id>-poster.webp). Na trilha aparece o poster; toca na lightbox.
//  kind 'ph'   : placeholder local gerado por `npm run placeholders` em /galeria/ph/<case>-<nn>.svg (w/h = proporção)
//  cor: true mantém a foto colorida (padrão da página: P&B via .foto; só a âncora do ARMI é em cor)
//  size: 'hero' (destaque, 1 por case, sempre o 1º) | 'l' | 'm' | 's'   lift: 'top' | 'mid' | 'low' (altura na faixa)
// Para trocar um placeholder por foto real: troque o item por img('<id do manifest>', ...) e rode `npm run assets`.
export const WIDTHS = [480, 800, 1200];

const img = (id, w, h, size, lift, caption, alt, focal, cor = false) => ({ kind: 'img', id, w, h, size, lift, caption, alt, focal, cor });
const vid = (id, caption, alt, size = 's', lift = 'mid') => ({ kind: 'video', id, w: 720, h: 1280, size, lift, caption, alt });
const ph = (w, h, size, lift) => ({ kind: 'ph', w, h, size, lift });

export const CASES = [
  {
    id: 'armi', nome: 'ARMI Club', desc: 'Uma marca que precisava existir além da tela.',
    items: [
      img('armi-brasao-backdrop-luz', 1800, 2700, 'hero', 'mid', 'Brasão', 'Brasão do ARMI Club iluminado em um backdrop no evento', '50% 55%', true),
      img('armi-espaco-brasao-parede', 1800, 1013, 'l', 'top', 'Espaço', 'Ambiente do ARMI Club com o brasão em um painel de parede', '75% 50%'),
      vid('armi-brasao-maria', 'Telão', 'Brasão do ARMI Club exibido no telão do evento'),
      img('armi-brasao-esboco-mao', 1800, 1013, 'm', 'low', 'Esboço', 'Mão desenhando a lápis o brasão do ARMI Club', '30% 45%'),
      img('armi-mesa-evento', 1800, 1200, 'l', 'mid', 'Mesa', 'Mesa de evento com materiais da marca ARMI Club', '50% 55%'),
      vid('armi-pessoas-certas-rodrigao', 'Painel', 'Painel do evento ARMI Club com a frase As pessoas certas', 's', 'top'),
      img('armi-caderno-dourado', 1800, 1200, 'm', 'low', 'Caderno', 'Caderno preto com a marca ARMI Club em dourado e uma caneta sobre mesa de madeira', '40% 55%'),
      vid('armi-telao-casa-mariadel', 'Ambiente', 'Telão do evento ARMI Club com uma foto de família', 's', 'low'),
      img('armi-telao-family-equity', 1800, 497, 'm', 'mid', 'Family Equity', 'Telão do ARMI Club com o brasão e o texto Family Equity', '50% 50%'),
    ],
  },
  {
    id: 'feminino-moderno', nome: 'Feminino Moderno', desc: 'Quando a marca ocupa a experiência inteira.',
    items: [
      img('fm-cartazes-close-novo-sempre-melhor', 1800, 1013, 'hero', 'mid', 'Cartazes', 'Cartazes tipográficos gigantes do evento Feminino Moderno', '50% 45%'),
      img('fm-cartazes-jardim-noite', 1800, 1013, 'm', 'low', 'Ambiente', 'Estrutura de cartazes e flores do Feminino Moderno à noite', '50% 55%'),
      img('fm-sonho-ancestrais-painel', 1800, 1013, 'l', 'top', 'Palco', 'Painel vermelho do palco do Feminino Moderno com a frase Eu sou o sonho das minhas ancestrais', '58% 50%'),
      img('fm-cartazes-colagem-padrao', 1800, 729, 'm', 'mid', 'Padrão', 'Colagem de cartazes lambe-lambe do Feminino Moderno, com frases e montagens', '50% 50%'),
      img('fm-parede-verde-cartazes-o', 1800, 1013, 'l', 'low', 'Parede', 'Parede de folhagens com cartazes do Feminino Moderno e uma escultura circular branca', '55% 50%'),
      img('fm-mockup-fachadas-palco', 1800, 1013, 'm', 'top', 'Fachadas', 'Mockup da arte Alis volat propis do Feminino Moderno em fachada, palco e cartazes de rua', '50% 50%'),
      img('fm-mockup-sacola-ancestrais', 1800, 1013, 's', 'mid', 'Sacola', 'Mockup de sacolas de algodão com a frase Eu sou o sonho das minhas ancestrais', '50% 50%'),
      img('fm-mockup-cadernos', 1800, 1013, 'm', 'low', 'Cadernos', 'Mockup de três cadernos do Feminino Moderno com beija-flor, borboleta e coração ilustrados', '50% 50%'),
    ],
  },
  {
    id: 'encontro-das-deusas', nome: 'Encontro das Deusas', desc: '',
    items: [ph(1600, 1000, 'hero', 'mid'), ph(800, 1100, 's', 'top'), ph(1400, 900, 'l', 'low'), ph(1000, 1000, 'm', 'top'), ph(1800, 800, 'm', 'mid')],
  },
  {
    id: 'lideres-em-movimento', nome: 'Líderes em Movimento', desc: '',
    items: [ph(1600, 1000, 'hero', 'mid'), ph(900, 1200, 's', 'low'), ph(1500, 1000, 'l', 'top'), ph(1000, 800, 'm', 'low'), ph(1800, 800, 'm', 'mid')],
  },
  {
    id: 'escola-do-vestir', nome: 'Escola do Vestir', desc: 'Identidade aplicada.',
    items: [
      img('escola-vestir-backdrop-evento', 1800, 1013, 'hero', 'mid', 'Backdrop', 'Aplicação da identidade da Escola do Vestir em um backdrop de evento', '50% 50%'),
      img('escola-vestir-outdoor', 1800, 1013, 'm', 'low', 'Outdoor', 'Mockup de outdoor com três painéis da identidade da Escola do Vestir', '50% 50%'),
      img('escola-vestir-rollups', 1800, 1013, 'l', 'top', 'Rollups', 'Mockup de três rollups da Escola do Vestir: Classic, Gold e Premium', '50% 50%'),
      ph(1400, 900, 'm', 'mid'),
      ph(900, 1200, 's', 'low'),
    ],
  },
  {
    id: 'codigos-da-familia', nome: 'Códigos da Família', desc: 'Identidade aplicada.',
    items: [
      img('codigos-familia-palco', 1800, 1013, 'hero', 'mid', 'Palco', 'Aplicação da identidade Códigos da Família em um palco de evento', '50% 50%'),
      img('codigos-familia-kit-caixa', 1800, 1013, 'l', 'low', 'Kit', 'Kit em caixa de papelão com a marca Códigos da Família, cartão e adesivos', '50% 50%'),
      ph(900, 1200, 's', 'top'), ph(1400, 900, 'm', 'mid'), ph(1800, 800, 'm', 'low'),
    ],
  },
];
