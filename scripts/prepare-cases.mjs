// Converte assets/cases/<case>/*.png em public/img/<id>-{480,800,1200}.{avif,webp} + jpg (480/800).
// Uso: npm run cases  (idempotente; ids vêm de src/data/cases.js)
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { pathToFileURL } from 'url';

const root = path.resolve(import.meta.dirname, '..');
const { CASES, WIDTHS } = await import(pathToFileURL(path.join(root, 'src/data/cases.js')).href);
const out = path.join(root, 'public', 'img');
fs.mkdirSync(out, { recursive: true });

for (const cs of CASES) for (const it of cs.items) {
  const file = path.join(root, 'assets', 'cases', cs.dir, it.src);
  const done = path.join(out, `${it.id}-1200.avif`);
  if (fs.existsSync(done) && fs.statSync(done).mtimeMs > fs.statSync(file).mtimeMs) continue;
  for (const w of WIDTHS) {
    const base = sharp(file).resize({ width: w, withoutEnlargement: true });
    await base.clone().avif({ quality: 55, effort: 4 }).toFile(path.join(out, `${it.id}-${w}.avif`));
    await base.clone().webp({ quality: 76 }).toFile(path.join(out, `${it.id}-${w}.webp`));
    if (w <= 800) await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(out, `${it.id}-${w}.jpg`));
  }
  console.log('ok', it.id);
}
