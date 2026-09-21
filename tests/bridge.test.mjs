import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('app.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function setup() {
  const upper = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  const lower = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
  const state = Object.fromEntries([...upper,...lower].map(n=>[n,{entries:[]}]));
  const events=[];
  const context=vm.createContext({
    activeUpperDisplay:()=>upper, activeLowerDisplay:()=>lower,
    isGhostPrimarySlot:()=>false, activeState:()=>state,
    flatEntries:()=>Object.values(state).flatMap(t=>t.entries),
    selection:{multi:false,teeth:[24]}, draft:{tooth:24,treatment:'composite',category:'restoration',view:'occ',status:'existing',layer:'existing',surfaces:[],note:''},
    editingEntry:null, chartMode:'permanent', crypto:{randomUUID:()=> String(Math.random())}, uid:()=>String(Math.random()),
    materialForTreatment:e=>e.material||null,materialSelectionError:()=>"",showChartValidation:message=>events.push({type:"validation",message}),canStartCharting:()=>true, normalizeDraft:()=>{}, renderAll:()=>{},
    treatmentFor:id=>({category:['bridge','partialDenture'].includes(id)?'prosthetic':id==='spacing'?'condition':'restoration'}),
    document:{dispatchEvent:e=>events.push(e)},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail}},
    window:{alert:message=>events.push({type:'alert',message})},els:{noteInput:{value:''}},selectedEntryIds:new Set()
  });
  const names=['bridgeSelectionError','bridgeSpan','isGroupedProsthetic','spacingPairs','spacingSelectionError','partialDentureSelectionError','groupedSelectionError','groupedTargets','pickTreatment','toggleMultiMode','saveDraft','removeSelectedEntries'];
  for(const statement of ast.statements)if(ts.isFunctionDeclaration(statement)&&names.includes(statement.name?.text))vm.runInContext(statement.getText(ast),context);
  return {context,state,events};
}
test('bridge endpoints expand across one arch in display order',()=>{
 const {context:c}=setup();
 for(const span of [[24,25,26],[24,27],[25,27],[28,27,26,25],[12,11,21],[42,41,31,32],[23,25,28]])assert.equal(c.bridgeSelectionError(span),'');
 for(const span of [[],[24],[24,25],[24,25,36],[24,24,25]])assert.notEqual(c.bridgeSelectionError(span),'');
});
test('null primary slots and inactive teeth cannot bridge a gap',()=>{
 const {context:c}=setup();c.activeUpperDisplay=()=>[55,54,null,52,51];
 assert.notEqual(c.bridgeSelectionError([54,52,51]),'');
 c.activeUpperDisplay=()=>[55,54,53,52,51];c.isGhostPrimarySlot=n=>n===53;
 assert.notEqual(c.bridgeSelectionError([54,53,52]),'');
});
test('Bridge enables batch mode and cannot toggle it off',()=>{
 const {context:c}=setup();c.pickTreatment('bridge');assert.equal(c.selection.multi,true);assert.equal(c.draft.category,'prosthetic');
 c.toggleMultiMode();assert.equal(c.selection.multi,true);
});
test('leaving Bridge turns batch mode off and keeps the current tooth',()=>{
 const {context:c}=setup();c.pickTreatment('bridge');c.selection.teeth=[24,25,26];c.draft.tooth=26;
 c.pickTreatment('crown');
 assert.equal(c.selection.multi,false);assert.deepEqual([...c.selection.teeth],[26]);
});
test('invalid span never saves; valid span saves a shared group',()=>{
 const {context:c,state,events}=setup();c.pickTreatment('bridge');c.selection.teeth=[24,36];c.saveDraft();
 assert.equal(events[0].type,'validation');assert.equal(state[23].entries.length,0);
 c.selection.teeth=[24,25,26];c.saveDraft();
 assert.equal(state[24].entries[0].bridgeId,state[26].entries[0].bridgeId);
 assert.equal(events.at(-1).detail.entries.length,3);assert.equal(c.draft.tooth,null);
});
test('editing a bridge updates existing members and removes deselected members',()=>{
 const {context:c,state,events}=setup();
 for(const tooth of [24,25,26,27])state[tooth].entries=[{id:String(tooth),tooth,treatment:'bridge',bridgeId:'group'}];
 c.editingEntry={tooth:24,id:'24',bridgeId:'group'};c.draft.treatment='bridge';c.selection.multi=true;c.selection.teeth=[24,25,26];c.saveDraft();
 assert.equal(state[27].entries.length,0);assert.equal(state[24].entries.length,1);assert.equal(state[25].entries[0].id,'25');
 assert.equal(events[0].type,'dental-chart:delete-entries');
});
test('deleting a bridge member deletes the span but preserves other treatments',()=>{
 const {context:c,state,events}=setup();
 for(const tooth of [24,25,26])state[tooth].entries=[{id:String(tooth),tooth,bridgeId:'group'}];
 state[25].entries.push({id:'other',tooth:25});c.removeSelectedEntries(['24']);
 assert.equal(state[24].entries.length,0);assert.equal(state[26].entries.length,0);assert.equal(state[25].entries[0].id,'other');
 assert.equal(events[0].detail.ids.length,3);
});

