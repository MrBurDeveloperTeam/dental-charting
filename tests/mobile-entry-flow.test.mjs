import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=readFileSync(new URL('../public/js/app.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
function context(names,globals){const ctx=vm.createContext(globals);for(const name of names){const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text===name);assert.ok(fn,name);vm.runInContext(fn.getText(ast),ctx);}return ctx;}
for(const [material,surface,expected] of [[false,false,[2,4]],[true,false,[2,3,4]],[false,true,[2,1,4]],[true,true,[2,3,1,4]]])test(`conditional mobile steps: material=${material}, surface=${surface}`,()=>{
 const c=context(['mobileEntrySteps'],{draft:{treatment:'example'},shouldShowMaterialField:()=>material,treatmentFor:()=>({mode:surface?'surface':'whole'})});
 assert.deepEqual(Array.from(c.mobileEntrySteps()),expected);
});
test('selection taps toggle teeth without resetting treatment, surfaces, notes or layer',()=>{
 const draft={tooth:16,treatment:'composite',surfaces:['M'],note:'Keep',layer:'planned'};
 const c=context(['handleToothClick'],{draft,selection:{teeth:[16]},mobileSelectionSession:{},isGhostPrimarySlot:()=>false,renderAll(){}});
 c.handleToothClick(15,'front','existing');c.handleToothClick(16,'occ');
 assert.deepEqual(Array.from(c.selection.teeth),[15]);assert.equal(draft.tooth,15);assert.equal(draft.note,'Keep');assert.equal(draft.layer,'planned');assert.deepEqual(draft.surfaces,['M']);
 c.handleToothClick(15,'occ');assert.equal(draft.tooth,null);
});
test('invalid grouped selection opens selector before advancing',()=>{
 let opened=false;
 const c=context(['setMobileEntryStep'],{mobileEntrySteps:()=>[2,3,4],mobileEntryStep:2,isGroupedProsthetic:()=>true,groupedSelectionError:()=> 'Select endpoints',selection:{teeth:[16]},startMobileTeethSelection(){opened=true;}});
 c.setMobileEntryStep(3);assert.equal(opened,true);assert.equal(c.mobileEntryStep,2);
});
test('back navigation from surfaces is allowed without selecting a surface',()=>{
 const c=context(['setMobileEntryStep'],{mobileEntrySteps:()=>[2,3,1,4],mobileEntryStep:1,surfaceSelectionError:()=> 'Required',materialSelectionError:()=>'',isGroupedProsthetic:()=>false,renderMobileEntryWizard(){},mobileEntryEls:{content:{scrollTop:20}}});
 c.setMobileEntryStep(3);assert.equal(c.mobileEntryStep,3);
});
test('cancel restores original draft, teeth and gap exclusions',()=>{
 const c=context(['finishMobileTeethSelection'],{mobileSelectionSession:{draft:{tooth:16,note:'original'},selection:{multi:false,teeth:[16]},fromEntry:true,step:2},draft:{tooth:15,note:'changed'},selection:{multi:true,teeth:[15],spacingExcluded:['15-16']},renderAll(){},openMobileEntryWizard(){},renderMobileEntryWizard(){},mobileEntryStep:1});
 c.finishMobileTeethSelection(false);assert.equal(c.draft.tooth,16);assert.equal(c.draft.note,'original');assert.equal(c.selection.multi,false);assert.deepEqual(Array.from(c.selection.teeth),[16]);assert.equal(c.selection.spacingExcluded.length,0);assert.equal(c.mobileEntryStep,2);
});
for(const [surface,initial,expected] of [['O','front','occ'],['I','front','occ'],['L','front','occ'],['B','occ','front'],['F','occ','front'],['M','occ','occ'],['D','front','front']])test(`selecting ${surface} uses ${expected} preview and preserves other surfaces`,()=>{
 const c=context(['toggleSurface'],{draft:{treatment:'caries',view:initial,surfaces:['M']},treatmentFor:()=>({mode:'surface',views:['front','occ']}),renderAll(){}});
 c.toggleSurface(surface);assert.equal(c.draft.view,expected);assert.ok(c.draft.surfaces.includes(surface));assert.ok(c.draft.surfaces.includes('M'));
});
test('deselecting a surface does not change the preview view',()=>{
 const c=context(['toggleSurface'],{draft:{treatment:'caries',view:'front',surfaces:['O','B']},treatmentFor:()=>({mode:'surface',views:['front','occ']}),renderAll(){}});
 c.toggleSurface('O');assert.equal(c.draft.view,'front');assert.deepEqual(Array.from(c.draft.surfaces),['B']);
});
for(const tooth of [15,16])test(`tap selected tooth ${tooth} reopens closed mobile entry at first step without changing draft`,()=>{
 let opened=0;
 const draft={tooth:15,treatment:'filling',material:'composite',note:'Keep me',surfaces:['O'],view:'occ',status:'planned'};
 const before=JSON.stringify(draft);
 const c=context(['handleToothClick'],{draft,selection:{multi:true,teeth:[15,16]},mobileSelectionSession:null,mobileEntryOpen:false,mobileToothModalOpen:false,mobileEntryStep:4,isMobileToothModalViewport:()=>true,mobileEntrySteps:()=>[2,3,1,4],openMobileEntryWizard(){opened++;c.mobileEntryStep=2;},renderMobileEntryWizard(){}});
 c.handleToothClick(tooth,'front','existing');assert.equal(opened,1);assert.equal(c.mobileEntryStep,2);assert.equal(JSON.stringify(draft),before);assert.deepEqual(c.selection.teeth,[15,16]);
});
