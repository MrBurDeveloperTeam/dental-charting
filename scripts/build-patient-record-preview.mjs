import { readFile, writeFile } from 'node:fs/promises';

// Reuse the chart preview's full DOM and original scripts, including its editor
// and export dialogs. Only the sample-record shell is specific to this page.
const source = await readFile(new URL('../preview.html', import.meta.url), 'utf8');
const html = source
  .replace('<base href="./public/">', '<base href="./">')
  .replace('<title>Dental Charting</title>', '<title>Patient record · Snabbb</title>')
  .replace('</head>', '<link rel="stylesheet" href="../css/patient-record-preview.css">\n</head>')
  .replace('body class="saved-entries-collapsed"', 'body class="patient-record-review record-local-preview"')
  .replace('<div id="record-review-summary-root"></div>', '<div id="record-review-summary-root"></div><section id="preview-record-list" class="patient-records-page" hidden></section>')
  .replace(/<script type="module" src="\/src\/previewProfile[^>]*><\/script>/, '')
  .replace(/<script defer src="\.\.\/tests\/material-fixture[^>]*><\/script>/, '<script defer src="./js/patient-record-preview.js"></script>');
await writeFile(new URL('../public/patient-record-preview.html', import.meta.url), html);
await writeFile(new URL('../patient-record-preview.html', import.meta.url), '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Patient record preview</title><meta http-equiv="refresh" content="0;url=./public/patient-record-preview.html"></head><body><a href="./public/patient-record-preview.html">Open patient record preview</a></body></html>\n');
