import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';
const app=readFileSync(new URL('../public/js/app.js',import.meta.url),'utf8');
const materials=readFileSync(new URL('../public/js/materials.js',import.meta.url),'utf8');
function declarations(source){return ts.createSourceFile('source.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).statements.filter(ts.isFunctionDeclaration).map(n=>n.getText()).join('\n');}
function setup(){
 const c=vm.createContext({lowerCrownFilterSequence:0,wholeStatusOverlaySerial:0,chartMode:'permanent',draft:{treatment:'filling',material:null},document:{addEventListener:()=>{}},selection:{teeth:[24,27]},flatEntries:()=>[]});
 vm.runInContext(app.slice(0,app.indexOf('const STORAGE_PATIENT_KEY'))+'\n'+readFileSync(new URL('../public/js/inner-anatomy.js',import.meta.url),'utf8')+'\n'+declarations(app)+'\n'+materials+'\nmaterialCatalogLoaded=true;',c);
 vm.runInContext('globalThis.materialDefaults=DEFAULT_DENTAL_MATERIALS.map(item=>({...item}));',c);
 return c;
}
test('materials remain independent per entry after serialization',()=>{
 const c=setup(),entries=JSON.parse(JSON.stringify([{treatment:'filling',material:'gold'},{treatment:'filling',material:'gic'}]));
 assert.equal(c.entryColor(entries[0]),'#d4a72c');assert.equal(c.entryColor(entries[1]),'#f8530d');
 assert.equal(c.materialForTreatment({treatment:'caries',material:'gold'}),null);
});
test('sealant keeps a groove mark and follows its optional material color',()=>{
 const c=setup();
 assert.equal(c.entryColor({treatment:'sealant',material:'emax'}),'#f2c7a5');
 assert.equal(c.entryColor({treatment:'sealant',material:null}),'#55a8e8');
 const html=c.renderSurfaceOverlay(37,'occ',{complete:{M:{treatment:'sealant',material:'gold'}}});
 assert.match(html,/class="sealant-groove"/);
 assert.match(html,/stroke="#d4a72c"/);
 assert.doesNotMatch(html,/fill="#d4a72c" fill-opacity="\.92"/);
});
test('bridge and implant use distinct procedure fallbacks until a material is selected',()=>{
 const c=setup();
 assert.equal(c.entryColor({treatment:'bridge',material:null}),'#6366f1');
 assert.equal(c.entryColor({treatment:'implant',material:null}),'#0f9fa8');
 assert.equal(c.entryColor({treatment:'bridge',material:'gold'}),'#d4a72c');
 assert.equal(c.entryColor({treatment:'implant',material:'zirconia'}),'#e7f0f3');
});
test('every built-in material has a unique clinically representative default color',()=>{
 const c=setup();
 const expected={amalgam:'#7a858f',composite:'#c87a4d',gic:'#f8530d',zirconia:'#e7f0f3',emax:'#f2c7a5',pfm:'#d5dce3',gold:'#d4a72c',metal:'#56616b',temporary:'#e9d36f',ceramic:'#e8d7c8'};
 assert.deepEqual(Object.fromEntries(c.materialDefaults.map(({code,color})=>[code,color])),expected);
 assert.equal(new Set(Object.values(expected)).size,Object.keys(expected).length);
});
test('all four restorations require a material; conditions can save null',()=>{
 const c=setup();for(const treatment of ['filling','inlay','onlay','overlay']){
 c.draft={treatment,material:null};assert.ok(c.materialSelectionError());c.draft.material='gold';assert.equal(c.materialSelectionError(),'');
 }
 for(const treatment of ['caries','fracture','crack','extraction','retainedRoot','kiv']){c.draft={treatment,material:null};assert.equal(c.materialSelectionError(),'');}
});
test('material field visibility follows the treatment group',()=>{
 const c=setup();
 for(const treatment of ['caries','fracture','crack','retainedRoot','m1','m2','m3','impacted','kiv'])assert.equal(c.shouldShowMaterialField(treatment),false);
 for(const treatment of ['filling','rootCanal','implant','bridge','crown'])assert.equal(c.shouldShowMaterialField(treatment),true);
});
test('condition choices render before restoration choices',()=>{
 const c=setup();
 assert.deepEqual(Array.from(vm.runInContext('CATEGORIES.map(category=>category.id)',c)),['condition','restoration','procedure','prosthetic']);
});
test('crowns and retained roots are complementary in both views and arches',()=>{
 const c=setup();for(const n of [11,24,26,31,44,46])for(const v of ['front','occ']){
 const crown={style:{},insertAdjacentHTML:()=>{}},root={style:{},insertAdjacentHTML:()=>{}};
 c.applyAnatomyClip(crown,n,v,{treatment:'crown'});c.applyAnatomyClip(root,n,v,{treatment:'retainedRoot'});
 assert.ok(crown.style.clipPath);assert.ok(root.style.clipPath);assert.notEqual(crown.style.clipPath,root.style.clipPath);
 const bounds=c.crownBounds(n,v);assert.ok(bounds.end-bounds.start>0);assert.ok(bounds.end-bounds.start<bounds.height);
 }
});
test('implant replaces roots in both views',()=>{const c=setup();for(const n of [24,46])for(const v of ['front','occ']){const svg=c.anatomySVG(n,v,{treatment:'implant'});assert.match(svg,/implant-root/);assert.match(svg,/implant-crown/);}});
test('implant overlay keeps crown geometry without inheriting the crown color',()=>{
 const c=setup();
 assert.match(c.wholeStatusOverlaySVG(24,'front','implant','existing',{treatment:'implant',material:null}),/#0f9fa8/);
 assert.match(c.wholeStatusOverlaySVG(24,'front','implant','existing',{treatment:'implant',material:'gold'}),/#d4a72c/);
});
test('root canal overlay draws root-only lines clipped to each tooth',()=>{
 const c=setup();
 assert.equal((c.rctOverlayHTML(11).match(/class="rct-canal"/g)||[]).length,1);
 assert.equal((c.rctOverlayHTML(14).match(/class="rct-canal"/g)||[]).length,2);
 assert.equal((c.rctOverlayHTML(16).match(/class="rct-canal"/g)||[]).length,3);
 for(const n of [18,28,46]){
   const overlay=c.rctOverlayHTML(n);
   assert.match(overlay,/<clipPath id="rct-root-clip-/);
   assert.doesNotMatch(overlay,/rct-chamber|rct-horn|rct-canal-glow/);
 }
});
test('labels do not replace whole-tooth anatomy',()=>{const c=setup();for(const id of ['impacted','m1','m2','m3','kiv'])assert.equal(c.treatmentFor(id).mode,'label');});
test('label conditions render in the mini preview',()=>{
 const c=setup();
 assert.match(c.conditionBadgeHTML({treatment:'impacted',status:'existing'},'mini-condition-badge'),/mini-condition-badge badge-impacted impacted-tooth-label[^>]*>IMP</);
 assert.match(c.conditionBadgeHTML({treatment:'kiv',status:'planned'},'mini-condition-badge'),/badge-kiv planned[^>]*>KIV</);
});
test('every visible treatment has descriptive icon markup',()=>{
 const c=setup();
 for(const id of ['filling','inlay','onlay','overlay','sealant','caries','fracture','crack','missing','impacted','m1','m2','m3','retainedRoot','kiv','rootCanal','extraction','implant','bridge','crown','veneer']){
  const icon=c.defaultTreatmentIcon(id),markup=c.treatmentIconMarkup(icon,'#3b82f6');
  assert.match(markup,/^<svg/);assert.ok(markup.length>100,`${id} should have descriptive icon markup`);
 }
 assert.notEqual(c.defaultTreatmentIcon('inlay'),c.defaultTreatmentIcon('onlay'));
 assert.notEqual(c.defaultTreatmentIcon('crown'),c.defaultTreatmentIcon('bridge'));
});
test('surface material color and damage marks stay surface-specific',()=>{
 const c=setup();const filling=c.renderSurfaceOverlay(24,'occ',{complete:{M:{treatment:'filling',material:'gold'},D:{treatment:'filling',material:'gic'}}});
 assert.match(filling,/#d4a72c/);assert.match(filling,/#f8530d/);
 const damage=c.renderSurfaceOverlay(24,'occ',{complete:{M:{treatment:'fracture'},D:{treatment:'crack'}}});
 assert.match(damage,/damage-fracture/);assert.match(damage,/damage-crack/);assert.match(damage,/clip-path/);
});
