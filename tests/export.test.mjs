import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source=readFileSync(new URL('../public/js/app.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const helper=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='downloadChartImage').getText();
function setup({fail=false,cancel=false}={}){
  const stage=Object.freeze({id:'live-chart'}),blob={type:'image/png'},events=[];
  const els={splitStage:stage,downloadChartImageBtn:{disabled:false},downloadChartImageLabel:{textContent:'Download Chart Image'}};
  const context=vm.createContext({els,document:{fonts:{ready:Promise.resolve().then(()=>events.push('fonts'))}},chartImageFileName:()=> 'chart.png',console:{error(){}},window:{
    devicePixelRatio:2,alert:()=>events.push('alert'),
    chartToBlob:async(node,options)=>{events.push('capture');assert.equal(node,stage);assert.equal(options.pixelRatio,2);assert.equal(options.width,undefined);assert.equal(options.height,undefined);if(fail)throw Error('capture failed');return blob;},
    showSaveFilePicker:async()=>{events.push('picker');if(cancel)throw {name:'AbortError'};return {createWritable:async()=>({write:async value=>{assert.equal(value,blob);events.push('write');},close:async()=>events.push('close')})};}
  }});
  vm.runInContext(helper,context);
  return {context,els,events};
}
test('exports the live chart at its current layout after fonts load, then saves the completed PNG',async()=>{
  const {context,els,events}=setup();await context.downloadChartImage();
  assert.deepEqual(events,['fonts','capture','picker','write','close']);
  assert.equal(els.downloadChartImageBtn.disabled,false);
  assert.equal(els.downloadChartImageLabel.textContent,'Download Chart Image');
});
test('capture failure does not open a picker and restores export controls',async()=>{
  const {context,els,events}=setup({fail:true});await context.downloadChartImage();
  assert.deepEqual(events,['fonts','capture','alert']);assert.equal(els.downloadChartImageBtn.disabled,false);
});
test('cancelling save does not write a file or show an error',async()=>{
  const {context,els,events}=setup({cancel:true});await context.downloadChartImage();
  assert.deepEqual(events,['fonts','capture','picker']);assert.equal(els.downloadChartImageBtn.disabled,false);
});
test('static preview registers the export renderer without Vite or module imports',()=>{
  const html=readFileSync(new URL('../preview.html',import.meta.url),'utf8');
  const script=html.match(/<script src="\.\/js\/(chart-image-export\.js)[^"]*"><\/script>/);
  assert.ok(script,'static preview must load the plain JavaScript renderer');
  const context=vm.createContext({window:{}});
  vm.runInContext(readFileSync(new URL('../public/js/'+script[1],import.meta.url),'utf8'),context);
  assert.equal(typeof context.window.chartToBlob,'function');
  assert.ok(html.indexOf(script[0])<html.indexOf('./js/app.js'));
});
