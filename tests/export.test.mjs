import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source=readFileSync(new URL('../public/js/app.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const helper=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='prepareChartImageClone').getText();

for(const [name,clip,top,height] of [
  ['implant crown','inset(0% 0px 60% 0px)',0,40],
  ['reversed inner crown','inset(43% 0px 0% 0px)',43,57],
  ['retained root','inset(40% 0px 0% 0px)',40,60],
  ['bridge pontic','inset(0% 0px 60% 0px)',0,40]
])test(`PNG preserves ${name} clipping without changing anatomy dimensions`,()=>{
  const anatomy={};
  const element={style:{},clientWidth:40,clientHeight:100,childNodes:[anatomy],querySelectorAll:()=>[],append(node){this.crop=node;}};
  const doc={defaultView:{innerWidth:800,getComputedStyle:()=>({clipPath:clip,position:'relative'})},createElement:()=>({style:{},append(...nodes){this.children=nodes;}})};
  const stage={ownerDocument:doc,querySelectorAll:selector=>selector==='[style]'?[element]:[]};
  const context=vm.createContext({});vm.runInContext(helper,context);
  context.prepareChartImageClone(stage);
  assert.match(element.crop.style.cssText,new RegExp(`top:${top}px`));
  assert.match(element.crop.style.cssText,new RegExp(`height:${height}px`));
  assert.match(element.crop.style.cssText,/overflow:hidden/);
  assert.match(element.crop.children[0].style.cssText,/width:40px;height:100px/);
  assert.equal(element.crop.children[0].children[0],anatomy);
  assert.equal(element.style.height,'100px');
  assert.equal(element.style.clipPath,'none');
});
