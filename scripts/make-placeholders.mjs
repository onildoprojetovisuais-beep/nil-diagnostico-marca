// Gera SVGs de placeholder para itens kind 'ph' de src/data/cases.js -> public/galeria/ph/<caseId>-<nn>.svg
// Uso: npm run placeholders (idempotente; também chamado por npm run assets). Sem fotos inventadas.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const root = path.resolve(import.meta.dirname, '..');
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function makePlaceholders() {
  const { CASES } = await import(pathToFileURL(path.join(root, 'src/data/cases.js')).href);
  const dir = path.join(root, 'public/galeria/ph');
  fs.mkdirSync(dir, { recursive: true });
  const wanted = new Set();
  for (const c of CASES) {
    c.items.forEach((it, i) => {
      if (it.kind !== 'ph') return;
      const nn = String(i + 1).padStart(2, '0');
      const name = `${c.id}-${nn}.svg`;
      wanted.add(name);
      const { w, h } = it;
      const u = Math.max(w, h) / 100; // unidade proporcional
      const m = 3 * u, arm = 5 * u, sw = 0.18 * u;
      const fs1 = Math.max(1.6 * u, 14), fs2 = Math.max(1.3 * u, 12);
      const label = `[ ${nn} — ${c.nome.toUpperCase()} ]`;
      const corner = (x, y, dx, dy) => `<path d="M${x} ${y + dy * arm}V${y}H${x + dx * arm}"/>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Espaço reservado: ${esc(c.nome)}, imagem ${nn}">
<defs><pattern id="t" width="${4 * u}" height="${4 * u}" patternUnits="userSpaceOnUse"><path d="M0 ${4 * u}L${4 * u} 0" stroke="#F1F2EE" stroke-opacity=".035" stroke-width="${sw}"/></pattern></defs>
<rect width="${w}" height="${h}" fill="#1A1C1F"/>
<rect width="${w}" height="${h}" fill="url(#t)"/>
<g fill="none" stroke="#A8ADB2" stroke-opacity=".6" stroke-width="${sw * 1.4}">${corner(m, m, 1, 1)}${corner(w - m, m, -1, 1)}${corner(m, h - m, 1, -1)}${corner(w - m, h - m, -1, -1)}</g>
<g font-family="'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace" text-anchor="middle" fill="#A8ADB2">
<text x="${w / 2}" y="${h / 2 - fs1 * 0.6}" font-size="${fs1}" letter-spacing="${fs1 * 0.12}">${esc(label)}</text>
<rect x="${w / 2 - 3 * u}" y="${h / 2 + fs1 * 0.2}" width="${6 * u}" height="${sw * 2}" fill="#C94B3F"/>
<text x="${w / 2}" y="${h / 2 + fs1 * 0.2 + fs2 * 1.9}" font-size="${fs2}" letter-spacing="${fs2 * 0.18}">IMAGEM ${nn}</text>
</g>
</svg>
`;
      const f = path.join(dir, name);
      if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== svg) fs.writeFileSync(f, svg);
    });
  }
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.svg') && !wanted.has(f)) fs.unlinkSync(path.join(dir, f));
  return wanted.size;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`placeholders: ${await makePlaceholders()} SVGs em public/galeria/ph/`);
}
