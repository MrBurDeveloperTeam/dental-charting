/* Shared material catalogue and clinical presentation helpers. No localStorage colours. */
const DEFAULT_DENTAL_MATERIALS = [
  ['amalgam','Amalgam','#7a858f'],['composite','Composite','#c87a4d'],
  ['gic','GIC','#f8530d'],['zirconia','Zirconia','#e7f0f3'],
  ['emax','eMax','#f2c7a5'],['pfm','PFM','#d5dce3'],['gold','Gold','#d4a72c'],
  ['metal','Metal','#56616b'],['temporary','Temporary','#e9d36f'],['ceramic','Ceramic','#e8d7c8']
].map(([code,name,color])=>({id:code,code,name,color}));
let dentalMaterials = DEFAULT_DENTAL_MATERIALS.map(item=>({...item}));
let materialCatalogLoaded = false;
let materialManagerItems = [];
let materialManagerBusy = false;
let materialManagerReturnFocus = null;
let materialBackground = [];
let materialManagerLoadVersion = 0;
function escapeChartText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function materialRecord(id){return dentalMaterials.find(item=>item.id===id||item.code===id);}
function materialName(id){return materialRecord(id)?.name||'Unknown material';}
function materialForTreatment(entry){return ['sealant','filling','inlay','onlay','overlay','crown','bridge','veneer','implant'].includes(entry.treatment)?entry.material||null:null;}
function shouldShowMaterialField(treatment){return treatmentFor(treatment).category!=='condition';}
function renderMaterialFieldVisibility(hasTooth){
  const field=document.querySelector('.material-field');
  if(!field)return;
  field.hidden=Boolean(hasTooth)&&!shouldShowMaterialField(draft.treatment);
}
function entryColor(entry){
  if(typeof entry==='string')return COLORS[entry]||'#64748b';
  const materialId=materialForTreatment(entry)||(["composite","amalgam","gic"].includes(entry?.treatment)?(entry.material||entry.treatment):null);
  return materialRecord(materialId)?.color||COLORS[entry?.treatment]||'#64748b';
}
function materialSelectionError(){
  if(materialForTreatment(draft)&&!materialCatalogLoaded)return 'Load clinic materials before saving this restoration.';
  return treatmentFor(draft.treatment).requiresMaterial&&!draft.material?'Choose a material for this restoration.':'';
}
function showChartValidation(message){const node=document.getElementById('material-note');if(node){node.textContent=message;node.setAttribute('role','alert');}}
function renderMaterialGrid(disabled=false){
  renderMaterialFieldVisibility(Boolean(draft.tooth));
  const grid=document.getElementById('material-grid');if(!grid)return;
  grid.replaceChildren();
  for(const item of [...dentalMaterials,{id:null,name:'None',color:null}]){
    const button=document.createElement('button');button.type='button';
    button.className=`chip material-chip${draft.material===item.id?' active':''}`;
    button.disabled=disabled;button.setAttribute('aria-pressed',String(draft.material===item.id));
    const swatch=document.createElement('span');swatch.className=`material-swatch${item.code==='pfm'?' pfm':''}${item.id===null?' none':''}`;
    if(item.color)swatch.style.backgroundColor=item.color;
    const label=document.createElement('span');label.textContent=item.name;button.append(swatch,label);
    button.addEventListener('click',()=>{draft.material=item.id;renderAll()});grid.append(button);
  }
  const note=document.getElementById('material-note');note.setAttribute('role','status');
  note.textContent=materialSelectionError()||'Optional for conditions and procedures. PFM includes a dark cervical line.';
}
async function loadMaterialCatalog(){
  if(!window.dentalMaterials)throw new Error('Material access is not ready. Refresh and try again.');
  const rows=await window.dentalMaterials.load();
  const old=materialRecord(draft.material);
  dentalMaterials=rows;materialCatalogLoaded=true;
  if(old)draft.material=rows.find(row=>row.id===old.id||row.code===old.code)?.id||null;
  renderAll();
}
function materialManagerMessage(message){document.getElementById('material-manager-message').textContent=message;}
function renderMaterialManager(){
  const list=treatmentManagerEls.list;list.replaceChildren();
  for(const item of materialManagerItems){
    const row=document.createElement('div');row.className='material-manager-row';
    const name=document.createElement('input');name.type='text';name.maxLength=40;name.value=item.name;name.setAttribute('aria-label',`${item.name} material name`);
    name.addEventListener('input',()=>{item.name=name.value});
    const color=document.createElement('input');color.type='color';color.value=item.color;color.setAttribute('aria-label',`${item.name} color`);
    color.addEventListener('input',()=>{item.color=color.value});row.append(name,color);list.append(row);
  }
}
async function openMaterialManager(){
  materialCatalogLoaded=false;
  const request=++materialManagerLoadVersion;
  materialBackground=[...document.body.children].filter(node=>!node.contains(treatmentManagerEls.modal)&&!node.inert);
  materialBackground.forEach(node=>node.inert=true);
  materialManagerReturnFocus=document.activeElement;
  treatmentManagerEls.modal.classList.add('show');treatmentManagerEls.modal.setAttribute('aria-hidden','false');
  treatmentManagerEls.saveBtn.disabled=true;materialManagerMessage('Loading clinic materials…');
  try{await loadMaterialCatalog();if(request!==materialManagerLoadVersion)return;materialManagerItems=dentalMaterials.map(item=>({...item}));renderMaterialManager();materialManagerMessage('');treatmentManagerEls.saveBtn.disabled=false;treatmentManagerEls.list.querySelector('input')?.focus();}
  catch(error){if(request!==materialManagerLoadVersion)return;materialManagerItems=[];renderMaterialManager();materialManagerMessage(`Cannot load materials. ${error.message||'Try reopening this dialog.'}`);}
}
function closeMaterialManager(){
  if(materialManagerBusy)return;
  materialManagerLoadVersion++;materialBackground.forEach(node=>node.inert=false);materialBackground=[];
  treatmentManagerEls.modal.classList.remove('show');treatmentManagerEls.modal.setAttribute('aria-hidden','true');treatmentManagerEls.addForm.reset();materialManagerReturnFocus?.focus();
}
function addMaterial(e){
  e.preventDefault();if(!materialCatalogLoaded||materialManagerBusy)return;
  const values=new FormData(e.currentTarget),name=String(values.get('label')||'').trim();
  if(!name){materialManagerMessage('Enter a material name.');e.currentTarget.elements.label.focus();return;}
  if(materialManagerItems.some(item=>item.name.toLowerCase()===name.toLowerCase())){materialManagerMessage('A material with that name already exists.');return;}
  materialManagerItems.push({id:crypto.randomUUID(),code:null,name,color:String(values.get('color')||'#ffffff')});
  renderMaterialManager();e.currentTarget.reset();materialManagerMessage('Material added to this draft. Save changes to save it for the clinic.');
}
async function saveMaterialManager(){
  if(materialManagerBusy||!materialCatalogLoaded)return;
  const names=materialManagerItems.map(item=>item.name.trim().toLowerCase());
  if(names.some(name=>!name)||new Set(names).size!==names.length){materialManagerMessage('Use a unique, non-empty name for each material.');return;}
  materialManagerBusy=true;treatmentManagerEls.saveBtn.disabled=true;treatmentManagerEls.modal.setAttribute('aria-busy','true');materialManagerMessage('Saving materials…');
  try{await window.dentalMaterials.save(materialManagerItems);await loadMaterialCatalog();materialManagerBusy=false;closeMaterialManager();}
  catch(error){materialManagerMessage(`Materials were not saved. ${error.message||'Please try again.'}`);}
  finally{materialManagerBusy=false;treatmentManagerEls.saveBtn.disabled=false;treatmentManagerEls.modal.removeAttribute('aria-busy');}
}
document.addEventListener('keydown',event=>{
  const modal=document.getElementById('treatment-manager-modal');if(!modal?.classList.contains('show'))return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeMaterialManager();return;}
  if(event.key==='Tab'){
    const controls=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(node=>node.getClientRects().length);
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});

