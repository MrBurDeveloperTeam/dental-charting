import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Checked-in browser bundle for plain static servers (including Live Server).
// Keep the renderer shared with the Vite application.
await build({
  entryPoints: ['src/previewChartImage.ts'],
  outfile: 'public/js/chart-image-export.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  // This bundle is checked in and reviewed directly, so preserve readable
  // function names, indentation, and line breaks on every rebuild.
  minify: false,
  legalComments: 'eof',
});

// A changed renderer must not reuse the static preview's cached script URL.
const bundle = await readFile('public/js/chart-image-export.js');
const version = createHash('sha256').update(bundle).digest('hex').slice(0, 12);
const preview = await readFile('preview.html', 'utf8');
await writeFile('preview.html', preview.replace(/chart-image-export\.js\?v=[^"']+/g,
  `chart-image-export.js?v=${version}`));
