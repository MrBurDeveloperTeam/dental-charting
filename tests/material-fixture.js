// Test-only page: synthetic patient and in-memory material service, no network writes.
window.dentalMaterials={load:async()=>dentalMaterials.map(item=>({...item})),save:async rows=>{dentalMaterials=rows.map(item=>({...item}))}};
materialCatalogLoaded=true;
patient.patientId='test-material-workflow';patient.fullName='Material workflow fixture';
visit.date=new Date().toISOString().slice(0,10);
openTooth(24,'front');
const fixtureBanner=document.createElement('div');fixtureBanner.textContent='LOCAL TEST FIXTURE — synthetic chart, no cloud writes';fixtureBanner.style.cssText='position:fixed;bottom:0;left:0;background:#fff3bf;color:#422006;padding:5px;z-index:9999;font-size:11px';document.body.append(fixtureBanner);
