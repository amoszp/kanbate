import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const ICONS = path.join(PUBLIC, 'icons');
const SOURCE = path.join(ICONS, 'source.svg');

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

fs.mkdirSync(ICONS, { recursive: true });

for (const t of targets) {
  const out = path.join(ICONS, t.file);
  await sharp(SOURCE).resize(t.size, t.size).png({ compressionLevel: 9 }).toFile(out);
  console.log(`generated ${path.relative(PUBLIC, out)} (${t.size}x${t.size})`);
}

// Apple devices expect a favicon too.
await fs.promises.copyFile(SOURCE, path.join(PUBLIC, 'favicon.svg'));
console.log('favicon.svg synced from source.svg');
