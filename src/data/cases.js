// FONTE ÚNICA dos cases (seção 04 — Provas). Imagens vêm de assets/cases/<dir>/<src>; `npm run cases` gera public/img/<id>-*.
//  featured: true  → case de destaque (ARMI, Feminino Moderno): trilha longa com preview: 6 imagens
//  featured: false → trilha curta (preview: 3) + botão "Ver projeto" que abre a lightbox com TODAS as imagens
// Ordem dos itens = ordem na galeria; o 1º é a capa. w/h = proporção real do arquivo.
export const WIDTHS = [480, 800, 1200];

const P = { w: 1200, h: 1800 }, L = { w: 1800, h: 1200 }, W = { w: 2400, h: 1350 };
// size: 'hero' (1º do case) | 'l' | 'm' | 's'   lift: 'top' | 'mid' | 'low' (altura na faixa)
const img = (id, src, dim, size, lift, focal) => ({ kind: 'img', id, src, ...dim, size, lift, caption: '', alt: '', focal, cor: true, local: true });
// caption/alt vazios de propósito (legendas por imagem ainda não revisadas): a galeria usa "<case>, imagem N"

export const CASES = [
  {
    id: 'armi', dir: 'armi', nome: 'ARMI Club', featured: true, preview: 6,
    desc: 'Uma marca que precisava existir além da tela.',
    items: [
      img('c-armi-backdrop', 'armi-backdrop.png', P, 'hero', 'mid'),
      img('c-armi-sala', 'armi-sala.png', W, 'l', 'top'),
      img('c-armi-palco', 'armi-palco.png', L, 'm', 'low'),
      img('c-armi-tela', 'armi-tela.png', L, 'l', 'mid'),
      img('c-armi-caneca', 'armi-caneca.png', P, 's', 'top'),
      img('c-armi-fita-cracha', 'armi-fita-cracha.png', L, 'm', 'low'),
    ],
  },
  {
    id: 'feminino-moderno', dir: 'feminino-moderno', nome: 'Feminino Moderno', featured: true, preview: 6,
    desc: 'Quando a marca ocupa a experiência inteira.',
    items: [
      img('c-fm-palco1', 'feminino-moderno-palco1.png', L, 'hero', 'mid'),
      img('c-fm-lambes', 'feminino-moderno-lambes.png', W, 'l', 'top'),
      img('c-fm-lambes2', 'feminino-moderno-lambes2.png', P, 's', 'low'),
      img('c-fm-nil', 'feminino-moderno-nil-com-lambes.png', P, 'm', 'top'),
      img('c-fm-backdrop', 'feminino-moderno-backdrop.png', L, 'l', 'mid'),
      img('c-fm-palco2', 'feminino-moderno-palco2.png', L, 'm', 'low'),
    ],
  },
  {
    id: 'lideres-em-movimento', dir: 'lideres-em-movimento', nome: 'Líderes em Movimento', featured: false, preview: 3,
    desc: 'Palco, pins e papelaria para um encontro de liderança.',
    items: [
      img('c-lideres-palco', 'lideres-em-moviment-palco.png', W, 'hero', 'mid'),
      img('c-lideres-caixa-pin', 'lideres-em-caixa-e-pin.png', P, 's', 'top'),
      img('c-lideres-carta', 'lideres-em-carta.png', L, 'm', 'low'),
      img('c-lideres-pin', 'lideres-em-pin.png', L, 'm', 'mid'),
      img('c-lideres-sacola', 'lideres-em-sacola.png', P, 's', 'top'),
    ],
  },
  {
    id: 'escola-do-vestir', dir: 'escola-do-vestir', nome: 'Escola do Vestir', featured: false, preview: 3,
    desc: 'Identidade aplicada em palco, telas e brindes.',
    items: [
      img('c-escola-palco', 'escola-do-vestir-palco.png', W, 'hero', 'mid'),
      img('c-escola-tela', 'escola-do-vestir-tela.png', L, 'm', 'low'),
      img('c-escola-agenda', 'escola-do-vestir-agenda.png', L, 'm', 'top'),
      img('c-escola-camisa', 'escola-do-vestir-camisa.png', P, 's', 'mid'),
      img('c-escola-ecobag', 'escola-do-vestir-ecobag.png', P, 's', 'low'),
    ],
  },
  {
    id: 'codigos-da-familia', dir: 'codigo-da-familia', nome: 'Códigos da Família', featured: false, preview: 3,
    desc: 'Palco, press kit e itens de marca.',
    items: [
      img('c-codigos-palco', 'codigo-da-familia-palco.png', W, 'hero', 'mid'),
      img('c-codigos-presskit', 'codigo-da-familia-presskit.png', L, 'm', 'top'),
      img('c-codigos-ecobag', 'codigo-da-familia-ecobag.png', L, 'm', 'low'),
      img('c-codigos-etiquetas', 'codigo-da-familia-etiquetas.png', P, 's', 'mid'),
      img('c-codigos-frame', 'Frame 1597883645.png', P, 's', 'top'),
    ],
  },
  {
    id: 'emilia-aurelio', dir: 'emilia-aurelio', nome: 'Emília Aurélio', featured: false, preview: 3,
    desc: 'Banners, agenda, crachá e ecobag.',
    items: [
      img('c-emilia-banners', 'emilia-aureliio-banners.png', W, 'hero', 'mid'),
      img('c-emilia-agenda', 'emilia-aureliio-agenda.png', L, 'm', 'low'),
      img('c-emilia-cracha', 'emilia-aureliio-cracha.png', P, 's', 'top'),
      img('c-emilia-ecobag', 'emilia-aureliio-ecobag.png', L, 'm', 'mid'),
    ],
  },
];
