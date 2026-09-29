// Test-only page: synthetic patient and in-memory material service, no network writes.
window.dentalMaterials={load:async()=>dentalMaterials.map(item=>({...item})),save:async rows=>{dentalMaterials=rows.map(item=>({...item}))}};
materialCatalogLoaded=true;
patient.patientId='test-material-workflow';patient.fullName='Material workflow fixture';
visit.date=new Date().toISOString().slice(0,10);
openTooth(24,'front');
const fixtureBanner=document.createElement('div');fixtureBanner.textContent='LOCAL TEST FIXTURE — synthetic chart, no cloud writes';fixtureBanner.style.cssText='position:fixed;bottom:0;left:0;background:#fff3bf;color:#422006;padding:5px;z-index:9999;font-size:11px';document.body.append(fixtureBanner);

// Open /preview.html?export to compare real PNG output with the live anatomy.
if(new URLSearchParams(location.search).has('export')){
  for(const [tooth,treatment,extra] of [
    [16,'bridge',{bridgeId:'export-bridge',bridgeRole:'abutment'}],
    [15,'bridge',{bridgeId:'export-bridge',bridgeRole:'pontic'}],
    [14,'bridge',{bridgeId:'export-bridge',bridgeRole:'abutment'}],
    [26,'partialDenture',{bridgeId:'export-denture'}],
    [27,'partialDenture',{bridgeId:'export-denture'}],
    [38,'implant',{}],[48,'retainedRoot',{}],[18,'implant',{}]
  ])state.permanent[tooth].entries=[{id:'export-'+tooth,tooth,treatment,...extra,category:'prosthetic',view:'front',status:'existing',layer:'existing',surfaces:[],note:''}];
  draft.tooth=null;selection.teeth=[];renderAll();
  // Exercise the production download path without a native file dialog.
  window.showSaveFilePicker=async()=>({createWritable:async()=>({
    write:async blob=>{
      document.getElementById('export-result')?.remove();
      const image=document.createElement('img');image.id='export-result';
      image.alt='Exported chart PNG';image.src=URL.createObjectURL(blob);
      image.style.cssText='display:block;width:600px;max-width:100%;margin:24px auto';
      document.body.append(image);
    },close:async()=>{}
  })});
  window.addEventListener('load',()=>downloadChartImage(),{once:true});
}
