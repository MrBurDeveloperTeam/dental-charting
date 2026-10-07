import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../src/services/chartImage.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
for(const fail of [false,true])test(`mobile embeds repeated SVG tooth assets without waiting for clone load events (failure=${fail})`,async()=>{
 const makeImage=()=>({tagName:'image',attrs:{href:'teeth/11.png'},getAttribute(name){return this.attrs[name];},setAttribute(name,value){this.attrs[name]=value;},removeAttributeNS(){}});
 const images=[makeImage(),makeImage()];let requests=0;
 const context=vm.createContext({exports:{},require:()=>({}),URL,AbortController,setTimeout,clearTimeout,
  fetch:async(url)=>{requests++;assert.equal(url,'https://chart.test/teeth/11.png');return {ok:!fail,status:404,blob:async()=>({size:10})};},
  FileReader:class {readAsDataURL(){this.result='data:image/png;base64,dGVzdA==';this.onload();}}
 });
 vm.runInContext(source+'\nexports.inlineMobileChartImages=inlineMobileChartImages;',context);
 const capture=context.exports.inlineMobileChartImages({ownerDocument:{baseURI:'https://chart.test/'},querySelectorAll:()=>images});
 if(fail)await assert.rejects(capture,/Tooth artwork request failed/);
 else {await capture;assert.ok(images.every(image=>image.attrs.href.startsWith('data:image/png')));}
 assert.equal(requests,1);
});
for (const failure of [null, 'image', 'empty']) {
 test(`mobile rasterization works without foreground animation frames (${failure || 'success'})`,async()=>{
  const events=[],blob={size:123,type:'image/png'};
  const canvas={width:0,height:0,getContext:()=>({
   drawImage(){events.push('draw');},clearRect(){events.push('clear');}
  }),toBlob(callback,type){assert.equal(type,'image/png');callback(failure==='empty'?null:blob);}};
  const context=vm.createContext({exports:{},require:()=>({}),document:{createElement:()=>canvas},
   Image:class {set src(value){assert.equal(value,'data:image/svg+xml,test');if(failure==='image')this.onerror();else this.onload();}},
   requestAnimationFrame(){throw Error('A background tab cannot supply animation frames');}
  });
  vm.runInContext(source+'\nexports.rasterizeMobileChart=rasterizeMobileChart;',context);
  if(failure)await assert.rejects(context.exports.rasterizeMobileChart('data:image/svg+xml,test',726,887),failure==='image'?/could not be loaded/:/empty PNG/);
  else {assert.equal(await context.exports.rasterizeMobileChart('data:image/svg+xml,test',726,887),blob);assert.deepEqual(events,['draw','clear','draw']);}
  assert.equal(canvas.width,0);assert.equal(canvas.height,0);
 });
}
