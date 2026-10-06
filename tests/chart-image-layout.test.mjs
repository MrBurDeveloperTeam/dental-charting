import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../src/services/chartImage.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
for(const review of [false,true])for(const collapsed of [false,true])for(const fail of [false,true]){
 test(`chart geometry and restoration: review=${review}, collapsed=${collapsed}, fail=${fail}`,async()=>{
  const classes=values=>{const s=new Set(values);return {contains:k=>s.has(k),add:k=>s.add(k),remove:k=>s.delete(k),toggle:(k,v)=>v?s.add(k):s.delete(k)}};
  const body={classList:classes([...(review?['patient-record-review']:[]),...(collapsed?['saved-entries-collapsed']:[])])};
  const panel={classList:classes(collapsed?['is-collapsed']:[])};
  const node={id:'real-chart'},blob={};let calls=0;
  const context=vm.createContext({exports:{},require:()=>({toBlob:async target=>{
   calls++;assert.equal(target,node);assert.equal(body.classList.contains('patient-record-review'),false);
   assert.equal(body.classList.contains('saved-entries-collapsed'),true);assert.equal(panel.classList.contains('is-collapsed'),true);
   if(fail)throw Error('capture');return blob;
  }}),window:{},document:{body,querySelector:()=>panel,fonts:{ready:Promise.resolve()},documentElement:{}},getComputedStyle:()=>['font-size','color'],requestAnimationFrame:fn=>fn()});
  vm.runInContext(source,context);
  if(fail)await assert.rejects(context.exports.chartToBlob(node,{}),/capture/);
  else {assert.equal(await context.exports.chartToBlob(node,{}),blob);assert.equal(calls,2);}
  assert.equal(body.classList.contains('patient-record-review'),review);
  assert.equal(body.classList.contains('saved-entries-collapsed'),collapsed);
  assert.equal(panel.classList.contains('is-collapsed'),collapsed);
 });
}
