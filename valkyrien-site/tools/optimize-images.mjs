// Image pipeline: every raster in src/assets/img -> WebP + AVIF next to the source.
// Usage: npm run images [-- --width 1600]
import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { join, parse } from 'node:path';

const dir = new URL('../src/assets/img/', import.meta.url).pathname;
const widthArg = process.argv.indexOf('--width');
const maxWidth = widthArg > -1 ? Number(process.argv[widthArg + 1]) : 2400;
const RASTER = /\.(png|jpe?g|tiff?)$/i;

const files = (await readdir(dir)).filter((f) => RASTER.test(f));
if (!files.length) {
  console.log('No source rasters in src/assets/img. Nothing to do.');
  process.exit(0);
}

for (const file of files) {
  const src = join(dir, file);
  const { name } = parse(file);
  const base = sharp(src).rotate().resize({ width: maxWidth, withoutEnlargement: true });
  await Promise.all([
    base.clone().webp({ quality: 80, effort: 5 }).toFile(join(dir, `${name}.webp`)),
    base.clone().avif({ quality: 55, effort: 6 }).toFile(join(dir, `${name}.avif`)),
  ]);
  const kb = async (f) => ((await stat(join(dir, f))).size / 1024).toFixed(0);
  console.log(`${file} (${await kb(file)} KB) -> webp ${await kb(`${name}.webp`)} KB, avif ${await kb(`${name}.avif`)} KB`);
}
