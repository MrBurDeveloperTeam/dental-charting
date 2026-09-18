import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const app=readFileSync(new URL('../public/js/app.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('app.js',app,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const functions=ast.statements.filter(ts.isFunctionDeclaration).map(n=>n.getText(ast)).join('\n');
const metadata=readFileSync(new URL('../public/js/inner-anatomy.js',import.meta.url),'utf8');
function setup(mode='permanent'){
  const c=vm.createContext({chartMode:mode});
  vm.runInContext(metadata+'\n'+functions+'\nthis.assets=INNER_ANATOMY',c);
  return c;
}

test('every supplied tooth has an asset and a matching nonempty silhouette',()=>{
  const c=setup();
  assert.equal(Object.keys(c.assets).length,60);
  for(const a of Object.values(c.assets)){
    assert.ok(existsSync(new URL('../public/'+a.asset.slice(2),import.meta.url)));
    assert.ok(a.width>0&&a.height>0&&a.path.startsWith('M'));
  }
});
test('both dentitions retain legacy surface codes and expose inner anterior faces',()=>{
  for(const mode of ['permanent','primary']){
    const c=setup(mode);
    for(const key of Object.keys(c.assets).filter(k=>k.startsWith(mode+':'))){
      const n=Number(key.split(':')[1]);
      const codes=Array.from(c.availableSurfaceCodes(n,'occ')).sort();
      const anterior=['incisor','canine'].includes(c.toothType(n));
      assert.deepEqual(codes,anterior?['D','I','L','M']:['B','D','L','M','O']);
      assert.ok(c.defaultSurfaceFor(n,'occ').every(code=>codes.includes(code)));
      assert.deepEqual(Object.values(c.surfacePadSpec(n,'occ')).filter(Boolean).sort(),codes,'every selectable surface must be exposed by the keyboard-accessible pad');
      for(const region of c.innerSurfaceDefs(n)){
        const y=region.cy/c.crownDims(n).height;
        assert.ok(c.isUpper(n)?y<.56:y>.42,`${n} surface must avoid the root`);
      }
    }
  }
});
test('mesial selection faces the midline on all four quadrants',()=>{
  const c=setup();
  for(const n of [11,21,31,41,51,61,71,81]){
    c.chartMode=n>=50?'primary':'permanent';
    const regions=c.innerSurfaceDefs(n),m=regions.find(r=>r.key==='M'),d=regions.find(r=>r.key==='D');
    assert.equal(m.cx>d.cx,[1,4,5,8].includes(Math.floor(n/10)));
  }
});
test('right-side permanent root views map mesial and distal to their anatomical sides',()=>{
  const c=setup('permanent');
  for(const n of [18,17,16,15,14,13,12,11,48,47,46,45,44,43,42,41]){
    const regions=c.surfaceDefs(n,'front'),m=regions.find(r=>r.key==='M'),d=regions.find(r=>r.key==='D');
    assert.ok(m&&d,`${n} exposes both M and D root regions`);
    assert.ok(m.cx>d.cx,`${n} root mesial region faces the midline`);
    const pad=c.surfacePadSpec(n,'front');
    assert.equal(pad.top,[13,12,11,43,42,41].includes(n)?'F':'B',`${n} root pad keeps its facial/buccal surface`);
    assert.equal(pad.left,'D',`${n} left root pad selects distal`);
    assert.equal(pad.right,'M',`${n} right root pad selects mesial`);
    assert.equal(pad.bottom,'L',`${n} root pad keeps its lingual surface`);
    const crown=c.innerSurfaceDefs(n),crownM=crown.find(r=>r.key==='M'),crownD=crown.find(r=>r.key==='D');
    assert.ok(crownM.cx>crownD.cx,`${n} crown mapping remains unchanged`);
  }
});
test('right-side primary root views map mesial and distal to their anatomical sides',()=>{
  const c=setup('primary');
  for(const n of [17,16,55,54,53,52,51,47,46,85,84,83,82,81]){
    const regions=c.surfaceDefs(n,'front'),m=regions.find(r=>r.key==='M'),d=regions.find(r=>r.key==='D');
    assert.ok(m&&d,`${n} exposes both M and D root regions`);
    assert.ok(m.cx>d.cx,`${n} root mesial region faces the midline`);
    const pad=c.surfacePadSpec(n,'front');
    assert.equal(pad.left,'D',`${n} left root pad selects distal`);
    assert.equal(pad.right,'M',`${n} right root pad selects mesial`);
    const crown=c.innerSurfaceDefs(n),crownM=crown.find(r=>r.key==='M'),crownD=crown.find(r=>r.key==='D');
    assert.ok(crownM.cx>crownD.cx,`${n} crown mapping remains unchanged`);
  }
});
test('crown regions use circular sectors except for the requested anterior teeth',()=>{
  const c=setup();
  const rectangular=[13,12,11,21,22,23,42,41,32];
  const permanent=[11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48];
  for(const n of permanent){
    const paths=c.innerSurfaceDefs(n).map(region=>region.path);
    assert.ok(paths.every(path=>rectangular.includes(n)?!path.includes('C'):path.includes('C')),`${n} crown geometry`);
  }
});
test('permanent successors in primary mode use the new anatomy',()=>{
  const c=setup('primary');
  for(const n of [11,12,13,14,15,21,31,41])assert.equal(c.innerAnatomy(n).asset,c.assets[`permanent:${n}`].asset);
  assert.equal(c.innerAnatomy(16).asset,c.assets['primary:16'].asset);
});

test('crown surfaces appear in root view without projecting occlusal or root-only findings',()=>{
  const c=setup();
  c.treatmentFor=id=>({mode:'surface',views:id==='sealant'?['occ']:['occ','front']});
  const entry={view:'occ',treatment:'caries',surfaces:['M','O','D']};
  assert.deepEqual(Array.from(c.visibleEntrySurfaces(16,'front',entry)),['M','D']);
  assert.deepEqual(Array.from(c.visibleEntrySurfaces(16,'occ',entry)),['M','O','D']);
  assert.deepEqual(Array.from(c.visibleEntrySurfaces(16,'front',{...entry,treatment:'sealant'})),[]);
  assert.deepEqual(Array.from(c.visibleEntrySurfaces(16,'occ',{...entry,view:'front'})),[]);
  c.draft={...entry,tooth:16};
  assert.deepEqual(Array.from(c.selectedSurfaces(16,'front')),['M','D']);
  assert.equal(c.selectedSurfaces(17,'front').size,0);
  for(const status of ['existing','planned','watch']){
    c.entriesByStatus=(n,s,layer)=>n===16&&s===status&&layer==='existing'?[entry]:[];
    const map=c.surfaceMap(16,'front',status,'existing');
    assert.equal(map.M,entry);
    assert.equal(map.D,entry);
    assert.equal(map.O,undefined);
    assert.equal(Object.keys(c.surfaceMap(16,'front',status,'planned')).length,0);
  }
});