test('24 and 27 save four teeth with two rootless pontics and shared material',()=>{
 const {context:c,state}=setup();c.pickTreatment('bridge');c.selection.teeth=[27,24];c.draft.material='zirconia';c.saveDraft();
 for(const n of [24,25,26,27])assert.equal(state[n].entries[0].material,'zirconia');
 assert.equal(state[24].entries[0].bridgeRole,'abutment');assert.equal(state[27].entries[0].bridgeRole,'abutment');
 assert.equal(state[25].entries[0].bridgeRole,'pontic');assert.equal(state[26].entries[0].bridgeRole,'pontic');
});
test('partial denture uses batch selection and saves consecutive replacement teeth as one group',()=>{
 const {context:c,state,events}=setup();c.pickTreatment('partialDenture');
 assert.equal(c.selection.multi,true);c.selection.teeth=[14,15,16];c.draft.material='acrylic';c.saveDraft();
 assert.equal(events.at(-1).detail.entries.length,3);
 assert.equal(state[14].entries[0].bridgeId,state[16].entries[0].bridgeId);
 for(const n of [14,15,16])assert.equal(state[n].entries[0].bridgeRole,'pontic');
});
test('partial denture rejects mixed arches and non-consecutive replacement teeth',()=>{
 const {context:c}=setup();
 assert.equal(c.partialDentureSelectionError([14,15,16]),'');
 assert.notEqual(c.partialDentureSelectionError([14,16]),'');
 assert.notEqual(c.partialDentureSelectionError([14,44]),'');
});
test('spacing rejects isolated and non-neighbouring teeth',()=>{
 const {context:c}=setup();
 assert.equal(c.spacingSelectionError([11,21]),'');
 assert.equal(c.spacingSelectionError([24,25]),'');
 assert.notEqual(c.spacingSelectionError([24]),'');
 assert.notEqual(c.spacingSelectionError([24,26]),'');
 assert.notEqual(c.spacingSelectionError([24,44]),'');
});
test('spacing enables locked batch mode and saves a two-tooth group',()=>{
 const {context:c,state,events}=setup();c.pickTreatment('spacing');
 assert.equal(c.selection.multi,true);assert.equal(c.draft.category,'condition');
 c.toggleMultiMode();assert.equal(c.selection.multi,true);
 c.selection.teeth=[24,25];c.saveDraft();
 assert.equal(events.at(-1).detail.entries.length,2);
 assert.equal(state[24].entries[0].bridgeId,state[25].entries[0].bridgeId);
 assert.equal(state[24].entries[0].treatment,'spacing');
});

for(const view of ['front','occ','numbers'])test(`spacing opens cumulative gaps without crowding adjacent teeth in ${view} view`,()=>{
 const {context:c}=setup();
 const list=[18,17,16,15,14];
 const entries={18:[{bridgeId:'a'}],17:[{bridgeId:'a'},{bridgeId:'b'}],16:[{bridgeId:'b'}]};
 c.spacingEntriesForLayer=n=>entries[n]||[];
 c.document.createElement=()=>({setAttribute(){}});
 const fn=ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='appendSpacingMarkers');
 vm.runInContext(fn.getText(ast),c);
 const children=list.map(()=>({style:{},markers:[],appendChild(marker){this.markers.push(marker)}}));
 c.appendSpacingMarkers({children},list,view,'existing');
 assert.deepEqual(children.map(t=>t.style.translate),[-1,0,1,1,1].map(n=>`calc(var(--spacing-gap, 9px) * ${n}) 0`));
 assert.deepEqual(children.map(t=>t.markers.length),view==='numbers'?[0,0,0,0,0]:[1,1,0,0,0]);
 assert.ok(children.every(t=>t.style.scale===undefined));
 // A draft gap works before saving, and disappears when the draft is cleared.
 c.spacingEntriesForLayer=()=>[];
 c.draft.treatment='spacing';c.selection.teeth=[17,16];
 const preview=list.map(()=>({style:{},appendChild(){}}));
 c.appendSpacingMarkers({children:preview},list,view,'existing');
 assert.deepEqual(preview.map(t=>t.style.translate),[-.5,-.5,.5,.5,.5].map(n=>`calc(var(--spacing-gap, 9px) * ${n}) 0`));
 c.draft.treatment='composite';
 c.appendSpacingMarkers({children:preview},list,view,'existing');
 assert.ok(preview.every(t=>t.style.translate==='calc(var(--spacing-gap, 9px) * 0) 0'));
});

 test('spacing batch saves independent overlapping gaps',()=>{
 const {context:c,state}=setup();c.pickTreatment('spacing');c.selection.teeth=[25,26,27];c.saveDraft();
 assert.equal(state[26].entries.length,2);
 assert.equal(state[25].entries[0].bridgeId,state[26].entries[0].bridgeId);
 assert.equal(state[27].entries[0].bridgeId,state[26].entries[1].bridgeId);
 assert.notEqual(state[26].entries[0].bridgeId,state[26].entries[1].bridgeId);
 });
 test('spacing batch can exclude the gap between separate pairs',()=>{
 const {context:c,state}=setup();c.pickTreatment('spacing');c.selection.teeth=[25,26,27,28];c.selection.spacingExcluded=['26-27'];c.saveDraft();
 assert.equal(state[26].entries.length,1);assert.equal(state[27].entries.length,1);
 assert.notEqual(state[26].entries[0].bridgeId,state[27].entries[0].bridgeId);
 });

