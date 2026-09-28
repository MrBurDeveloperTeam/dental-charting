import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';

// Loads src/services/activityLog.ts in a sandbox with a fake browser, so the
// tracker's payloads, no-PII rule and page timing can be checked without one.
function setup({ verify = { user: { email: 'dr@clinic.test', first_name: 'Ada', last_name: 'Lim', id: 'sb-1' } } } = {}) {
  const posts = [];
  const listeners = {};
  let clock = 1_000_000;
  const document = {
    visibilityState: 'visible',
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
  };
  const window = {
    setTimeout: () => 0,
    addEventListener: (type, fn) => { (listeners['window:' + type] ||= []).push(fn); },
    dentalPatients: { create: async () => ({ id: 'p1', name: 'SECRET NAME' }) },
    dentalCharts: {
      saveEntry: async () => ({}),
      deleteEntry: async () => undefined,
      deleteEntries: async () => undefined,
    },
    dentalMaterials: { save: async () => undefined },
  };
  const fetch = async (url, init) => {
    if (String(url).endsWith('/api/verify-token')) return { ok: verify !== null, json: async () => verify };
    posts.push({ url, body: JSON.parse(init.body), init });
    return { ok: true, json: async () => ({ ok: true }) };
  };
  class FakeDate extends Date { static now() { return clock; } }
  const source = readFileSync(new URL('../src/services/activityLog.ts', import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, window, document, fetch, Date: FakeDate, console, Promise, JSON, Array, String, Number, Boolean, Math, crypto: { randomUUID: () => 'uuid-' + posts.length } },
  );
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  return { exports, window, posts, listeners, tick: (ms) => { clock += ms; }, flush };
}

test('session_start and service calls are logged with the actor and no patient data', async () => {
  const s = setup();
  s.exports.startActivityTracking();
  await s.flush(); await s.flush();
  assert.equal(s.posts[0].body.action, 'session_start');
  assert.equal(s.posts[0].body.actor_email, 'dr@clinic.test');
  assert.equal(s.posts[0].body.actor_name, 'Ada Lim');
  assert.equal(s.posts[0].body.supabase_user_id, 'sb-1');
  assert.equal(s.posts[0].url, '/api/charting/activity');

  await s.window.dentalPatients.create({ name: 'SECRET NAME', id_number: '900101-01-1234' });
  await s.window.dentalCharts.saveEntry({}, { toothNumber: 16, treatment: 'filling', layer: 'existing' });
  await s.window.dentalCharts.saveEntry({}, { id: '123e4567-e89b-12d3-a456-426614174000', toothNumber: 16, treatment: 'filling', layer: 'planned' });
  await s.window.dentalCharts.deleteEntries({}, ['a', 'b']);
  await s.flush(); await s.flush();

  const byAction = Object.fromEntries(s.posts.map((p) => [p.body.action, p.body]));
  assert.equal(byAction.patient_created.details, 'Created a patient record');
  assert.match(byAction.chart_entry_saved.details, /tooth 16, filling/);
  assert.match(byAction.chart_entry_updated.details, /planned/);
  assert.equal(byAction.chart_entries_deleted.details, 'Deleted 2 chart entries');
  assert.ok(!JSON.stringify(s.posts).includes('SECRET NAME'));
  assert.ok(!JSON.stringify(s.posts).includes('900101'));
});

test('a failing service call is not logged and still rejects for the caller', async () => {
  const s = setup();
  s.window.dentalCharts.saveEntry = async () => { throw new Error('boom'); };
  s.exports.startActivityTracking();
  await s.flush(); await s.flush();
  const before = s.posts.length;
  await assert.rejects(() => s.window.dentalCharts.saveEntry({}, { toothNumber: 1, treatment: 'x' }), /boom/);
  await s.flush();
  assert.equal(s.posts.length, before);
});

test('page_view is sent with its duration when the screen changes; sub-second visits are skipped', async () => {
  const s = setup();
  s.exports.startActivityTracking();
  await s.flush(); await s.flush();
  s.exports.setActivePage('/chart');
  s.tick(42_000);
  s.exports.setActivePage('/patient-records');
  s.tick(300);
  s.exports.setActivePage('/chart');
  await s.flush(); await s.flush();
  const views = s.posts.filter((p) => p.body.action === 'page_view');
  assert.equal(views.length, 1);
  assert.equal(views[0].body.page_path, '/chart');
  assert.equal(views[0].body.page_duration_seconds, 42);
});

test('pagehide sends the open page and session_end with total session seconds', async () => {
  const s = setup();
  s.exports.startActivityTracking();
  await s.flush(); await s.flush();
  s.exports.setActivePage('/chart');
  s.tick(90_000);
  s.listeners['window:pagehide'].forEach((fn) => fn());
  await s.flush();
  const end = s.posts.find((p) => p.body.action === 'session_end');
  assert.equal(end.body.session_duration_seconds, 90);
  assert.ok(s.posts.some((p) => p.body.action === 'page_view' && p.body.page_duration_seconds === 90));
});

test('nothing is sent when nobody is logged in', async () => {
  const s = setup({ verify: null });
  s.exports.startActivityTracking();
  await s.flush(); await s.flush();
  s.exports.logActivity('patient_created', 'x');
  await s.flush(); await s.flush();
  assert.equal(s.posts.length, 0);
});