function extractionCrossSVG(n,v){const d=v==='front'?{width:toothW(n),height:toothH(n)}:crownDims(n);return `<svg class="surface-svg extraction-cross" width="${d.width}" height="${d.height}" viewBox="0 0 ${d.width} ${d.height}" aria-hidden="true"><path d="M4 5 L${d.width-4} ${d.height-5} M${d.width-4} 5 L4 ${d.height-5}" fill="none" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/></svg>`;}
function isPontic(entry,n){
  if(entry?.treatment!=='bridge')return false;
  if(entry.bridgeRole)return entry.bridgeRole==='pontic';
  const span=entry.bridgeId?flatEntries().filter(item=>item.bridgeId===entry.bridgeId).map(item=>item.tooth):bridgeSpan(selection.teeth);
  const ordered=bridgeSpan(span);return ordered.length>2&&n!==ordered[0]&&n!==ordered.at(-1);
}
function crownBounds(n,v){
  const dims=v==='front'?{width:toothW(n),height:toothH(n)}:crownDims(n);
  if(v==='front')return {...dims,start:0,end:crownCutY(n)};
  if(!innerAnatomy(n))return {...dims,start:0,end:dims.height};
  const anterior=['incisor','canine'].includes(toothType(n));
  return {...dims,start:isUpper(n)?0:dims.height*.43,end:isUpper(n)?dims.height*(toothType(n)==='premolar'?.43:anterior?.51:.48):dims.height};
}
function anatomySVG(n,v,entry){
  const base=v==='front'?toothSVG(n,'#F5F2EC'):crownOnlySVG(n,'#F5F2EC');
  if(entry?.treatment==='partialDenture'){
    const b=crownBounds(n,v);
    if(v==='front'){
      const oc=crownBounds(n,'occ');
      const crown=crownOnlySVG(n,'#F5F2EC');
      return `<svg class="partial-denture-crown" width="${b.width}" height="${b.height}" viewBox="0 0 ${b.width} ${b.height}"><g transform="${!isUpper(n)?`translate(0 ${b.end}) scale(1 -1)`:``}"><svg width="${b.width}" height="${b.end}" viewBox="0 ${oc.start} ${oc.width} ${oc.end-oc.start}" preserveAspectRatio="xMidYMid meet" overflow="hidden">${crown}</svg></g></svg>`;
    }
    // Clip only the replacement anatomy so the acrylic and clasps can extend outside it.
    return '<div class="partial-denture-crown" style="clip-path:inset('+b.start/b.height*100+'% 0 '+(100-b.end/b.height*100)+'% 0)">'+base+'</div>';
  }
  if(entry?.treatment!=='implant')return base;
  const b=crownBounds(n,v),w=b.width,h=b.height,x=w/2,reverse=b.start>0;
  const cervical=reverse?b.start:b.end,length=reverse?b.start:h-b.end;
  const clip='inset('+b.start/h*100+'% 0 '+(100-b.end/h*100)+'% 0)';
  const threads=Array.from({length:7},(_,i)=>{const y=5+i*(length-10)/7,half=w*(.18-i*.011);return '<path d="M'+(x-half)+' '+y+' l'+half*2+' -2"/>';}).join('');
  return '<div class="implant-crown" style="clip-path:'+clip+'">'+base+'</div><svg class="surface-svg implant-root" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><g transform="translate(0 '+cervical+') scale(1 '+(reverse?-1:1)+')"><path d="M'+(x-w*.2)+' 0 H'+(x+w*.2)+' L'+(x+w*.08)+' '+(length-4)+' Q'+x+' '+length+' '+(x-w*.08)+' '+(length-4)+' Z" fill="#a5adb8" stroke="#e2e8f0" stroke-width="1.2"/><g stroke="#364152" stroke-width="2.5">'+threads+'</g></g></svg>';
}
function applyAnatomyClip(core,n,v,entry){
  if(!entry||!core)return;
  const b=crownBounds(n,v),start=b.start/b.height*100,end=b.end/b.height*100;
  if(isPontic(entry,n))core.style.clipPath='inset('+start+'% 0 '+(100-end)+'% 0)';
  if(entry.treatment==='retainedRoot')core.style.clipPath=b.start>0?'inset(0 0 '+(100-start)+'% 0)':'inset('+end+'% 0 0 0)';
  if(materialRecord(entry.material)?.code==='pfm'&&['crown','bridge','veneer'].includes(entry.treatment)){
    const y=b.start>0?b.start+2:b.end-3;
    core.insertAdjacentHTML('beforeend','<svg class="surface-svg pfm-line" width="'+b.width+'" height="'+b.height+'" viewBox="0 0 '+b.width+' '+b.height+'"><path d="M3 '+y+' Q'+b.width/2+' '+(y+2)+' '+(b.width-3)+' '+y+'" fill="none" stroke="#151515" stroke-width="2.6"/></svg>');
  }
}
function perioPocketOverlaySVG(n,view='front'){
  if(view!=='front')return '';
  const b=crownBounds(n,view),w=b.width,y=b.end;
  return `<svg class="surface-svg perio-pocket-overlay" width="${w}" height="${b.height}" viewBox="0 0 ${w} ${b.height}" role="img" aria-label="Perio Pocket"><title>Perio Pocket</title><g transform="translate(0 ${y}) scale(${w/40})"><path d="M4 -5 Q12 1 21 -3 Q28 -8 34 -5 L33 5 Q28 14 20 9 Q10 9 5 4Z" fill="#fa7d86" fill-opacity=".78" stroke="#e86572" stroke-width="1"/><path d="M27 -4 Q26 5 29 7 Q33 4 34 -6" fill="#e84f62" fill-opacity=".85"/><path d="M29 5 L38 -29 L46 -28" fill="none" stroke="#696d73" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M29 5 L38 -29 L46 -28" fill="none" stroke="#b8bbc0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 -3 L33 -2 M33 -10 L35 -9 M35 -17 L37 -16" stroke="#50545a" stroke-width="2"/></g></svg>`;
}
function appendConditionBadges(holder,n,layer,view='front'){
  const entries=activeState()[n]?.entries||[];
  const labels=entries.filter(entry=>treatmentFor(entry.treatment).mode==='label'&&entry.treatment!=='spacing'&&(layer==='combined'||entryLayer(entry)===layer));
  if(!labels.length)return;
  const impacted=labels.find(entry=>entry.treatment==='impacted');
  if(impacted){
    const mark=document.createElement('span');
    mark.className=`impacted-tooth-label${impacted.status==='planned'?' planned':''}`;
    mark.textContent='IMP';
    mark.title=`Impacted · ${statusLabel(impacted.status)}`;
    holder.querySelector('.tooth-art')?.append(mark);
  }
  if(view==='front'&&labels.some(entry=>entry.treatment==='perioPocket'))holder.querySelector('.art-core')?.insertAdjacentHTML('beforeend',perioPocketOverlaySVG(n,view));
  const externalLabels=view==='front'?labels.filter(entry=>!['impacted','perioPocket'].includes(entry.treatment)):[];
  if(!externalLabels.length)return;
  const wrap=document.createElement('div');wrap.className='condition-badges';
  for(const entry of externalLabels){const badge=document.createElement('span');badge.className=`condition-badge badge-${entry.treatment}${entry.status==='planned'?' planned':''}`;badge.textContent=treatmentFor(entry.treatment).badge||treatmentFor(entry.treatment).label;badge.title=`${treatmentFor(entry.treatment).label} · ${statusLabel(entry.status)}`;wrap.append(badge);}
  holder.append(wrap);
}
function conditionBadgeHTML(entry,className=''){
  const treatment=treatmentFor(entry.treatment);
  const impactedClass=entry.treatment==='impacted'?' impacted-tooth-label':'';
  return `<span class="condition-badge${className?' '+className:''} badge-${entry.treatment}${impactedClass}${entry.status==='planned'?' planned':''}">${escapeChartText(treatment.badge||treatment.label)}</span>`;
}
