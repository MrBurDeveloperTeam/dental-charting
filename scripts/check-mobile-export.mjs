import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const require = createRequire(process.env.PLAYWRIGHT_MODULE_PATH + '/package.json');
const { chromium, webkit } = require('playwright');
const browser = process.env.EXPORT_BROWSER === 'webkit' ? await webkit.launch({headless:true}) : await chromium.launch({channel:'chrome', headless:true});
const url = process.env.EXPORT_TEST_URL || 'http://127.0.0.1:5174/preview.html';
try {
  let dimensions=process.env.EXPORT_PDF_ONLY||process.env.EXPORT_IMAGE_ONLY?[1452,1774]:null;
  for (const width of process.env.EXPORT_PDF_ONLY||process.env.EXPORT_IMAGE_ONLY?[]:[390, 1680]) {
    const page = await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1});
    page.on('pageerror',error=>console.log('PAGE ERROR',error.message));
    await page.goto(url);
    await page.waitForFunction(()=>window.chartToBlob && document.querySelector('#split-stage .tooth'));
    const result=await page.evaluate(async()=>{
      const node=document.querySelector('#split-stage');
      const before=node.getBoundingClientRect().toJSON();
      try {
        const blob=await window.chartToBlob(node,{pixelRatio:2});
        const image=await createImageBitmap(blob);
        return {viewport:innerWidth,before,png:[image.width,image.height],size:blob.size};
      } catch(error) {return {viewport:innerWidth,before,error:String(error),stack:error.stack};}
    });
    console.log(result);
    assert.ok(!result.error, result.error);
    if(dimensions)assert.deepEqual(result.png,dimensions);
    dimensions=result.png;
    await page.close();
  }
  const page = await browser.newPage({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
  await page.goto(url);
  await page.waitForFunction(()=>window.chartToBlob && document.querySelector('#split-stage .tooth'));
  if(!process.env.EXPORT_PDF_ONLY){
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#download-chart-image-btn').click();
  const download=await downloadPromise;
  const png=await readFile(await download.path());
  const artifact=join(tmpdir(),`dental-export-${process.env.EXPORT_BROWSER || 'chrome'}.png`);
  await writeFile(artifact,png);
  console.log('Downloaded PNG saved for visual verification:',artifact,'bytes:',png.length);
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],dimensions);
  console.log('Mobile PNG download matches desktop dimensions', dimensions);
  }
  if(!process.env.EXPORT_IMAGE_ONLY){
  if(process.env.EXPORT_BASELINE)await page.addScriptTag({content:execFileSync('git',['show','HEAD:public/js/chart-image-export.js'],{encoding:'utf8'})});
  await page.evaluate(()=>{
    window.exportAlerts=[];
    window.alert=message=>window.exportAlerts.push(message);
    window.exportPopups=0;
    window.open=()=>{window.exportPopups++;throw Error('Mobile PDF must stay in the foreground');};
    // Also prove rasterization no longer needs animation frames to complete.
    window.requestAnimationFrame=()=>0;
    window.print=()=>{
      window.printRequested=true;
      window.printImageWidth=document.querySelector('.print-chart-image').naturalWidth;
      window.dispatchEvent(new Event('afterprint'));
    };
  });
  await page.evaluate(()=>downloadPdf());
  const pdf=await page.evaluate(()=>({alerts:window.exportAlerts,printed:window.printRequested,
    loaded:window.printImageWidth,popups:window.exportPopups,
    disabled:document.querySelector('#download-pdf-btn').disabled}));
  console.log('Mobile PDF with background frames suspended',pdf);
  if(process.env.EXPORT_BASELINE){
    assert.ok(pdf.alerts.some(message=>message.includes('timed out')));
    console.log('Confirmed: the previous renderer times out with background frames suspended.');
  }else{
  assert.deepEqual(pdf.alerts,[]);
  assert.equal(pdf.printed,true);
  assert.equal(pdf.loaded,dimensions[0]);
  assert.equal(pdf.disabled,false);
  assert.equal(pdf.popups,0);
  }
  }
} finally {await browser.close();}
