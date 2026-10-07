import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source=readFileSync(new URL('../public/js/app.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const helper=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['captureChartImage','downloadChartImage','isMobileChartDownload','downloadMobileChartImage','blobDataUrl','isSafariExport','openExportWindow'].includes(n.name.text)).map(n=>n.getText()).join('\n');
const pdfHelper=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='downloadPdf').getText();
for(const failure of [null,'capture','decode','print']){
  test(`PDF embeds the shared chart capture and cleans up (${failure||'success'})`,async()=>{
    const events=[],listeners=new Map(),classes=new Set();
    const heading={textContent:'Saved Entries'},button={disabled:false,setAttribute(){},removeAttribute(){}};
    const image={async decode(){events.push('decode');if(failure==='decode')throw Error('decode');},remove(){events.push('remove');}};
    const context=vm.createContext({
      els:{downloadPdfBtn:button,splitStage:{closest:()=>({appendChild(value){assert.equal(value,image);events.push('append');}})}},
      document:{title:'Chart',querySelector:()=>heading,createElement:()=>image,body:{classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)}}},
      isSafariExport:()=>false,renderPrintSections:()=>{},patient:{patientId:'test'},
      captureChartImage:async()=>{events.push('capture');if(failure==='capture')throw Error('capture');return {};},
      pdfFileName:()=> 'Patient_2026-10-06',URL:{createObjectURL:()=> 'blob:pdf',revokeObjectURL:()=>events.push('revoke')},console:{error(){}},
      window:{addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),
        print(){events.push('print');assert.ok(classes.has('pdf-chart-image-ready'));assert.equal(image.src,'blob:pdf');if(failure==='print')throw Error('print');},
        alert:()=>events.push('alert')}
    });
    vm.runInContext('let pdfExportBusy=false;\n'+pdfHelper,context);
    await context.downloadPdf();
    if(!failure){
      assert.deepEqual(events,['capture','decode','append','print']);
      assert.equal(button.disabled,true);
      await context.downloadPdf();
      assert.equal(events.filter(event=>event==='capture').length,1);
      listeners.get('afterprint')(); // Also fired when the print dialog is cancelled.
    }else{
      assert.ok(events.includes('alert'));
      if(failure!=='print')assert.ok(!events.includes('print'));
    }
    assert.equal(context.document.title,'Chart');
    assert.equal(heading.textContent,'Saved Entries');
    assert.equal(button.disabled,false);
    assert.equal(classes.size,0);
    assert.equal(listeners.size,0);
    if(failure!=='capture')assert.ok(events.includes('revoke'));
  });
}
function setup({fail=false,cancel=false,navigator={},picker=true,pickerFail=false,readFail=false,review=false}={}){
  const stage=Object.freeze({id:'live-chart'}),blob={type:'image/png'},events=[];
  const links=[],timers=[];
  const container={insertAdjacentElement(position,link){assert.equal(position,'afterend');links.push(link);events.push('link');}};
  const reviewContainer={insertAdjacentElement(position,link){assert.equal(position,'afterend');links.push(link);events.push('review-link');}};
  const els={splitStage:stage,downloadChartImageBtn:{disabled:false,parentElement:container},downloadChartImageLabel:{textContent:'Download Chart Image'}};
  const context=vm.createContext({els,document:{fonts:{ready:Promise.resolve().then(()=>events.push('fonts'))},
    querySelector:()=>review?reviewContainer:null,querySelectorAll:()=>links.filter(link=>!link.removed),
    createElement:()=>({click(){events.push('download');},remove(){this.removed=true;}}),
    body:{appendChild:link=>links.push(link)}
  },FileReader:class{
    readAsDataURL(value){assert.equal(value,blob);events.push('read');if(readFail){this.onerror();return;}this.result='data:image/png;base64,cG5n';this.onload();}
  },URL:{createObjectURL:()=> 'blob:chart',revokeObjectURL:()=>events.push('revoke')},setTimeout:(callback,delay)=>timers.push({callback,delay}),
  chartImageFileName:()=> 'chart.png',console:{error(){},warn(){}},window:{
    navigator,open:()=>null,
    devicePixelRatio:2,alert:()=>events.push('alert'),
    chartToBlob:async(node,options)=>{events.push('capture');assert.equal(node,stage);assert.equal(options.pixelRatio,2);assert.equal(options.width,undefined);assert.equal(options.height,undefined);if(fail)throw Error('capture failed');return blob;},
    showSaveFilePicker:picker?async()=>{events.push('picker');if(cancel)throw {name:'AbortError'};if(pickerFail)throw {name:'SecurityError'};return {createWritable:async()=>({write:async value=>{assert.equal(value,blob);events.push('write');},close:async()=>events.push('close')})};}:undefined
  }});
  vm.runInContext(helper,context);
  return {context,els,events,links,timers};
}
test('exports the chart at a fixed resolution after fonts load, then saves the completed PNG',async()=>{
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
for(const [device,navigator] of Object.entries({
  Android:{userAgent:'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile'},
  iPhone:{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'},
  iPad:{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',platform:'MacIntel',maxTouchPoints:5},
  mobileHints:{userAgentData:{mobile:true}}
})){
  test(`${device} downloads a PNG directly without opening the native picker`,async()=>{
    const {context,els,events,links,timers}=setup({navigator});
    await context.downloadChartImage();
    assert.deepEqual(events,['fonts','capture','read','link','download']);
    assert.equal(links[0].download,'chart.png');
    assert.equal(links[0].href,'data:image/png;base64,cG5n');
    assert.equal(links[0].target,'_blank');
    assert.equal(links[0].removed,undefined,'retain a tappable link if the automatic download is blocked');
    assert.equal(timers.length,0,'the mobile image must not expire while a save prompt is open');
    assert.equal(els.downloadChartImageBtn.disabled,false);
    assert.equal(els.downloadChartImageLabel.textContent,'Download Chart Image');
  });
}
test('a touch-enabled Windows laptop keeps the desktop picker',async()=>{
  const {context,events}=setup({navigator:{userAgent:'Windows',platform:'Win32',maxTouchPoints:10}});
  await context.downloadChartImage();
  assert.deepEqual(events,['fonts','capture','picker','write','close']);
});
test('mobile retry link appears in the patient review screen and is replaced on the next export',async()=>{
  const {context,events,links}=setup({navigator:{userAgent:'Android'},review:true});
  await context.downloadChartImage();
  assert.ok(events.includes('review-link'));
  await context.downloadChartImage();
  assert.equal(links[0].removed,true);
  assert.equal(links[1].removed,undefined);
});
test('mobile image conversion failure restores controls and reports an error',async()=>{
  const {context,els,events,links}=setup({navigator:{userAgent:'iPhone'},readFail:true});
  await context.downloadChartImage();
  assert.deepEqual(events,['fonts','capture','read','alert']);
  assert.equal(els.downloadChartImageBtn.disabled,false);
  assert.equal(links.length,0);
});
for(const options of [{picker:false},{pickerFail:true}]){
  test(`desktop fallback still downloads when the picker is ${options.pickerFail?'blocked':'unavailable'}`,async()=>{
    const {context,events,links,timers}=setup(options);
    await context.downloadChartImage();
    assert.ok(events.includes('download'));
    assert.ok(!events.includes('alert'));
    assert.equal(links[0].href,'blob:chart');
    assert.equal(links[0].download,'chart.png');
    assert.equal(links[0].removed,true);
    assert.equal(timers[0].delay,1000);
    timers[0].callback();
    assert.equal(events.at(-1),'revoke');
  });
}
test('static preview registers the export renderer without Vite or module imports',()=>{
  const html=readFileSync(new URL('../preview.html',import.meta.url),'utf8');
  const script=html.match(/<script src="\.\/js\/(chart-image-export\.js)[^"]*"><\/script>/);
  assert.ok(script,'static preview must load the plain JavaScript renderer');
  const context=vm.createContext({window:{}});
  vm.runInContext(readFileSync(new URL('../public/js/'+script[1],import.meta.url),'utf8'),context);
  assert.equal(typeof context.window.chartToBlob,'function');
  assert.ok(html.indexOf(script[0])<html.indexOf('./js/app.js'));
});

test('Safari reserves a preview during the tap and exposes a persistent save action',async()=>{
  const {context,events,els}=setup({navigator:{userAgent:'Version/18.0 Safari/605.1.15'}});
  const items=[];
  const preview={closed:false,document:{body:{textContent:'',appendChild:item=>items.push(item),prepend:item=>items.unshift(item)},
    createElement:()=>({style:{}})},close(){events.push('close-preview');}};
  context.window.open=()=>{events.push('open-preview');return preview;};
  const pending=context.downloadChartImage();
  assert.equal(events[0],'open-preview','open before any asynchronous capture');
  await pending;
  assert.ok(!events.includes('picker'));
  assert.ok(!events.includes('alert'));
  assert.equal(items[1].download,'chart.png');
  assert.equal(items[2].src,'data:image/png;base64,cG5n');
  assert.equal(els.downloadChartImageBtn.disabled,false);
});

test('iPhone image failure never opens a preparation tab and restores controls',async()=>{
  const {context,events}=setup({fail:true,navigator:{userAgent:'iPhone'}});
  context.window.open=()=>{events.push('open-preview');return null;};
  await context.downloadChartImage();
  assert.ok(!events.includes('open-preview'));
  assert.equal(context.els.downloadChartImageBtn.disabled,false);
  assert.ok(events.includes('alert'));
});