test('editing one spacing pair preserves another pair sharing the tooth',()=>{
 const {context:c,state}=setup();c.pickTreatment('spacing');
 state[25].entries=[{id:'a25',tooth:25,treatment:'spacing',bridgeId:'a'}];
 state[26].entries=[{id:'a26',tooth:26,treatment:'spacing',bridgeId:'a'},{id:'b26',tooth:26,treatment:'spacing',bridgeId:'b'}];
 state[27].entries=[{id:'b27',tooth:27,treatment:'spacing',bridgeId:'b'}];
 c.editingEntry={tooth:25,id:'a25',bridgeId:'a'};c.selection.teeth=[25,26];c.saveDraft();
 assert.equal(state[26].entries.length,2);assert.ok(state[26].entries.some(e=>e.bridgeId==='b'));
 assert.equal(state[27].entries[0].bridgeId,'b');assert.ok(!state[25].entries.some(e=>e.bridgeId==='a'));
});
test('spacing cannot save when all gap buttons are disabled',()=>{
 const {context:c,state}=setup();c.pickTreatment('spacing');c.selection.teeth=[25,26];c.selection.spacingExcluded=['25-26'];
 assert.notEqual(c.spacingSelectionError(c.selection.teeth),'');c.saveDraft();assert.equal(state[25].entries.length,0);
});

test('spacing markers center between rendered tooth edges at different widths and zoom levels',()=>{
 const {context:c}=setup();
 const fn=ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='positionSpacingMarkers');vm.runInContext(fn.getText(ast),c);
 for(const scale of [1,.6,1.5]){
   const leftArt={getBoundingClientRect:()=>({right:140*scale,width:40*scale})};
   const rightArt={getBoundingClientRect:()=>({left:160*scale,width:70*scale})};
   const left={offsetWidth:60,getBoundingClientRect:()=>({left:90*scale,width:60*scale}),querySelector:()=>leftArt,nextElementSibling:{querySelector:()=>rightArt}};
   const marker={parentElement:left,style:{}};c.document.querySelectorAll=()=>[marker];c.positionSpacingMarkers();
   assert.ok(Math.abs(parseFloat(marker.style.left)-60)<.001);
 }
});

test('saved summary groups treatment spans and keeps overlapping spacing pairs separate',()=>{
 const {context:c}=setup();const fn=ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='savedEntryGroups');vm.runInContext(fn.getText(ast),c);
 const items=[
 ...[36,37,38].map(tooth=>({tooth,treatment:'bridge',bridgeId:'b',status:'existing'})),
 ...[25,26].map(tooth=>({tooth,treatment:'spacing',bridgeId:'s1',status:'existing'})),
 ...[26,27].map(tooth=>({tooth,treatment:'spacing',bridgeId:'s2',status:'existing'})),
 ...[44,45].map(tooth=>({tooth,treatment:'partialDenture',bridgeId:'p',status:'planned'})),
 {tooth:11,treatment:'caries'},{tooth:12,treatment:'caries'}];
 const groups=c.savedEntryGroups(items);assert.deepEqual(Array.from(groups,g=>g.length),[3,2,2,2,1,1]);
 assert.equal(c.savedEntryGroups([...items,{tooth:36,treatment:'bridge',bridgeId:'b',status:'planned'}]).length,7);
});
