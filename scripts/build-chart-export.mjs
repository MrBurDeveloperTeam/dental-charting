import { build } from 'esbuild';

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
