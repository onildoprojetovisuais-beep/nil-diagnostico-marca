// Sem palavras órfãs: usa espaço inseparável (NBSP) para (1) ligar as duas últimas palavras de cada bloco de texto
// e (2) ligar palavras curtas (o, a, e, de, um, no…) à palavra seguinte, regra clássica de tipografia em português.
// Roda uma vez no carregamento, antes do motion.js (SplitText / palavra a palavra respeitam o NBSP).
const NB = '\u00a0';
const SKIP = '.hero__h1, [data-no-nbsp], script, style, svg, code, pre';
const BLOCKS = 'p, h1, h2, h3, h4, figcaption, li, summary, blockquote, dd';

function textNodes(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const out = []; for (let n = w.nextNode(); n; n = w.nextNode()) out.push(n);
  return out;
}

function fix(el) {
  if (el.matches(SKIP) || el.closest(SKIP)) return;
  // item de lista/summary que já contém parágrafos ou títulos: os filhos são tratados à parte
  if (el.matches('li, summary, dd') && el.querySelector('p, h1, h2, h3, h4, ul, ol')) return;
  const nodes = textNodes(el).filter((n) => n.nodeValue.trim());
  if (!nodes.length) return;
  // (2) palavras curtas coladas na seguinte, dentro de cada nó (e no fim do nó, se houver texto depois)
  nodes.forEach((n, i) => {
    let v = n.nodeValue.replace(/(^|[ ])(\p{L}{1,2}) (?=\S)/gu, (_, a, b) => a + b + NB);
    if (i < nodes.length - 1) v = v.replace(/(^|[ ])(\p{L}{1,2}) $/u, (_, a, b) => a + b + NB);
    if (v !== n.nodeValue) n.nodeValue = v;
  });
  // (1) última palavra ligada à anterior (pode atravessar nós, ex.: "o <strong>negócio</strong>")
  for (let i = nodes.length - 1; i >= 0; i--) {
    const v = nodes[i].nodeValue.replace(/[ ]+$/, '');
    const k = v.lastIndexOf(' ');
    if (k > 0) { nodes[i].nodeValue = nodes[i].nodeValue.slice(0, k) + NB + nodes[i].nodeValue.slice(k + 1); return; }
    // só uma palavra neste nó: liga ao espaço que o antecede no nó anterior
    if (i > 0) {
      const p = nodes[i - 1].nodeValue;
      if (/ $/.test(p)) { nodes[i - 1].nodeValue = p.slice(0, -1) + NB; return; }
      if (/^\S/.test(nodes[i].nodeValue) === false) { /* começa com espaço: já está ligado */ return; }
    }
  }
}

export function initTipografia() {
  document.querySelectorAll(BLOCKS).forEach(fix);
}
