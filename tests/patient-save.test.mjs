import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

function loadFunctions(context, path, names) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) {
      const code = node.getText(ast).replace(/^export /, '');
      vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
    } else ts.forEachChild(node, visit);
  }
  visit(ast);
}

function setup(dobText = '08/09/2000') {
  const calls = [];
  const button = { disabled: false, textContent: 'Save patient', dataset: {} };
  const fields = Object.fromEntries(Object.entries({ fullName: 'Sarah Lim', dob: '', idNumber: '12451254', gender: 'male', phone: '01239482014', email: 'sarah@example.com' }).map(([name, value]) => [name, { value }]));
  const form = { elements: { namedItem: name => fields[name] }, querySelector: () => button };
  const context = vm.createContext({
    document: { getElementById: id => id === 'patient-form' ? form : id === 'patient-dob-text' ? { value: dobText, focus() {} } : null },
    patientValidationFields: Object.fromEntries(['fullName', 'dob', 'idNumber', 'gender', 'phone', 'email'].map(field => [field, { inputId: `patient-${field}` }])),
    touchedPatientFields: new Set(), rejectedPatientIc: null,
    personNamePattern: /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u,
    emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    setPatientFieldError() {}, setPatientFormStatus: message => calls.push(['status', message]), setBadge() {},
    window: { dentalPatients: { create: async payload => { calls.push(['create', payload]); return { patientId: 'created-id' }; } } },
    patient: {}, normalizePatient: row => row, clearChartForPatientSelection() {},
    closePatientModal: () => calls.push(['close']),
  });
  loadFunctions(context, '../public/js/app.js', ['parseTypedDate']);
  loadFunctions(context, '../src/services/dentalPatients.ts', ['validateDentalPatient']);
  context.window.dentalPatients.validate = context.validateDentalPatient;
  context.commitDateField = () => { fields.dob.value = context.parseTypedDate(dobText) || ''; };
  loadFunctions(context, '../public/js/supabaseSync.js', ['patientFormPayload', 'liveDobError', 'validatePatientForm', 'createNewPatient']);
  return { context, calls, button, submit: () => context.createNewPatient({ currentTarget: form, preventDefault() {}, stopImmediatePropagation() {} }) };
}

test('valid patient submission reaches cloud creation and closes the modal', async () => {
  const { context, calls, button, submit } = setup();
  assert.equal(Object.keys(context.validatePatientForm({ showAll: true })).length, 0);
  await submit();
  assert.equal(calls.filter(([type]) => type === 'create').length, 1);
  assert.equal(calls.find(([type]) => type === 'create')[1].dob, '2000-09-08');
  assert.equal(context.patient.patientId, 'created-id');
  assert.ok(calls.some(([type]) => type === 'close'));
  assert.equal(button.disabled, false);
});

for (const dob of ['', '08/09', '31/02/2000', '08/09/2999']) {
  test(`invalid DOB ${JSON.stringify(dob)} blocks patient creation`, async () => {
    const { context, calls, submit } = setup(dob);
    assert.ok(context.validatePatientForm({ showAll: true }).dob);
    await submit();
    assert.equal(calls.some(([type]) => type === 'create'), false);
  });
}

test('cloud failure is displayed and allows retry', async () => {
  const { context, calls, button, submit } = setup();
  context.window.dentalPatients.create = async () => { throw new Error('Unable to save'); };
  await submit();
  assert.ok(calls.some(([type, message]) => type === 'status' && message === 'Unable to save'));
  assert.equal(calls.some(([type]) => type === 'close'), false);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Save patient');
});
