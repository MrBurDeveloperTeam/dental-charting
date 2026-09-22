import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';
function setup() {
 const store=new Map(); let href='https://charting.snabbb.com/';
 const browser={location:{get href(){return href;}},history:{state:null,replaceState(a,b,path){href=new URL(path,href).href;}}};
 const globals={URL,Date,console,window:browser,sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}};
 function load(path, deps={}, extra={}) {
  const source=readFileSync(new URL(path,import.meta.url),'utf8').replaceAll('import.meta.env.VITE_API_BASE_URL', 'undefined');
  const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{...globals,exports,require:k=>deps[k],...extra}); return exports;
 }
 const workspace=load('../src/services/workspaceContext.ts');
 const select=(type,owner='')=>{href='https://charting.snabbb.com/?workspace_type='+type+'&workspace_owner_id='+owner+'&sso_token=keep';workspace.captureWorkspaceFromUrl();};
 return {workspace,select,load,browser};
}
test('workspace capture preserves SSO and personal clears company',()=>{
 const s=setup();s.select('company','owner');assert.equal(s.workspace.getWorkspaceSelection().owner,'owner');assert.match(s.browser.location.href,/sso_token=keep/);
 s.select('personal');assert.equal(s.workspace.getWorkspaceSelection().owner,null);
 s.select('company');assert.throws(()=>s.workspace.getWorkspaceSelection(),/Select a company/);
});
test('clinic session uses Worker clinic, retains actor, and invalidates on workspace switch',async()=>{
 const s=setup();s.select('company','owner');let requests=0;
 const patients=s.load('../src/services/dentalPatients.ts',{'./workspaceContext':s.workspace,'../lib/supabaseClient':{getSupabaseClient:()=>({auth:{setSession:async()=>({data:{user:{id:'member'}}})}})}},{fetch:async(url,init)=>{
  if(url.endsWith('/sso/exchange'))return {ok:true,json:async()=>({access_token:'token',refresh_token:'refresh'})};
  requests++;const type=init.headers['X-Snabbb-Workspace-Type'];return {ok:true,json:async()=>({ok:true,actorUserId:'member',workspaceUserId:type==='company'?'owner':'member',workspaceType:type,clinicId:type+'-clinic'})};
 }});
 assert.equal((await patients.getClinicSession()).clinicId,'company-clinic');assert.equal((await patients.getClinicSession()).userId,'member');assert.equal(requests,1);
 s.select('personal');assert.equal((await patients.getClinicSession()).clinicId,'personal-clinic');assert.equal(requests,2);
});
test('denied workspace never falls back to profile clinic',async()=>{
 const s=setup();s.select('company','owner');
 const patients=s.load('../src/services/dentalPatients.ts',{'./workspaceContext':s.workspace,'../lib/supabaseClient':{getSupabaseClient:()=>({auth:{setSession:async()=>({data:{user:{id:'member'}}})}})}},{fetch:async url=>url.endsWith('/sso/exchange')?{ok:true,json:async()=>({access_token:'token',refresh_token:'refresh'})}:{ok:false,json:async()=>({error:'Company access denied'})}});
 await assert.rejects(patients.getClinicSession(),/Company access denied/);
});
