import {readFile, writeFile} from 'node:fs/promises';

// Share the live chart markup while retaining the preview's local data bootstrapping.
const live = await readFile('index.html', 'utf8');
const preview = await readFile('preview.html', 'utf8');
const loader = await readFile('src/legacy/loadLegacyChartScripts.ts', 'utf8');
const footerStart = preview.indexOf('<div class="modal-backdrop" id="patient-modal"');
const footerEnd = preview.lastIndexOf('</body>');
if (footerStart < 0 || footerEnd < footerStart) throw new Error('Preview bootstrap not found');
let footer = preview.slice(footerStart, footerEnd).trim();
for (const [, path] of loader.matchAll(/"(js\/[^"?]+(?:\?v=[^"]+)?)"/g)) {
  const name = path.split('?')[0];
  footer = footer.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\?v=[^"\\s]+)?', 'g'), path);
}
const synced = live
  .replace('<head>', '<head><base href="./public/">')
  .replaceAll('href="./css/', 'href="../css/')
  .replace('saved-entries-collapsed auth-session-gated', 'saved-entries-collapsed')
  .replace('id="patient-record-nav-item" type="button"', 'id="patient-record-nav-item" type="button" onclick="window.location.href=\'./patient-record-preview.html\'"')
  .replace('<script type="module" src="/src/main.tsx"></script>', footer);
await writeFile('preview.html', synced);
