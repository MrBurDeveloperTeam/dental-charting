import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/legacy/loadLegacyChartScripts.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replace('import.meta.env.BASE_URL', '"/chart/"'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function setup() {
  const scripts = [];
  const context = vm.createContext({ exports: {}, document: {
    createElement: () => ({}),
    body: { appendChild: (script) => scripts.push(script) },
  } });
  vm.runInContext(compiled, context);
  return { scripts, load: context.exports.loadLegacyChartScripts };
}

test('chart dependencies finish loading before the engine and cloud sync start', async () => {
  const { scripts, load } = setup();
  const pending = load();
  const expected = ['tooth-silhouettes.js', 'inner-anatomy.js', 'materials.js?v=9', 'app.js?v=108', 'supabaseSync.js?v=12'];
  for (const [index, filename] of expected.entries()) {
    assert.equal(scripts.length, index + 1);
    assert.equal(scripts[index].src, `/chart/js/${filename}`);
    scripts[index].onload();
    await Promise.resolve();
  }
  await pending;
});

test('a failed dependency prevents partially initialized chart scripts from starting', async () => {
  const { scripts, load } = setup();
  const pending = load();
  scripts[0].onerror();
  await assert.rejects(pending, /Failed to load js\/tooth-silhouettes.js/);
  assert.equal(scripts.length, 1);
});
