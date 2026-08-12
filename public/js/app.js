const DENTITIONS={
  permanent:{
    label:"Permanent",
    upper:[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28],
    lower:[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38],
    upperDisplay:[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28],
    lowerDisplay:[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38]
  },
  primary:{
    label:"Primary",
    upper:[55,54,53,52,51,61,62,63,64,65],
    lower:[85,84,83,82,81,71,72,73,74,75],
    upperDisplay:[null,17,16,55,54,53,52,51,61,62,63,64,65,26,27,null],
    lowerDisplay:[null,47,46,85,84,83,82,81,71,72,73,74,75,36,37,null]
  }
};
const PRIMARY_SWAP_MAP={55:15,54:14,53:13,52:12,51:11,61:21,62:22,63:23,64:24,65:25,85:45,84:44,83:43,82:42,81:41,71:31,72:32,73:33,74:34,75:35};
const PRIMARY_REVERSE_MAP=Object.fromEntries(Object.entries(PRIMARY_SWAP_MAP).map(([primary,permanent])=>[permanent,Number(primary)]));
const PRIMARY_OPTIONAL_MOLARS=[17,16,26,27,47,46,36,37];
const PRIMARY_OPTIONAL_MOLAR_SET=new Set(PRIMARY_OPTIONAL_MOLARS);
const PRIMARY_PHOTO_TEETH=new Set([17,16,55,54,53,52,51,61,62,63,64,65,26,27,47,46,85,84,83,82,81,71,72,73,74,75,36,37]);
const primaryLayout={upperDisplay:[...DENTITIONS.primary.upperDisplay],lowerDisplay:[...DENTITIONS.primary.lowerDisplay]};
const primaryOptionalActive=new Set();
const TOOTH_NAMES={
  permanent:{11:"Upper right central incisor",12:"Upper right lateral incisor",13:"Upper right canine",14:"Upper right first premolar",15:"Upper right second premolar",16:"Upper right first molar",17:"Upper right second molar",18:"Upper right wisdom tooth",21:"Upper left central incisor",22:"Upper left lateral incisor",23:"Upper left canine",24:"Upper left first premolar",25:"Upper left second premolar",26:"Upper left first molar",27:"Upper left second molar",28:"Upper left wisdom tooth",31:"Lower left central incisor",32:"Lower left lateral incisor",33:"Lower left canine",34:"Lower left first premolar",35:"Lower left second premolar",36:"Lower left first molar",37:"Lower left second molar",38:"Lower left wisdom tooth",41:"Lower right central incisor",42:"Lower right lateral incisor",43:"Lower right canine",44:"Lower right first premolar",45:"Lower right second premolar",46:"Lower right first molar",47:"Lower right second molar",48:"Lower right wisdom tooth"},
  primary:{51:"Upper right central primary incisor",52:"Upper right lateral primary incisor",53:"Upper right primary canine",54:"Upper right first primary molar",55:"Upper right second primary molar",61:"Upper left central primary incisor",62:"Upper left lateral primary incisor",63:"Upper left primary canine",64:"Upper left first primary molar",65:"Upper left second primary molar",71:"Lower left central primary incisor",72:"Lower left lateral primary incisor",73:"Lower left primary canine",74:"Lower left first primary molar",75:"Lower left second primary molar",81:"Lower right central primary incisor",82:"Lower right lateral primary incisor",83:"Lower right primary canine",84:"Lower right first primary molar",85:"Lower right second primary molar"}
};
const COLORS={composite:"#15803d",amalgam:"#1d4ed8",gic:"#ef4444",sealant:"#55a8e8",caries:"#4b5563",rootCaries:"#ae7042",fracture:"#b76c59",missing:"#a8b4c1",extraction:"#d85852",implant:"#f97316",rootCanal:"#d85852",crown:"#8f9daf",veneer:"#7fc8c9"};
const TREATMENTS={composite:{label:"Composite",category:"restoration",mode:"surface",views:["occ","front"]},amalgam:{label:"Amalgam",category:"restoration",mode:"surface",views:["occ","front"]},gic:{label:"GIC",category:"restoration",mode:"surface",views:["occ","front"]},sealant:{label:"Sealant",category:"restoration",mode:"surface",views:["occ"]},caries:{label:"Caries",category:"condition",mode:"surface",views:["occ","front"]},rootCaries:{label:"Root caries",category:"condition",mode:"surface",views:["front"]},fracture:{label:"Fracture",category:"condition",mode:"surface",views:["occ","front"]},missing:{label:"Missing",category:"condition",mode:"whole",views:["occ","front"]},rootCanal:{label:"Root canal",category:"procedure",mode:"root",views:["front"]},extraction:{label:"Extraction",category:"procedure",mode:"whole",views:["occ","front"]},implant:{label:"Implant",category:"procedure",mode:"whole",views:["occ","front"]},crown:{label:"Crown",category:"prosthetic",mode:"whole",views:["occ","front"]},veneer:{label:"Veneer",category:"prosthetic",mode:"whole",views:["occ","front"]}};
const CATEGORIES=[{id:"restoration",label:"Restoration"},{id:"condition",label:"Condition"},{id:"procedure",label:"Procedure"},{id:"prosthetic",label:"Prosthetic"}];
const STATUSES=[{id:"existing",label:"Existing"},{id:"planned",label:"Planned"},{id:"watch",label:"Review"}];
const STORAGE_PATIENT_KEY="dental-charting-2-patient";
const STORAGE_VISIT_KEY="dental-charting-2-visit";
const STORAGE_MODE_KEY="dental-charting-2-mode";
const STORAGE_TREATMENTS_KEY="dental-charting-2-treatment-methods";
const BUILTIN_TREATMENT_IDS=new Set(Object.keys(TREATMENTS));
const TREATMENT_ICON_OPTIONS=[{id:"filling",label:"Filling square"},{id:"circle",label:"Circle"},{id:"seal",label:"Sealant curve"},{id:"cross",label:"Cross"},{id:"bolt",label:"Fracture bolt"},{id:"canal",label:"Root canal"},{id:"crown",label:"Crown"},{id:"veneer",label:"Veneer"},{id:"implant",label:"Implant"}];
loadTreatmentMethods();
const state={permanent:{},primary:{}};
[...DENTITIONS.permanent.upper,...DENTITIONS.permanent.lower].forEach(n=>state.permanent[n]={entries:[]});
Array.from(new Set([...DENTITIONS.primary.upper,...DENTITIONS.primary.lower,...Object.values(PRIMARY_SWAP_MAP),...PRIMARY_OPTIONAL_MOLARS])).forEach(n=>state.primary[n]={entries:[]});
const draft={tooth:null,category:"restoration",treatment:"composite",view:"occ",status:"existing",layer:"existing",surfaces:[],note:""};
const selection={multi:false,teeth:[]};
const patient=loadPatient();
const visit=loadVisit();
let chartMode=loadChartMode();
let splitChartView="existing";
const els={upperFront:document.getElementById("upper-front"),upperNumbers:document.getElementById("upper-numbers"),upperOcc:document.getElementById("upper-occ"),lowerOcc:document.getElementById("lower-occ"),lowerNumbers:document.getElementById("lower-numbers"),lowerFront:document.getElementById("lower-front"),combinedStage:document.getElementById("combined-stage"),splitStage:document.getElementById("split-stage"),chartViewToggle:document.getElementById("chart-view-toggle"),splitPlannedUpperFront:document.getElementById("split-planned-upper-front"),splitPlannedUpperOcc:document.getElementById("split-planned-upper-occ"),splitPlannedUpperNumbers:document.getElementById("split-planned-upper-numbers"),splitExistingUpperFront:document.getElementById("split-existing-upper-front"),splitExistingUpperOcc:document.getElementById("split-existing-upper-occ"),splitExistingUpperNumbers:document.getElementById("split-existing-upper-numbers"),splitExistingLowerNumbers:document.getElementById("split-existing-lower-numbers"),splitExistingLowerOcc:document.getElementById("split-existing-lower-occ"),splitExistingLowerFront:document.getElementById("split-existing-lower-front"),splitPlannedLowerNumbers:document.getElementById("split-planned-lower-numbers"),splitPlannedLowerOcc:document.getElementById("split-planned-lower-occ"),splitPlannedLowerFront:document.getElementById("split-planned-lower-front"),entriesList:document.getElementById("entries-list"),entriesCount:document.getElementById("entries-count"),printPatientGrid:document.getElementById("print-patient-grid"),printNoteBody:document.getElementById("print-note-body"),patientTrigger:document.getElementById("patient-trigger"),patientNameDisplay:document.getElementById("patient-name-display"),patientSubDisplay:document.getElementById("patient-sub-display"),dentitionSwitch:document.getElementById("dentition-switch"),dentitionHint:document.getElementById("dentition-hint"),patientModal:document.getElementById("patient-modal"),patientForm:document.getElementById("patient-form"),patientCloseBtn:document.getElementById("patient-close-btn"),patientCancelBtn:document.getElementById("patient-cancel-btn"),patientClearBtn:document.getElementById("patient-clear-btn"),patientDobText:document.getElementById("patient-dob-text"),patientDobTrigger:document.getElementById("patient-dob-trigger"),dateTrigger:document.getElementById("date-trigger"),visitDateDisplay:document.getElementById("visit-date-display"),visitDateSubDisplay:document.getElementById("visit-date-sub-display"),dateModal:document.getElementById("date-modal"),dateForm:document.getElementById("date-form"),dateCloseBtn:document.getElementById("date-close-btn"),dateCancelBtn:document.getElementById("date-cancel-btn"),dateTodayBtn:document.getElementById("date-today-btn"),visitDateText:document.getElementById("visit-date-text"),visitDateTrigger:document.getElementById("visit-date-trigger"),datePopover:document.getElementById("date-popover"),datePrevBtn:document.getElementById("date-prev-btn"),dateNextBtn:document.getElementById("date-next-btn"),dateTitleBtn:document.getElementById("date-title-btn"),dateView:document.getElementById("date-view"),dateClearBtn:document.getElementById("date-clear-btn"),datePopoverTodayBtn:document.getElementById("date-popover-today-btn"),datePopoverCloseBtn:document.getElementById("date-popover-close-btn"),sidebarEmpty:document.getElementById("sidebar-empty"),editor:document.getElementById("editor"),selectedCode:document.getElementById("selected-code"),selectedName:document.getElementById("selected-name"),miniPreview:document.getElementById("mini-preview"),multiToggleBtn:document.getElementById("multi-toggle-btn"),selectedTeeth:document.getElementById("selected-teeth"),categoryGrid:document.getElementById("category-grid"),viewGrid:document.getElementById("view-grid"),viewNote:document.getElementById("view-note"),surfaceField:document.getElementById("surface-field"),surfaceGrid:document.getElementById("surface-grid"),surfaceNote:document.getElementById("surface-note"),treatmentGrid:document.getElementById("treatment-grid"),statusGrid:document.getElementById("status-grid"),noteInput:document.getElementById("note-input"),previewBox:document.getElementById("preview-box"),saveBtn:document.getElementById("save-btn"),resetBtn:document.getElementById("reset-btn"),clearCurrentBtn:document.getElementById("clear-current-btn"),downloadPdfBtn:document.getElementById("download-pdf-btn")};
const mobileToothEls={modal:document.getElementById("mobile-tooth-modal"),title:document.getElementById("mobile-tooth-modal-title"),name:document.getElementById("mobile-tooth-modal-name"),root:document.getElementById("mobile-tooth-root"),crown:document.getElementById("mobile-tooth-crown"),selection:document.getElementById("mobile-tooth-selection"),optionalMolar:document.getElementById("mobile-optional-molar-btn"),prev:document.getElementById("mobile-tooth-prev-btn"),prevNumber:document.getElementById("mobile-tooth-prev-number"),next:document.getElementById("mobile-tooth-next-btn"),nextNumber:document.getElementById("mobile-tooth-next-number"),close:document.getElementById("mobile-tooth-close-btn"),bottomClose:document.getElementById("mobile-tooth-bottom-close-btn"),done:document.getElementById("mobile-tooth-done-btn")};
const mobileEntryEls={modal:document.getElementById("mobile-entry-modal"),content:document.getElementById("mobile-entry-content"),title:document.getElementById("mobile-entry-title"),progress:document.getElementById("mobile-entry-progress"),trigger:document.getElementById("mobile-entry-trigger"),hint:document.getElementById("mobile-entry-hint"),close:document.getElementById("mobile-entry-close-btn"),back:document.getElementById("mobile-entry-back-btn"),next:document.getElementById("mobile-entry-next-btn"),done:document.getElementById("mobile-entry-done-btn")};
const editorHome=els.editor.parentElement;
const treatmentManagerEls={openBtn:document.getElementById("manage-treatments-btn"),modal:document.getElementById("treatment-manager-modal"),closeBtn:document.getElementById("treatment-manager-close-btn"),cancelBtn:document.getElementById("treatment-manager-cancel-btn"),saveBtn:document.getElementById("treatment-manager-save-btn"),list:document.getElementById("treatment-method-list"),addForm:document.getElementById("add-treatment-form"),newIcon:document.getElementById("new-treatment-icon")};
let treatmentManagerDraft=[];
let mobileToothModalOpen=false;
let mobileEntryOpen=false;
let mobileEntryStep=1;
let editingEntry=null;
els.noteInput.addEventListener("input",e=>{draft.note=e.target.value;renderSidebar()}); els.saveBtn.addEventListener("click",saveDraft); els.resetBtn.addEventListener("click",resetDraft); els.clearCurrentBtn.addEventListener("click",refreshChart); els.downloadPdfBtn.addEventListener("click",downloadPdf); els.multiToggleBtn.addEventListener("click",toggleMultiMode); if(els.patientModal&&els.patientForm){els.patientTrigger.addEventListener("click",openPatientModal); els.patientCloseBtn.addEventListener("click",closePatientModal); els.patientCancelBtn.addEventListener("click",closePatientModal); els.patientClearBtn.addEventListener("click",clearPatientForm); els.patientModal.addEventListener("click",e=>{if(e.target===els.patientModal) closePatientModal()}); els.patientForm.addEventListener("submit",savePatientFromForm)} els.dateTrigger.addEventListener("click",openDateModal); els.dateCloseBtn.addEventListener("click",closeDateModal); els.dateCancelBtn.addEventListener("click",closeDateModal); els.dateTodayBtn.addEventListener("click",setVisitToday); els.dateModal.addEventListener("click",e=>{if(e.target===els.dateModal) closeDateModal()}); els.dateForm.addEventListener("submit",saveVisitFromForm);
treatmentManagerEls.openBtn.addEventListener("click",openTreatmentManager); treatmentManagerEls.closeBtn.addEventListener("click",closeTreatmentManager); treatmentManagerEls.cancelBtn.addEventListener("click",closeTreatmentManager); treatmentManagerEls.saveBtn.addEventListener("click",saveTreatmentManager); treatmentManagerEls.addForm.addEventListener("submit",addTreatmentMethod); treatmentManagerEls.list.addEventListener("input",updateTreatmentManagerDraft); treatmentManagerEls.list.addEventListener("change",updateTreatmentManagerDraft); treatmentManagerEls.list.addEventListener("click",removeTreatmentMethod); treatmentManagerEls.modal.addEventListener("click",e=>{if(e.target===treatmentManagerEls.modal) closeTreatmentManager()});
mobileToothEls.prev.addEventListener("click",()=>navigateMobileTooth(-1)); mobileToothEls.next.addEventListener("click",()=>navigateMobileTooth(1)); mobileToothEls.optionalMolar.addEventListener("click",toggleMobileOptionalMolar); mobileToothEls.close.addEventListener("click",closeMobileToothModal); mobileToothEls.bottomClose.addEventListener("click",closeMobileToothModal); mobileToothEls.done.addEventListener("click",finishMobileToothSelection); mobileToothEls.modal.addEventListener("click",e=>{if(e.target===mobileToothEls.modal) closeMobileToothModal()});
mobileEntryEls.trigger.addEventListener("click",openMobileEntryWizard); mobileEntryEls.close.addEventListener("click",closeMobileEntryWizard); mobileEntryEls.back.addEventListener("click",()=>setMobileEntryStep(mobileEntryStep-1)); mobileEntryEls.next.addEventListener("click",()=>setMobileEntryStep(mobileEntryStep+1)); mobileEntryEls.done.addEventListener("click",completeMobileEntryWizard); mobileEntryEls.modal.addEventListener("click",e=>{if(e.target===mobileEntryEls.modal)closeMobileEntryWizard()});
mobileEntryEls.progress.addEventListener("click",e=>{const stage=e.target.closest("[data-entry-stage]");if(stage)setMobileEntryStep(Number(stage.dataset.entryStage))});
els.dentitionSwitch.addEventListener("click",e=>{const btn=e.target.closest("[data-mode]"); if(!btn) return; setChartMode(btn.dataset.mode)});
els.chartViewToggle.addEventListener("click",e=>{const btn=e.target.closest("[data-chart-view]");if(!btn)return;setSplitChartView(btn.dataset.chartView)});
els.splitStage.addEventListener("click",e=>{if(isMobileToothModalViewport()&&e.target.closest("[data-surface]")) mobileToothModalOpen=true},true);
els.patientDobText?.addEventListener("blur",()=>commitDateField("dob",{emptyOk:true}));
els.visitDateText.addEventListener("blur",()=>commitDateField("visit",{emptyOk:false,fallbackToday:false}));
els.patientDobText?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commitDateField("dob",{emptyOk:true});}});
els.visitDateText.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commitDateField("visit",{emptyOk:false,fallbackToday:false});}});
els.patientDobTrigger?.addEventListener("click",()=>openDatePopover("dob",els.patientDobTrigger));
els.visitDateTrigger.addEventListener("click",()=>openDatePopover("visit",els.visitDateTrigger));
els.datePrevBtn.addEventListener("click",()=>{datePicker.cursor=datePicker.view==="day"?shiftMonth(datePicker.cursor,-1):(datePicker.view==="month"?shiftYear(datePicker.cursor,-1):shiftYear(datePicker.cursor,-12)); renderDatePopover(); positionDatePopover()});
els.dateNextBtn.addEventListener("click",()=>{datePicker.cursor=datePicker.view==="day"?shiftMonth(datePicker.cursor,1):(datePicker.view==="month"?shiftYear(datePicker.cursor,1):shiftYear(datePicker.cursor,12)); renderDatePopover(); positionDatePopover()});
els.dateTitleBtn.addEventListener("click",()=>{datePicker.view=datePicker.view==="day"?"month":(datePicker.view==="month"?"year":"year"); renderDatePopover(); positionDatePopover()});
els.dateView.addEventListener("click",e=>{const btn=e.target.closest("[data-date-action]"); if(!btn) return; const action=btn.dataset.dateAction; if(action==="select-day"){selectDateValue(btn.dataset.iso); return} if(action==="select-month"){datePicker.cursor=`${monthStartFromKey(datePicker.cursor).getFullYear()}-${`${Number(btn.dataset.month)+1}`.padStart(2,"0")}`; datePicker.view="day"; renderDatePopover(); positionDatePopover(); return} if(action==="select-year"){const base=monthStartFromKey(datePicker.cursor); datePicker.cursor=`${btn.dataset.year}-${`${base.getMonth()+1}`.padStart(2,"0")}`; datePicker.view="month"; renderDatePopover(); positionDatePopover();}});
els.dateClearBtn.addEventListener("click",()=>{const target=dateTargets[datePicker.target]; if(!target||!target.allowClear) return; target.valueInput.value=""; syncDateField(datePicker.target); closeDatePopover()});
els.datePopoverTodayBtn.addEventListener("click",()=>selectDateValue(isoToday()));
els.datePopoverCloseBtn.addEventListener("click",closeDatePopover);
document.addEventListener("click",e=>{if(!datePicker.open) return; if(els.datePopover.contains(e.target)) return; if(e.target.closest&&e.target.closest(".date-picker-btn")) return; closeDatePopover()});
window.addEventListener("resize",positionDatePopover);
window.addEventListener("scroll",positionDatePopover,true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(datePicker.open){closeDatePopover(); return} if(mobileEntryOpen){closeMobileEntryWizard(); return} if(mobileToothModalOpen){closeMobileToothModal(); return} if(treatmentManagerEls.modal.classList.contains("show")){closeTreatmentManager(); return} if(els.patientModal?.classList.contains("show")) closePatientModal(); if(els.dateModal.classList.contains("show")) closeDateModal()}});
function uid(){return `${Date.now()}-${Math.random().toString(36).slice(2,9)}`}
function isPrimaryTooth(n){return Math.floor(n/10)>=5}
function isUpper(n){return [1,2,5,6].includes(Math.floor(n/10))}
function toothType(n){
  const d=n%10;
  if(isPrimaryTooth(n)){
    if(d>=4) return "molar";
    if(d===3) return "canine";
    return "incisor";
  }
  if(d===8)return"wisdom";
  if(d>=6)return"molar";
  if(d>=4)return"premolar";
  if(d===3)return"canine";
  return"incisor";
}
function treatmentFor(id){return TREATMENTS[id]}
function toothW(n){
  const t=toothType(n),u=isUpper(n),c=n%10===1,p=isPrimaryTooth(n);
  if(p){
    if(t==="molar") return u?46:44;
    if(t==="canine") return 28;
    return u?(c?34:30):(c?24:26);
  }
  // Photo-specific calibration for the narrow upper-right canine/lateral PNGs.
  // Increase these values to make the root views wider; the overlay generator
  // uses the matching values in tools/generate_tooth_silhouettes.py.
  if(n===13)return 38;
  if(n===12)return 46;
  if(t==="wisdom")return u?52:48;
  if(t==="molar")return u?56:52;
  if(t==="premolar")return u?40:36;
  if(t==="canine")return 32;
  return u?(c?40:36):(c?28:30);
}
function toothH(n){
  const t=toothType(n),p=isPrimaryTooth(n);
  if(p){
    if(t==="molar") return isUpper(n)?84:88;
    if(t==="canine") return isUpper(n)?88:90;
    return isUpper(n)?80:82;
  }
  if(t==="molar"||t==="wisdom")return isUpper(n)?102:106;
  if(t==="premolar")return isUpper(n)?98:96;
  if(t==="canine")return isUpper(n)?108:110;
  return isUpper(n)?100:102;
}
function crownDims(n){
  const t=toothType(n),u=isUpper(n),c=n%10===1,d=n%10,p=isPrimaryTooth(n);
  if(p){
    if(n===65)return{width:38,height:32};
    if(t==="molar") return d===4?{width:38,height:30}:{width:42,height:32};
    if(t==="canine") return u?{width:22,height:26}:{width:24,height:24};
    return u?(c?{width:28,height:22}:{width:26,height:20}):(c?{width:24,height:18}:{width:24,height:18});
  }
  if(t==="wisdom")return{width:44,height:34};
  if(t==="molar")return d===6?{width:50,height:40}:{width:48,height:38};
  if(t==="premolar")return d===4?{width:30,height:30}:{width:32,height:32};
  if(t==="canine")return u?{width:28,height:34}:{width:30,height:30};
  return u?(c?{width:36,height:26}:{width:32,height:24}):(c?{width:32,height:20}:{width:30,height:20});
}
function toothCellW(n){return Math.ceil(Math.max(toothW(n)*0.58,crownDims(n).width*0.64)+4)}
function crownCutY(n){const t=toothType(n);if(t==="molar"||t==="wisdom")return 50;if(t==="premolar")return 54;if(t==="canine")return 52;return 56}
function frontSurfaceEndY(n){const t=toothType(n),u=isUpper(n); if(t==="molar"||t==="wisdom") return u?68:68; if(t==="premolar") return u?60:61; if(t==="canine") return u?54:58; return u?68:58}
function lighten(h,a=40){if(!h.startsWith("#"))return h;const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return`rgb(${Math.min(255,r+a)}, ${Math.min(255,g+a)}, ${Math.min(255,b+a)})`}
function darken(h,a=25){if(!h.startsWith("#"))return h;const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return`rgb(${Math.max(0,r-a)}, ${Math.max(0,g-a)}, ${Math.max(0,b-a)})`}
function loadPatient(){try{const raw=localStorage.getItem(STORAGE_PATIENT_KEY); if(!raw) return {fullName:"",dob:"",patientId:"",gender:"",phone:"",email:"",notes:""}; const parsed=JSON.parse(raw); return {fullName:parsed.fullName||"",dob:parsed.dob||"",patientId:parsed.patientId||"",gender:parsed.gender||"",phone:parsed.phone||"",email:parsed.email||"",notes:parsed.notes||""}}catch{return {fullName:"",dob:"",patientId:"",gender:"",phone:"",email:"",notes:""}}}
function persistPatient(){localStorage.setItem(STORAGE_PATIENT_KEY,JSON.stringify(patient))}
function loadVisit(){try{const raw=localStorage.getItem(STORAGE_VISIT_KEY); if(!raw) return {date:new Date().toISOString().slice(0,10)}; const parsed=JSON.parse(raw); return {date:parsed.date||new Date().toISOString().slice(0,10)}}catch{return {date:new Date().toISOString().slice(0,10)}}}
function persistVisit(){localStorage.setItem(STORAGE_VISIT_KEY,JSON.stringify(visit))}
function loadChartMode(){try{const raw=localStorage.getItem(STORAGE_MODE_KEY); return raw==="primary"?"primary":"permanent"}catch{return"permanent"}}
function persistChartMode(){localStorage.setItem(STORAGE_MODE_KEY,chartMode)}
function defaultTreatmentIcon(id){if(id==="rootCanal")return"canal";if(id==="crown")return"crown";if(id==="veneer")return"veneer";if(id==="implant")return"implant";if(id==="extraction"||id==="missing")return"cross";if(id==="sealant")return"seal";if(id==="caries"||id==="rootCaries")return"circle";if(id==="fracture")return"bolt";return"filling"}
function treatmentViewsForMode(mode){return mode==="root"?["front"]:["occ","front"]}
function treatmentMethodsSnapshot(){return Object.entries(TREATMENTS).map(([id,t])=>({id,label:t.label,category:t.category,mode:t.mode,views:[...t.views],icon:t.icon||defaultTreatmentIcon(id),color:COLORS[id]||"#3b82f6",visible:t.visible!==false,builtin:BUILTIN_TREATMENT_IDS.has(id)}))}
function loadTreatmentMethods(){try{const payload=JSON.parse(localStorage.getItem(STORAGE_TREATMENTS_KEY)||"[]"),saved=Array.isArray(payload)?payload:payload.methods;if(!Array.isArray(saved))return;saved.forEach(method=>{if(!method||typeof method.id!=="string"||typeof method.label!=="string")return;const category=CATEGORIES.some(item=>item.id===method.category)?method.category:"restoration",mode=["surface","whole","root"].includes(method.mode)?method.mode:"surface",icon=TREATMENT_ICON_OPTIONS.some(item=>item.id===method.icon)?method.icon:"filling",color=/^#[0-9a-f]{6}$/i.test(method.color||"")?method.color:"#3b82f6",visible=method.visible!==false;if(TREATMENTS[method.id])Object.assign(TREATMENTS[method.id],{label:method.label.slice(0,40),icon,visible});else if(method.id.startsWith("custom-"))TREATMENTS[method.id]={label:method.label.slice(0,40),category,mode,views:treatmentViewsForMode(mode),icon,visible};COLORS[method.id]=color})}catch{}}
function persistTreatmentMethods(){localStorage.setItem(STORAGE_TREATMENTS_KEY,JSON.stringify(treatmentMethodsSnapshot()))}
function iconOptionsHTML(selected){return TREATMENT_ICON_OPTIONS.map(icon=>`<option value="${icon.id}"${icon.id===selected?" selected":""}>${icon.label}</option>`).join("")}
function renderTreatmentManager(){treatmentManagerEls.list.innerHTML="";treatmentManagerDraft.forEach(method=>{const row=document.createElement("div");row.className="treatment-method-row";row.dataset.id=method.id;const visible=document.createElement("input");visible.type="checkbox";visible.className="method-visible";visible.checked=method.visible!==false;visible.dataset.field="visible";visible.setAttribute("aria-label",`Display ${method.label} in treatment selection`);const preview=document.createElement("div");preview.className="manager-icon-preview";preview.innerHTML=treatmentIconMarkup(method.icon,method.color);const name=document.createElement("input");name.type="text";name.maxLength=40;name.value=method.label;name.dataset.field="label";name.setAttribute("aria-label",`${method.label} treatment name`);const icon=document.createElement("select");icon.className="method-icon-select";icon.dataset.field="icon";icon.setAttribute("aria-label",`${method.label} icon`);icon.innerHTML=iconOptionsHTML(method.icon);const color=document.createElement("input");color.type="color";color.className="method-color-input";color.value=method.color;color.dataset.field="color";color.setAttribute("aria-label",`${method.label} color`);const remove=document.createElement("button");remove.type="button";remove.className="method-remove-btn";remove.dataset.removeTreatment=method.id;const inUse=typeof flatEntries==="function"&&flatEntries().some(entry=>entry.treatment===method.id);remove.disabled=method.builtin||inUse;remove.textContent=method.builtin?"Built-in":(inUse?"In use":"Delete");row.append(visible,preview,name,icon,color,remove);treatmentManagerEls.list.appendChild(row)})}
function openTreatmentManager(){treatmentManagerDraft=treatmentMethodsSnapshot();treatmentManagerEls.newIcon.innerHTML=iconOptionsHTML("filling");renderTreatmentManager();treatmentManagerEls.modal.classList.add("show");treatmentManagerEls.modal.setAttribute("aria-hidden","false");setTimeout(()=>treatmentManagerEls.list.querySelector("input")?.focus(),0)}
function closeTreatmentManager(){treatmentManagerEls.modal.classList.remove("show");treatmentManagerEls.modal.setAttribute("aria-hidden","true");treatmentManagerEls.addForm.reset()}
function updateTreatmentManagerDraft(e){const field=e.target.dataset.field,row=e.target.closest("[data-id]");if(!field||!row)return;const method=treatmentManagerDraft.find(item=>item.id===row.dataset.id);if(!method)return;method[field]=field==="visible"?e.target.checked:(field==="label"?e.target.value.slice(0,40):e.target.value);if(field==="icon"||field==="color")row.querySelector(".manager-icon-preview").innerHTML=treatmentIconMarkup(method.icon,method.color)}
function removeTreatmentMethod(e){const btn=e.target.closest("[data-remove-treatment]");if(!btn||btn.disabled)return;treatmentManagerDraft=treatmentManagerDraft.filter(item=>item.id!==btn.dataset.removeTreatment);renderTreatmentManager()}
function addTreatmentMethod(e){e.preventDefault();const form=new FormData(e.currentTarget),label=String(form.get("label")||"").trim();if(!label)return;const method={id:`custom-${uid()}`,label,category:"restoration",mode:"surface",views:["occ","front"],icon:String(form.get("icon")||"filling"),color:String(form.get("color")||"#3b82f6"),visible:true,builtin:false};treatmentManagerDraft.push(method);e.currentTarget.reset();treatmentManagerEls.newIcon.innerHTML=iconOptionsHTML("filling");renderTreatmentManager()}
function saveTreatmentManager(){const valid=treatmentManagerDraft.filter(method=>method.label.trim());Object.keys(TREATMENTS).forEach(id=>{if(!BUILTIN_TREATMENT_IDS.has(id)&&!valid.some(method=>method.id===id)){delete TREATMENTS[id];delete COLORS[id]}});valid.forEach(method=>{TREATMENTS[method.id]={label:method.label.trim(),category:method.category||"restoration",mode:method.mode||"surface",views:method.views?.length?[...method.views]:["occ","front"],icon:method.icon,visible:method.visible!==false};COLORS[method.id]=method.color});const visibleMethods=Object.entries(TREATMENTS).filter(([,method])=>method.visible!==false);if(!TREATMENTS[draft.treatment]||TREATMENTS[draft.treatment].visible===false){const fallback=visibleMethods[0]||Object.entries(TREATMENTS)[0];draft.treatment=fallback[0];draft.category=fallback[1].category;normalizeDraft()}persistTreatmentMethods();closeTreatmentManager();renderAll()}
function activeDentition(){return DENTITIONS[chartMode]}
function activeUpperDisplay(){return chartMode==="primary"?primaryLayout.upperDisplay:activeDentition().upperDisplay}
function activeLowerDisplay(){return chartMode==="primary"?primaryLayout.lowerDisplay:activeDentition().lowerDisplay}
function activeUpper(){return activeUpperDisplay().filter(Boolean)}
function activeLower(){return activeLowerDisplay().filter(Boolean)}
function activeOrder(){return [...activeUpper(),...activeLower()]}
function activeState(){return state[chartMode]}
function currentToothName(n){return TOOTH_NAMES[chartMode][n]||TOOTH_NAMES.permanent[n]||`Tooth ${n}`}
function isPrimaryOptionalMolar(n){return PRIMARY_OPTIONAL_MOLAR_SET.has(n)}
function isGhostPrimarySlot(n){return chartMode==="primary"&&isPrimaryOptionalMolar(n)&&!primaryOptionalActive.has(n)}
function swapPrimaryToothNumber(n){return PRIMARY_SWAP_MAP[n]||PRIMARY_REVERSE_MAP[n]||null}
function swapPrimarySlot(n){
  if(chartMode!=="primary") return null;
  const next=swapPrimaryToothNumber(n);
  if(!next) return null;
  const keys=["upperDisplay","lowerDisplay"];
  for(const key of keys){
    const index=primaryLayout[key].indexOf(n);
    if(index===-1) continue;
    primaryLayout[key][index]=next;
    return next;
  }
  return null;
}
function togglePrimaryTooth(n,v){
  const next=swapPrimarySlot(n);
  if(!next) return;
  selection.teeth=selection.teeth.map(tooth=>tooth===n?next:tooth);
  if(draft.tooth===n){
    draft.tooth=next;
    draft.view=v;
    draft.surfaces=defaultSurfaceFor(next,v);
    normalizeDraft();
  }
  renderAll();
}
function activatePrimaryOptionalTooth(n){
  if(chartMode!=="primary"||!isPrimaryOptionalMolar(n)||primaryOptionalActive.has(n)) return;
  primaryOptionalActive.add(n);
  if(isMobileToothModalViewport()){
    mobileToothModalOpen=true;
    openTooth(n,"occ",null,false,"existing");
    return;
  }
  renderAll();
}
function deactivatePrimaryOptionalTooth(n){
  if(chartMode!=="primary"||!isPrimaryOptionalMolar(n)||!primaryOptionalActive.has(n)) return;
  const existingEntries=entriesForTooth(n);
  if(existingEntries.length&&!window.confirm(`Hide tooth ${n} from the primary chart?\nSaved entries for tooth ${n} stay recorded.`)) return;
  primaryOptionalActive.delete(n);
  selection.teeth=selection.teeth.filter(tooth=>tooth!==n);
  if(draft.tooth===n){
    draft.tooth=selection.teeth.length?selection.teeth[selection.teeth.length-1]:null;
    draft.note="";
    els.noteInput.value="";
    if(draft.tooth){
      draft.view="occ";
      draft.surfaces=defaultSurfaceFor(draft.tooth,draft.view);
      normalizeDraft();
    }else{
      draft.surfaces=[];
    }
  }
  renderAll();
}
function setChartMode(mode){
  if(mode===chartMode||!DENTITIONS[mode]) return;
  chartMode=mode;
  persistChartMode();
  selection.multi=false;
  selection.teeth=[];
  draft.tooth=null;
  draft.surfaces=[];
  draft.note="";
  els.noteInput.value="";
  renderAll();
}
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG=["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS=["M","T","W","T","F","S","S"];
const datePicker={open:false,target:null,view:"day",cursor:new Date().toISOString().slice(0,7),anchor:null};
const dateTargets={
  dob:{valueInput:document.getElementById("patient-dob"),textInput:els.patientDobText,trigger:els.patientDobTrigger,allowClear:true},
  visit:{valueInput:document.getElementById("visit-date-input"),textInput:els.visitDateText,trigger:els.visitDateTrigger,allowClear:false}
};
function isoToday(){return new Date().toISOString().slice(0,10)}
function parseIsoDate(value){if(!value) return null; const date=new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime())?null:date}
function formatInputDate(value){const date=parseIsoDate(value); if(!date) return ""; const day=`${date.getDate()}`.padStart(2,"0"); const month=`${date.getMonth()+1}`.padStart(2,"0"); return `${day}/${month}/${date.getFullYear()}`}
function formatHeaderDate(value){const date=parseIsoDate(value); if(!date) return "Date not set"; return `${`${date.getDate()}`.padStart(2,"0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`}
function monthKeyFromIso(value){return (value||isoToday()).slice(0,7)}
function monthStartFromKey(key){return new Date(`${key}-01T00:00:00`)}
function shiftMonth(key,delta){const date=monthStartFromKey(key); date.setMonth(date.getMonth()+delta); return `${date.getFullYear()}-${`${date.getMonth()+1}`.padStart(2,"0")}`}
function shiftYear(key,delta){const date=monthStartFromKey(key); date.setFullYear(date.getFullYear()+delta); return `${date.getFullYear()}-${`${date.getMonth()+1}`.padStart(2,"0")}`}
function buildIso(year,monthIndex,day){return `${year}-${`${monthIndex+1}`.padStart(2,"0")}-${`${day}`.padStart(2,"0")}`}
function sameDay(a,b){return a&&b&&a===b}
function parseTypedDate(value){
  const raw=value.trim();
  if(!raw) return "";
  let year,month,day;
  let match=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(match){year=Number(match[1]); month=Number(match[2]); day=Number(match[3]);}
  else{
    match=raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if(!match) return null;
    day=Number(match[1]); month=Number(match[2]); year=Number(match[3]);
  }
  const date=new Date(`${year}-${`${month}`.padStart(2,"0")}-${`${day}`.padStart(2,"0")}T00:00:00`);
  if(Number.isNaN(date.getTime())) return null;
  if(date.getFullYear()!==year||date.getMonth()+1!==month||date.getDate()!==day) return null;
  return `${year}-${`${month}`.padStart(2,"0")}-${`${day}`.padStart(2,"0")}`;
}
function syncDateField(targetName){
  const target=dateTargets[targetName];
  target.textInput.value=target.valueInput.value?formatInputDate(target.valueInput.value):"";
  target.textInput.classList.remove("invalid");
}
function commitDateField(targetName,{emptyOk=true,fallbackToday=false}={}){
  const target=dateTargets[targetName];
  const parsed=parseTypedDate(target.textInput.value);
  if(parsed===null){target.textInput.classList.add("invalid"); return false}
  if(parsed===""){
    if(fallbackToday) target.valueInput.value=isoToday();
    else if(emptyOk) target.valueInput.value="";
    else {target.textInput.classList.add("invalid"); return false}
  }else{
    target.valueInput.value=parsed;
  }
  syncDateField(targetName);
  return true;
}
function formatDobLabel(dob){if(!dob) return "DOB not set"; const date=new Date(`${dob}T00:00:00`); if(Number.isNaN(date.getTime())) return "DOB not set"; const age=calcAge(dob); const opts={day:"2-digit",month:"short",year:"numeric"}; return `${date.toLocaleDateString("en-GB",opts)}${age!==null?` · ${age}y`:""}`}
function formatVisitDate(value){return formatHeaderDate(value)}
function calcAge(dob){if(!dob) return null; const birth=new Date(`${dob}T00:00:00`); if(Number.isNaN(birth.getTime())) return null; const today=new Date(); let age=today.getFullYear()-birth.getFullYear(); const hadBirthday=today.getMonth()>birth.getMonth()||(today.getMonth()===birth.getMonth()&&today.getDate()>=birth.getDate()); if(!hadBirthday) age-=1; return age>=0?age:null}
function printFieldHTML(label,value,wide=false){return `<div class="print-info-item${wide?" wide":""}"><span class="print-label">${label}</span><strong class="print-value">${value||"—"}</strong></div>`}
function renderPatientHeader(){const hasPatient=Boolean(patient.fullName); els.patientTrigger.classList.toggle("needs-patient",!hasPatient); els.patientNameDisplay.textContent=patient.fullName||"Add patient details"; const parts=[]; if(patient.dob) parts.push(formatDobLabel(patient.dob)); if(patient.patientId) parts.push(`ID ${patient.patientId}`); els.patientSubDisplay.textContent=parts.join(" · ")||"Click to add patient information"; els.patientTrigger.title=parts.join(" · ")||"Click to add patient details"}
function renderVisitHeader(){els.visitDateDisplay.textContent=formatVisitDate(visit.date); els.visitDateSubDisplay.textContent="Click to change visit date"; els.dateTrigger.title="Click to change visit date"}
function renderPrintSections(){
  const age=calcAge(patient.dob);
  const fields=[
    ["Patient",patient.fullName||"Not set"],
    ["Patient ID",patient.patientId||"—"],
    ["Visit date",formatVisitDate(visit.date)],
    ["Date of birth",patient.dob?formatInputDate(patient.dob):"—"],
    ["Age",age!==null?`${age} years`:"—"],
    ["Dentition",activeDentition().label],
    ["Gender",patient.gender||"—"],
    ["Phone",patient.phone||"—"],
    ["Email",patient.email||"—"]
  ];
  els.printPatientGrid.innerHTML=fields.map(([label,value])=>printFieldHTML(label,value)).join("");
  els.printNoteBody.textContent=patient.notes?.trim()||"No patient note recorded.";
}
function renderDatePopover(){
  const target=dateTargets[datePicker.target];
  if(!target) return;
  els.dateClearBtn.disabled=!target.allowClear;
  const selected=target.valueInput.value;
  const base=monthStartFromKey(datePicker.cursor);
  if(datePicker.view==="day"){
    els.dateTitleBtn.textContent=`${MONTHS_LONG[base.getMonth()]} ${base.getFullYear()}`;
    const first=new Date(base); const firstDay=(first.getDay()+6)%7;
    const start=new Date(base); start.setDate(start.getDate()-firstDay);
    let cells=`<div class="date-weekdays">${WEEKDAYS.map(day=>`<span>${day}</span>`).join("")}</div><div class="date-days">`;
    for(let index=0;index<42;index+=1){
      const cell=new Date(start); cell.setDate(start.getDate()+index);
      const iso=buildIso(cell.getFullYear(),cell.getMonth(),cell.getDate());
      const classes=["date-grid-btn"];
      if(cell.getMonth()!==base.getMonth()) classes.push("muted");
      if(sameDay(iso,selected)) classes.push("active");
      if(sameDay(iso,isoToday())) classes.push("today");
      cells+=`<button class="${classes.join(" ")}" type="button" data-date-action="select-day" data-iso="${iso}">${cell.getDate()}</button>`;
    }
    els.dateView.innerHTML=`${cells}</div>`;
    return;
  }
  if(datePicker.view==="month"){
    els.dateTitleBtn.textContent=`${base.getFullYear()}`;
    els.dateView.innerHTML=`<div class="date-months">${MONTHS.map((month,index)=>{const iso=buildIso(base.getFullYear(),index,1);const active=selected&&selected.slice(0,7)===iso.slice(0,7)?" active":"";return `<button class="date-grid-btn${active}" type="button" data-date-action="select-month" data-month="${index}">${month}</button>`}).join("")}</div>`;
    return;
  }
  const startYear=base.getFullYear()-(base.getFullYear()%12);
  els.dateTitleBtn.textContent=`${startYear}–${startYear+11}`;
  els.dateView.innerHTML=`<div class="date-years">${Array.from({length:12},(_,index)=>{const year=startYear+index;const active=selected&&selected.slice(0,4)===String(year)?" active":"";return `<button class="date-grid-btn${active}" type="button" data-date-action="select-year" data-year="${year}">${year}</button>`}).join("")}</div>`;
}
function positionDatePopover(){
  if(!datePicker.open||!datePicker.anchor) return;
  const rect=datePicker.anchor.getBoundingClientRect();
  const pop=els.datePopover;
  pop.hidden=false;
  const width=pop.offsetWidth;
  const height=pop.offsetHeight;
  const margin=12;
  let left=rect.left;
  let top=rect.bottom+10;
  if(left+width>window.innerWidth-margin) left=window.innerWidth-width-margin;
  if(left<margin) left=margin;
  if(top+height>window.innerHeight-margin) top=rect.top-height-10;
  if(top<margin) top=margin;
  pop.style.left=`${left}px`;
  pop.style.top=`${top}px`;
}
function openDatePopover(targetName,anchor){
  datePicker.open=true;
  datePicker.target=targetName;
  datePicker.anchor=anchor;
  datePicker.view="day";
  const target=dateTargets[targetName];
  const typed=parseTypedDate(target.textInput.value);
  if(typed&&typed!==target.valueInput.value) target.valueInput.value=typed;
  syncDateField(targetName);
  datePicker.cursor=monthKeyFromIso(target.valueInput.value);
  renderDatePopover();
  positionDatePopover();
}
function closeDatePopover(){
  datePicker.open=false;
  datePicker.target=null;
  datePicker.anchor=null;
  els.datePopover.hidden=true;
}
function selectDateValue(value,{close=true}={}){
  const target=dateTargets[datePicker.target];
  if(!target) return;
  target.valueInput.value=value;
  syncDateField(datePicker.target);
  datePicker.cursor=monthKeyFromIso(value);
  renderDatePopover();
  if(close) closeDatePopover();
}
function fillPatientForm(){els.patientForm.fullName.value=patient.fullName; els.patientForm.dob.value=patient.dob; syncDateField("dob"); els.patientForm.patientId.value=patient.patientId; els.patientForm.gender.value=patient.gender; els.patientForm.phone.value=patient.phone; els.patientForm.email.value=patient.email; els.patientForm.notes.value=patient.notes}
function openPatientModal(){fillPatientForm(); els.patientModal.classList.add("show"); els.patientModal.setAttribute("aria-hidden","false"); setTimeout(()=>els.patientForm.fullName.focus(),0)}
function closePatientModal(){closeDatePopover(); els.patientModal.classList.remove("show"); els.patientModal.setAttribute("aria-hidden","true")}
function clearPatientForm(){els.patientForm.reset(); els.patientForm.gender.value=""; syncDateField("dob")}
function savePatientFromForm(e){e.preventDefault(); if(!commitDateField("dob",{emptyOk:true})){els.patientDobText.focus(); return} patient.fullName=els.patientForm.fullName.value.trim(); patient.dob=els.patientForm.dob.value; patient.patientId=els.patientForm.patientId.value.trim(); patient.gender=els.patientForm.gender.value; patient.phone=els.patientForm.phone.value.trim(); patient.email=els.patientForm.email.value.trim(); patient.notes=els.patientForm.notes.value.trim(); persistPatient(); renderPatientHeader(); closePatientModal()}
function fillDateForm(){els.dateForm.visitDate.value=visit.date; syncDateField("visit")}
function openDateModal(){fillDateForm(); els.dateModal.classList.add("show"); els.dateModal.setAttribute("aria-hidden","false"); setTimeout(()=>els.visitDateTrigger.focus(),0)}
function closeDateModal(){closeDatePopover(); els.dateModal.classList.remove("show"); els.dateModal.setAttribute("aria-hidden","true")}
function setVisitToday(){els.dateForm.visitDate.value=isoToday(); syncDateField("visit")}
function saveVisitFromForm(e){e.preventDefault(); if(!commitDateField("visit",{emptyOk:false,fallbackToday:true})){els.visitDateText.focus(); return} visit.date=els.dateForm.visitDate.value||isoToday(); persistVisit(); renderVisitHeader(); closeDateModal()}
function mkGrads(id, fill){const c=fill==="#F5F2EC"?null:fill;const hi=c?lighten(c,68):"#fffefd",mid=c?lighten(c,20):"#f3eee7",lo=c?darken(c,20):"#c5b9ac",groove=c?darken(c,32):"#a98f77";return`<defs><linearGradient id="cg${id}" x1="12%" y1="4%" x2="88%" y2="96%"><stop offset="0%" stop-color="${hi}"/><stop offset="27%" stop-color="${mid}"/><stop offset="62%" stop-color="${c||"#e8dfd5"}"/><stop offset="86%" stop-color="${lo}"/><stop offset="100%" stop-color="${c?darken(c,24):"#b8aa9b"}"/></linearGradient><radialGradient id="sg${id}" cx="27%" cy="18%" r="68%"><stop offset="0%" stop-color="rgba(255,255,255,.98)"/><stop offset="42%" stop-color="rgba(255,255,255,.38)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient><linearGradient id="rg${id}" x1="10%" y1="0%" x2="90%" y2="100%"><stop offset="0%" stop-color="#f4d8ae"/><stop offset="45%" stop-color="#d6a66f"/><stop offset="100%" stop-color="#9f683e"/></linearGradient><linearGradient id="gg${id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${lighten(groove,10)}"/><stop offset="100%" stop-color="${groove}"/></linearGradient><filter id="ds${id}" x="-40%" y="-30%" width="180%" height="185%"><feDropShadow dx="1.5" dy="5" stdDeviation="2.8" flood-color="#080b10" flood-opacity=".52"/></filter></defs>`}
const WO=`stroke="rgba(126,108,89,.58)" stroke-width="1.15"`; const RO=`stroke="rgba(116,83,54,.62)" stroke-width="1.02"`;
function upperIncisorSVG(n,f,c){const id=`u${n}`,w=c?40:36,x=w/2,cw=c?16:14,rw=c?7:6;return`<svg viewBox="0 0 ${w} 100" width="${w}" height="100" filter="url(#ds${id})">${mkGrads(id,f)}<path d="M${x-cw},48 C${x-cw-1},35 ${x-cw+2},17 ${x-10},7 C${x-6},2 ${x-1},0 ${x},0 C${x+1},0 ${x+6},2 ${x+10},7 C${x+cw-2},17 ${x+cw+1},35 ${x+cw},48 C${x+cw-1},61 ${x+9},67 ${x},70 C${x-9},67 ${x-cw+1},61 ${x-cw},48 Z" fill="url(#cg${id})" ${WO}/><path d="M${x-3},5 C${x-7},18 ${x-8},36 ${x-7},56" fill="none" stroke="url(#gg${id})" stroke-width="1" opacity=".14"/><ellipse cx="${x-7}" cy="18" rx="${cw*.42}" ry="14" fill="url(#sg${id})" opacity=".44"/><ellipse cx="${x}" cy="70" rx="${rw+4}" ry="2.6" fill="#d8b28b" opacity=".58"/><path d="M${x-rw},68 C${x-rw-1},56 ${x-rw},42 ${x-rw+1},28 C${x-rw+2},18 ${x-rw+3},8 ${x},0 C${x+rw-3},8 ${x+rw-2},18 ${x+rw-1},28 C${x+rw},42 ${x+rw+1},56 ${x+rw},68 C${x+rw-1},82 ${x+4},93 ${x},100 C${x-4},93 ${x-rw+1},82 ${x-rw},68 Z" fill="url(#rg${id})" ${RO}/></svg>`}
function upperCanineSVG(n,f){const id=`u${n}`;return`<svg viewBox="0 0 32 108" width="32" height="108" filter="url(#ds${id})">${mkGrads(id,f)}<path d="M16,54 C9,52 6,44 5,36 C4,26 7,12 13,3 C14,1 15,0 16,0 C17,0 18,1 19,3 C25,12 28,26 27,36 C26,44 23,52 16,54 Z" fill="url(#cg${id})" ${WO}/><path d="M16,5 L16,53" fill="none" stroke="url(#gg${id})" stroke-width="1" opacity=".16"/><ellipse cx="12" cy="18" rx="4" ry="10" fill="url(#sg${id})" opacity=".42"/><ellipse cx="16" cy="54" rx="9" ry="2.4" fill="#d7ae80" opacity=".56"/><path d="M8,52 C6,64 5,79 6,90 C7,99 11,105 16,108 C21,105 25,99 26,90 C27,79 26,64 24,52 C21,44 19,38 16,30 C13,38 11,44 8,52 Z" fill="url(#rg${id})" ${RO}/></svg>`}
function upperPremolarSVG(n,f){const id=`u${n}`;return`<svg viewBox="0 0 40 98" width="40" height="98" filter="url(#ds${id})">${mkGrads(id,f)}<path d="M8,58 C5,53 4,45 4,36 C4,22 9,8 14,0 C18,0 22,0 26,0 C31,8 36,22 36,36 C36,45 35,53 32,58 C29,62 11,62 8,58 Z" fill="url(#cg${id})" ${WO}/><path d="M7,36 C5,21 9,7 15,0 C16,8 16,22 15,36" fill="url(#cg${id})" ${WO}/><path d="M25,36 C24,22 24,8 25,0 C31,7 35,21 33,36" fill="url(#cg${id})" ${WO}/><path d="M20,6 L20,60" fill="none" stroke="url(#gg${id})" stroke-width="1" opacity=".14"/><ellipse cx="12" cy="18" rx="4.5" ry="11" fill="url(#sg${id})" opacity=".42"/><ellipse cx="20" cy="62" rx="13" ry="2.5" fill="#d7ae80" opacity=".58"/><path d="M10,60 C8,71 8,81 9,88 C10,93 13,96 16,98 L20,98 C22,98 23,93 22,88 C21,79 20,69 19,60 Z" fill="url(#rg${id})" ${RO}/><path d="M22,60 C21,70 21,79 22,85 C23,91 26,95 29,95 L33,95 C35,95 36,91 35,85 C34,79 33,70 31,60 Z" fill="url(#rg${id})" ${RO}/></svg>`}
function upperMolarSVG(n,f,wis){const id=`u${n}`,w=wis?52:56,c=w/2;return`<svg viewBox="0 0 ${w} 102" width="${w}" height="102" filter="url(#ds${id})">${mkGrads(id,f)}<path d="M6,62 C3,56 2,46 2,35 C2,19 8,7 14,0 C18,0 21,4 23,10 C25,4 29,0 33,0 C39,7 45,19 45,35 C45,46 44,56 41,62 C37,69 15,69 6,62 Z" fill="url(#cg${id})" ${WO}/><path d="M18,10 C16,18 15,31 16,48" fill="none" stroke="url(#gg${id})" stroke-width="1" opacity=".16"/><path d="M${c},10 C${c-1},20 ${c-1},35 ${c},50" fill="none" stroke="url(#gg${id})" stroke-width="1" opacity=".14"/><path d="M${w-18},10 C${w-16},18 ${w-15},31 ${w-16},48" fill="none" stroke="url(#gg${id})" stroke-width="1" opacity=".16"/><ellipse cx="${c-8}" cy="18" rx="7" ry="13" fill="url(#sg${id})" opacity=".34"/><ellipse cx="${c}" cy="70" rx="${c-6}" ry="2.8" fill="#d7ae80" opacity=".58"/><path d="M9,68 C7,79 7,89 8,96 C9,100 13,102 16,102 L20,102 C22,102 23,99 23,94 C22,86 21,77 20,68 Z" fill="url(#rg${id})" ${RO}/><path d="M${c-5},68 C${c-6},79 ${c-7},89 ${c-6},97 C${c-5},100 ${c-2},102 ${c},102 C${c+2},102 ${c+5},100 ${c+6},97 C${c+7},89 ${c+6},79 ${c+5},68 Z" fill="url(#rg${id})" ${RO}/><path d="M${w-9},68 C${w-7},79 ${w-7},89 ${w-8},96 C${w-9},100 ${w-13},102 ${w-16},102 L${w-20},102 C${w-22},102 ${w-23},99 ${w-23},94 C${w-22},86 ${w-21},77 ${w-20},68 Z" fill="url(#rg${id})" ${RO}/></svg>`}
function upperRightWisdom18RootSVG(f){const id="u18custom";return`<svg viewBox="0 0 42 74" width="42" height="74" filter="url(#ds${id})">${mkGrads(id,f)}<path d="M8,34 C5,28 4,20 5,12 C6,5 11,1 18,0 C20,4 21,11 21,18 C21,11 24,4 28,0 C34,1 38,5 39,12 C40,21 38,29 34,34 C31,39 11,39 8,34 Z" fill="url(#cg${id})" ${WO}/><path d="M15,5 C13,11 12,20 13,31" fill="none" stroke="url(#gg${id})" stroke-width=".95" opacity=".18"/><path d="M21,3 C21,10 21,20 21,33" fill="none" stroke="url(#gg${id})" stroke-width=".95" opacity=".14"/><path d="M27,5 C29,11 30,20 29,31" fill="none" stroke="url(#gg${id})" stroke-width=".95" opacity=".18"/><ellipse cx="14" cy="14" rx="5" ry="10" fill="url(#sg${id})" opacity=".34"/><ellipse cx="21" cy="40" rx="13" ry="2.2" fill="#d7ae80" opacity=".58"/><path d="M9,39 C8,49 8,57 9,63 C10,69 12,73 15,74 C17,74 18,72 18,68 C18,60 17,50 16,39 Z" fill="url(#rg${id})" ${RO}/><path d="M18,39 C17,49 17,57 18,64 C19,70 20,73 21,74 C22,73 23,70 24,64 C25,57 25,49 24,39 Z" fill="url(#rg${id})" ${RO}/><path d="M26,39 C25,50 24,60 24,68 C24,72 25,74 27,74 C30,73 32,69 33,63 C34,57 34,49 33,39 Z" fill="url(#rg${id})" ${RO}/></svg>`}
function upperRightWisdom18CrownSVG(f){const id="co18custom",c=f==="#F5F2EC"?null:f,c1=c?lighten(c,40):"#fffefc",c2=c?lighten(c,10):"#f7f4ef",c3=c?darken(c,8):"#ece6de",ol="#2f3744",g="#3b4452";return`<svg viewBox="0 0 36 34" width="36" height="34"><defs><radialGradient id="og${id}" cx="34%" cy="28%" r="75%"><stop offset="0%" stop-color="${c1}"/><stop offset="44%" stop-color="${c2}"/><stop offset="100%" stop-color="${c3}"/></radialGradient></defs><path d="M5.5,18 C5.5,9.2 11.6,4.2 18.9,4.2 C26.2,4.2 30.8,8.5 30.8,16.8 C30.8,25 25,29.8 17.8,29.8 C10.5,29.8 5.5,26 5.5,18 Z" fill="url(#og${id})" stroke="${ol}" stroke-width="1.2"/><path d="M17.8,8 C14.8,9.8 13.8,11.6 13.8,13.8 C11.8,12.9 9.8,13.8 8.5,15.5 C10.2,16.9 11.7,17.8 13.1,18.6 C12.6,20.4 13.1,22 14.5,23.4 C15.7,22.2 16.6,21.2 17.8,20 C19,21.2 19.9,22.2 21.2,23.4 C22.8,22 23.2,20.4 22.7,18.6 C24.1,17.8 25.5,16.9 27.2,15.5 C26,13.8 24,12.9 22,13.8 C22,11.8 20.8,9.9 17.8,8 Z" fill="none" stroke="${g}" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/><path d="M10.8,10.7 C12.2,11.8 13.2,12.7 14.2,13.9" fill="none" stroke="${g}" stroke-width=".82" opacity=".62"/><path d="M24.9,10.7 C23.4,11.8 22.5,12.7 21.4,13.9" fill="none" stroke="${g}" stroke-width=".82" opacity=".62"/><path d="M10.6,21.1 C11.8,20.3 12.8,19.8 13.9,20" fill="none" stroke="${g}" stroke-width=".8" opacity=".56"/><path d="M24.8,21.1 C23.5,20.3 22.6,19.8 21.5,20" fill="none" stroke="${g}" stroke-width=".8" opacity=".56"/></svg>`}
function lowerIncisorSVG(n,f,c){const id=`l${n}`,w=c?28:30,x=w/2,cw=c?10:11,rw=c?5:6;return`<svg viewBox="0 0 ${w} 102" width="${w}" height="102" filter="url(#ds${id})">${mkGrads(id,f)}<path d="M${x-cw},4 C${x-cw-1},12 ${x-cw},22 ${x-cw+2},32 C${x-cw+4},45 ${x-5},56 ${x},59 C${x+5},56 ${x+cw-4},45 ${x+cw-2},32 C${x+cw},22 ${x+cw+1},12 ${x+cw},4 C${x+cw-2},1 ${x+5},0 ${x},0 C${x-5},0 ${x-cw+2},1 ${x-cw},4 Z" fill="url(#cg${id})" ${WO}/><path d="M${x},4 L${x},58" fill="none" stroke="url(#gg${id})" stroke-width=".95" opacity=".14"/><ellipse cx="${x}" cy="59" rx="${rw+3}" ry="2.3" fill="#d7ae80" opacity=".56"/><path d="M${x-rw},57 C${x-rw-1},71 ${x-rw-1},84 ${x-rw+1},93 C${x-rw+2},98 ${x-2},102 ${x},102 C${x+2},102 ${x+rw-2},98 ${x+rw-1},93 C${x+rw+1},84 ${x+rw+1},71 ${x+rw},57 Z" fill="url(#rg${id})" ${RO}/></svg>`}
function lowerCanineSVG(n,f){const id=`l${n}`;return`<svg viewBox="0 0 32 110" width="32" height="110" filter="url(#ds${id})">${mkGrads(id,f)}<path d="M16,4 C12,7 9,14 8,22 C7,30 8,39 11,47 C12,52 14,56 16,59 C18,56 20,52 21,47 C24,39 25,30 24,22 C23,14 20,7 16,4 Z" fill="url(#cg${id})" ${WO}/><path d="M16,6 L16,58" fill="none" stroke="url(#gg${id})" stroke-width="1" opacity=".14"/><ellipse cx="16" cy="59" rx="8" ry="2.2" fill="#d7ae80" opacity=".56"/><path d="M11,57 C9,71 9,84 10,95 C11,102 13,107 16,110 C19,107 21,102 22,95 C23,84 23,71 21,57 Z" fill="url(#rg${id})" ${RO}/></svg>`}
function lowerPremolarSVG(n,f){const id=`l${n}`;return`<svg viewBox="0 0 36 96" width="36" height="96" filter="url(#ds${id})">${mkGrads(id,f)}<path d="M8,4 C6,9 4,18 4,26 C4,36 6,45 10,53 C12,58 15,60 18,61 C21,60 24,58 26,53 C30,45 32,36 32,26 C32,18 30,9 28,4 C25,1 22,0 18,0 C14,0 11,1 8,4 Z" fill="url(#cg${id})" ${WO}/><path d="M18,5 L18,60" fill="none" stroke="url(#gg${id})" stroke-width="1" opacity=".14"/><ellipse cx="18" cy="61" rx="10" ry="2.3" fill="#d7ae80" opacity=".56"/><path d="M13,59 C11,71 11,81 12,89 C13,94 15,96 18,96 C21,96 23,94 24,89 C25,81 25,71 23,59 Z" fill="url(#rg${id})" ${RO}/></svg>`}
function lowerMolarSVG(n,f,wis){const id=`l${n}`,w=wis?48:52,c=w/2;return`<svg viewBox="0 0 ${w} 106" width="${w}" height="106" filter="url(#ds${id})">${mkGrads(id,f)}<path d="M6,4 C3,9 2,20 2,30 C2,40 4,50 8,58 C12,65 16,67 ${c},68 C${w-16},67 ${w-12},65 ${w-8},58 C${w-4},50 ${w-2},40 ${w-2},30 C${w-2},20 ${w-3},9 ${w-6},4 C${w-10},1 ${w-14},0 ${c},0 C14,0 10,1 6,4 Z" fill="url(#cg${id})" ${WO}/><path d="M${c},5 L${c},66" fill="none" stroke="url(#gg${id})" stroke-width="1" opacity=".15"/><path d="M9,28 L${w-9},28" fill="none" stroke="url(#gg${id})" stroke-width=".9" opacity=".1"/><ellipse cx="${c}" cy="68" rx="${c-6}" ry="2.6" fill="#d7ae80" opacity=".58"/><path d="M8,66 C6,79 6,89 7,97 C8,102 12,106 16,106 L20,106 C22,106 23,102 23,97 C22,89 21,79 20,66 Z" fill="url(#rg${id})" ${RO}/><path d="M${w-8},66 C${w-6},79 ${w-6},89 ${w-7},97 C${w-8},102 ${w-12},106 ${w-16},106 L${w-20},106 C${w-22},106 ${w-23},102 ${w-23},97 C${w-22},89 ${w-21},79 ${w-20},66 Z" fill="url(#rg${id})" ${RO}/></svg>`}
function missingSVG(n,v){const d=v==="front"?{width:toothW(n),height:toothH(n)}:crownDims(n);return`<div class="missing-box" style="width:${d.width}px;height:${d.height}px">X</div>`}
function hasPhotoTooth(n){return chartMode==="permanent"||(chartMode==="primary"&&PRIMARY_PHOTO_TEETH.has(n))}
function photoToothSVG(n,view){
  const dims=view==="occ"?crownDims(n):{width:toothW(n),height:toothH(n)};
  const file=view==="occ"?"crown":"root";
  const folder=chartMode==="primary"?"primary":"permanent";
  const assetName=folder==="permanent"&&n===12&&file==="root"?"12-root.PNG":`${n}-${file}.png`;
  const image=`<image href="./assets/images/teeth/${folder}/${assetName}" x="0" y="0" width="${dims.width}" height="${dims.height}" preserveAspectRatio="none"/>`;
  const content=view==="front"&&isUpper(n)?`<g transform="translate(0 ${dims.height}) scale(1 -1)">${image}</g>`:image;
  return `<svg class="photo-tooth-svg" viewBox="0 0 ${dims.width} ${dims.height}" width="${dims.width}" height="${dims.height}" aria-hidden="true">${content}</svg>`;
}
function crownOnlySVG(n,f){if(hasPhotoTooth(n))return photoToothSVG(n,"occ");const t=toothType(n),u=isUpper(n),id=`co${n}`,c=n%10===1,d=n%10,custom=f==="#F5F2EC"?null:f,c1=custom?lighten(custom,40):"#fffefc",c2=custom?lighten(custom,10):"#f7f4ef",c3=custom?darken(custom,8):"#ece6de",outline="#2f3744",groove="#3b4452",defs=`<defs><radialGradient id="og${id}" cx="32%" cy="28%" r="75%"><stop offset="0%" stop-color="${c1}"/><stop offset="42%" stop-color="${c2}"/><stop offset="100%" stop-color="${c3}"/></radialGradient></defs>`; if(t==="molar"||t==="wisdom"){const w=t==="wisdom"?46:(isPrimaryTooth(n)?(d===4?38:42):(d===6?52:50)),h=t==="wisdom"?36:(isPrimaryTooth(n)?(d===4?30:32):(d===6?40:38)),x=w/2;return`<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs}<path d="M7,${h*.5} C7,10.5 12,6.5 19,5.4 L${w-19},5.4 C${w-12},6.5 ${w-7},10.5 ${w-7},${h*.5} C${w-7},${h-8.6} ${w-12.4},${h-5.2} ${w-20},${h-4.3} L20,${h-4.3} C12.4,${h-5.2} 7,${h-8.6} 7,${h*.5} Z" fill="url(#og${id})" stroke="${outline}" stroke-width="1.2"/><path d="M${x},7.2 C${x-1},13 ${x-1},20 ${x},${h-7.2}" fill="none" stroke="${groove}" stroke-width="1" opacity=".86"/><path d="M${w*.2},${h*.48} C${w*.31},${h*.39} ${w*.41},${h*.34} ${x},${h*.34} C${w*.59},${h*.34} ${w*.69},${h*.39} ${w*.8},${h*.48}" fill="none" stroke="${groove}" stroke-width="1.04" opacity=".9"/><path d="M${w*.25},${h*.2} C${w*.29},${h*.29} ${w*.3},${h*.4} ${w*.3},${h*.57}" fill="none" stroke="${groove}" stroke-width=".84" opacity=".7"/><path d="M${w*.75},${h*.2} C${w*.71},${h*.29} ${w*.7},${h*.4} ${w*.7},${h*.57}" fill="none" stroke="${groove}" stroke-width=".84" opacity=".7"/><path d="M${w*.28},${h*.76} C${w*.38},${h*.68} ${w*.45},${h*.65} ${x},${h*.65} C${w*.55},${h*.65} ${w*.62},${h*.68} ${w*.72},${h*.76}" fill="none" stroke="${groove}" stroke-width=".74" opacity=".56"/></svg>`}
 if(t==="premolar"){const w=d===4?31:33,h=d===4?31:33,x=w/2;return`<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs}<path d="M5.5,${h*.5} C5.5,10.2 9.8,6.4 15.2,5.4 L${w-15.2},5.4 C${w-9.8},6.4 ${w-5.5},10.2 ${w-5.5},${h*.5} C${w-5.5},${h-6.4} ${w-9.8},${h-4.6} ${w-15.2},${h-4.2} L15.2,${h-4.2} C9.8,${h-4.6} 5.5,${h-6.4} 5.5,${h*.5} Z" fill="url(#og${id})" stroke="${outline}" stroke-width="1.16"/><path d="M${x},7 C${x-.8},12 ${x-.8},18 ${x},${h-6}" fill="none" stroke="${groove}" stroke-width=".9" opacity=".86"/><path d="M${w*.26},${h*.5} C${w*.36},${h*.39} ${w*.43},${h*.35} ${x},${h*.35} C${w*.57},${h*.35} ${w*.64},${h*.39} ${w*.74},${h*.5}" fill="none" stroke="${groove}" stroke-width=".92" opacity=".82"/><path d="M${w*.31},${h*.72} C${w*.39},${h*.66} ${w*.45},${h*.63} ${x},${h*.63} C${w*.55},${h*.63} ${w*.61},${h*.66} ${w*.69},${h*.72}" fill="none" stroke="${groove}" stroke-width=".74" opacity=".54"/></svg>`}
 if(t==="canine"){const w=u?28:30,h=u?34:30;const x=w/2;return`<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs}<path d="M${x},2.6 C${x-5.2},3.8 5,10.8 5,18.2 C5,26.2 ${x-4.2},${h-2} ${x},${h-2} C${x+4.2},${h-2} ${w-5},26.2 ${w-5},18.2 C${w-5},10.8 ${x+5.2},3.8 ${x},2.6 Z" fill="url(#og${id})" stroke="${outline}" stroke-width="1.16"/><path d="M${x},6 C${x-.8},11 ${x-.8},18 ${x},${h-4}" fill="none" stroke="${groove}" stroke-width=".84" opacity=".88"/><path d="M${x-4.2},${h*.5} C${x-2.6},${h*.43} ${x-1.1},${h*.39} ${x},${h*.39} C${x+1.1},${h*.39} ${x+2.6},${h*.43} ${x+4.2},${h*.5}" fill="none" stroke="${groove}" stroke-width=".76" opacity=".7"/></svg>`}
 if(u){const w=c?36:32,h=c?26:24;const leftShoulder=c?8:7,rightShoulder=c?w-8:w-7,topY=c?3.6:4.2,midTop=c?5.8:6.4,bottomY=h-2.4;return`<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs}<path d="M4,${bottomY-2.4} C4,11 ${leftShoulder-1},${midTop+1.2} ${leftShoulder},${midTop} C${w*.38},${topY} ${w*.62},${topY} ${rightShoulder},${midTop} C${rightShoulder+1},${midTop+1.2} ${w-4},11 ${w-4},${bottomY-2.4} C${w-4},${bottomY} ${w*.77},${bottomY} ${w/2},${bottomY} C${w*.23},${bottomY} 4,${bottomY} 4,${bottomY-2.4} Z" fill="url(#og${id})" stroke="${outline}" stroke-width="1.1"/><path d="M${w/2},${midTop-1.2} C${w/2-1},${midTop+3.8} ${w/2-1},${bottomY-3.2} ${w/2},${bottomY-1}" fill="none" stroke="${groove}" stroke-width=".78" opacity=".86"/><path d="M${leftShoulder+1},${midTop+1.4} C${w*.33},${midTop-.1} ${w*.42},${midTop-.6} ${w/2},${midTop-.6} C${w*.58},${midTop-.6} ${w*.67},${midTop-.1} ${rightShoulder-1},${midTop+1.4}" fill="none" stroke="${groove}" stroke-width=".74" opacity=".66"/></svg>`}
 const w=c?32:30,h=20;return`<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs}<path d="M3.2,10 C3.2,5.1 ${w*.18},3.6 ${w/2},3.6 C${w*.82},3.6 ${w-3.2},5.1 ${w-3.2},10 C${w-3.2},14.8 ${w*.82},16.4 ${w/2},16.4 C${w*.18},16.4 3.2,14.8 3.2,10 Z" fill="url(#og${id})" stroke="${outline}" stroke-width="1.06"/><path d="M${w/2},4.8 C${w/2-.8},7.2 ${w/2-.8},11 ${w/2},14.8" fill="none" stroke="${groove}" stroke-width=".74" opacity=".82"/><path d="M${w*.22},9.3 C${w*.34},7.8 ${w*.43},7.3 ${w/2},7.3 C${w*.57},7.3 ${w*.66},7.8 ${w*.78},9.3" fill="none" stroke="${groove}" stroke-width=".68" opacity=".58"/></svg>`}
function previewCrownSVG(n,f){return crownOnlySVG(n,f)}
function toothSVG(n,f){if(hasPhotoTooth(n))return photoToothSVG(n,"front");const t=toothType(n),u=isUpper(n),c=n%10===1;if(u){if(t==="molar"||t==="wisdom")return upperMolarSVG(n,f,t==="wisdom"); if(t==="premolar")return upperPremolarSVG(n,f); if(t==="canine")return upperCanineSVG(n,f); return upperIncisorSVG(n,f,c)} if(t==="molar"||t==="wisdom")return lowerMolarSVG(n,f,t==="wisdom"); if(t==="premolar")return lowerPremolarSVG(n,f); if(t==="canine")return lowerCanineSVG(n,f); return lowerIncisorSVG(n,f,c)}
function sketchifySVG(svg){
  return svg
    .replace(/\sfilter="url\(#ds[^"]+\)"/g,"")
    .replace(/stroke="#2f3744"/g,'stroke="rgba(255,255,255,.34)"')
    .replace(/stroke="#3b4452"/g,'stroke="rgba(255,255,255,.22)"')
    .replace(/\sfill="url\(#(?:cg|og|sg|rg)[^"]+\)"/g,' fill="none"')
    .replace(/\sfill="(?:#(?:[0-9a-fA-F]{3,8})|rgb\([^)]+\))"/g,' fill="none"');
}
function sketchifySVGDark(svg){
  return svg
    .replace(/\sfilter="url\(#ds[^"]+\)"/g,"")
    .replace(/stroke="rgba\(255,255,255,0\.9\)"/g,'stroke="rgba(36,50,71,.92)"')
    .replace(/stroke="rgba\(255,247,238,0\.66\)"/g,'stroke="rgba(36,50,71,.72)"')
    .replace(/stroke="#2f3744"/g,'stroke="rgba(36,50,71,.76)"')
    .replace(/stroke="#3b4452"/g,'stroke="rgba(36,50,71,.52)"')
    .replace(/\sfill="url\(#(?:cg|og|sg|rg)[^"]+\)"/g,' fill="none"')
    .replace(/\sfill="(?:#(?:[0-9a-fA-F]{3,8})|rgb\([^)]+\))"/g,' fill="none"');
}

function surfaceDefs(n,v)
{const t=toothType(n);
  if(chartMode==="permanent"&&n===16)
    {if(v==="occ")
      return[{key:"M",path:"M1,8 C3,3 9,1 18,2 L20,14 L16,27 C10,35 5,36 1,31 Z",cx:10,cy:20},
        {key:"B",path:"M16,2 C23,0 30,0 37,2 C43,3 48,6 51,11 L38,17 L20,16 Z",cx:29,cy:8},
        {key:"O",path:"M18,13 C23,9 31,8 37,13 C42,17 42,24 37,29 C32,34 23,34 17,29 C13,25 13,18 18,13 Z",cx:27,cy:21},
        {key:"L",path:"M16,27 L38,27 L50,31 C47,37 40,40 29,40 C17,40 7,38 3,33 Z",cx:27,cy:34},
        {key:"D",path:"M36,2 C44,2 50,7 52,13 L51,30 C47,35 42,36 36,29 L34,15 Z",cx:44,cy:20}];
        return[{key:"M",path:"M3,4 C7,1 13,1 18,4 L20,35 L16,54 C10,56 5,52 3,45 Z",cx:11,cy:28},
          {key:"B",path:"M16,3 C23,0 34,0 41,3 L40,35 C34,40 23,40 17,35 Z",cx:28,cy:19},
          {key:"D",path:"M39,4 C45,1 51,2 54,6 L53,46 C50,52 45,55 40,52 L37,35 Z",cx:47,cy:28},
          {key:"L",path:"M17,33 C23,37 34,37 40,33 L40,52 C34,57 23,57 16,52 Z",cx:28,cy:46}]}
 if(v==="front")
  {const w=toothW(n),endY=frontSurfaceEndY(n),midTop=endY*.58; 
    if(t==="incisor"||t==="canine"){
      return[{key:"M",path:`M4,4 L${w*.34},4 L${w*.29},${endY} L8,${endY} Z`,cx:w*.22,cy:endY*.52},
        {key:"F",path:`M${w*.3},4 L${w*.7},4 L${w*.63},${midTop} L${w*.37},${midTop} Z`,cx:w*.5,cy:endY*.34},
        {key:"D",path:`M${w*.66},4 L${w-4},4 L${w-8},${endY} L${w*.71},${endY} Z`,cx:w*.78,cy:endY*.52},
        {key:"L",path:`M${w*.36},${midTop-2} L${w*.64},${midTop-2} L${w*.58},${endY} L${w*.42},${endY} Z`,cx:w*.5,cy:endY*.76}]}
 return[{key:"M",path:`M4,4 L${w*.31},4 L${w*.27},${endY} L8,${endY} Z`,cx:w*.18,cy:endY*.5},{key:"B",path:`M${w*.29},4 L${w*.71},4 L${w*.64},${midTop} L${w*.36},${midTop} Z`,cx:w*.5,cy:endY*.34},{key:"D",path:`M${w*.69},4 L${w-4},4 L${w-8},${endY} L${w*.73},${endY} Z`,cx:w*.82,cy:endY*.5},{key:"L",path:`M${w*.35},${midTop-2} L${w*.65},${midTop-2} L${w*.6},${endY} L${w*.4},${endY} Z`,cx:w*.5,cy:endY*.76}]}
 const {width:w,height:h}=crownDims(n); if(t==="incisor"||t==="canine"){return[{key:"M",path:`M2,${h/2} C3,4 ${w*.3},2 ${w*.42},${h/2} C${w*.3},${h-2} 3,${h-4} 2,${h/2} Z`,cx:w*.24,cy:h*.5},{key:"I",path:`M${w*.32},${h/2} C${w*.4},4 ${w*.6},4 ${w*.68},${h/2} C${w*.6},${h-4} ${w*.4},${h-4} ${w*.32},${h/2} Z`,cx:w*.5,cy:h*.5},{key:"D",path:`M${w-2},${h/2} C${w-3},4 ${w*.7},2 ${w*.58},${h/2} C${w*.7},${h-2} ${w-3},${h-4} ${w-2},${h/2} Z`,cx:w*.76,cy:h*.5}]}
 return[{key:"M",path:`M3,${h/2} C4,7 ${w*.2},5 ${w*.34},${h/2} C${w*.2},${h-5} 4,${h-7} 3,${h/2} Z`,cx:w*.18,cy:h*.5},
  {key:"B",path:`M${w/2},3 C${w*.28},4 ${w*.22},${h*.24} ${w*.36},${h*.4} L${w*.64},${h*.4} C${w*.78},${h*.24} ${w*.72},4 ${w/2},3 Z`,cx:w*.5,cy:h*.22},
  {key:"O",path:`M${w*.35},${h*.36} C${w*.42},${h*.24} ${w*.58},${h*.24} ${w*.65},${h*.36} C${w*.74},${h*.46} ${w*.74},${h*.58} ${w*.65},${h*.7} C${w*.58},${h*.78} ${w*.42},${h*.78} ${w*.35},${h*.7} C${w*.26},${h*.58} ${w*.26},${h*.46} ${w*.35},${h*.36} Z`,cx:w*.5,cy:h*.52},
  {key:"L",path:`M${w/2},${h-3} C${w*.28},${h-4} ${w*.22},${h*.76} ${w*.36},${h*.62} L${w*.64},${h*.62} C${w*.78},${h*.76} ${w*.72},${h-4} ${w/2},${h-3} Z`,cx:w*.5,cy:h*.82},
  {key:"D",path:`M${w-3},${h/2} C${w-4},7 ${w*.8},5 ${w*.66},${h/2} C${w*.8},${h-5} ${w-4},${h-7} ${w-3},${h/2} Z`,cx:w*.82,cy:h*.5}]}
function availableSurfaceCodes(n,v){return surfaceDefs(n,v).map(i=>i.key)}
function defaultSurfaceFor(n,v){const t=toothType(n); if(v==="occ") return (t==="incisor"||t==="canine")?["I"]:["O"]; return (t==="incisor"||t==="canine")?["F"]:["B"]}
function surfaceLongLabel(code,n,v){
  if(code==="M") return "Mesial";
  if(code==="D") return "Distal";
  if(code==="L") return "Lingual";
  if(code==="O") return "Occlusal";
  if(code==="I") return "Incisal";
  if(code==="B") return v==="front"?"Buccal / facial":"Buccal";
  if(code==="F") return "Facial / labial";
  return code
}
function surfaceShortLabel(code,n,v){
  if(v==="front"){
    if(code==="B") return "B/F";
    if(code==="F") return "F/V";
  }
  return code
}
function surfacePadSpec(n,v){
  const t=toothType(n),codes=new Set(availableSurfaceCodes(n,v));
  const spec=[];
  if(v==="occ"){
    if(t==="incisor"||t==="canine"){
      spec.push({area:"left",code:"M"},{area:"center",code:"I"},{area:"right",code:"D"});
    } else {
      spec.push({area:"top",code:"B"},{area:"left",code:"M"},{area:"center",code:"O"},{area:"right",code:"D"},{area:"bottom",code:"L"});
    }
  } else {
    const topCode=(t==="incisor"||t==="canine")?"F":"B";
    spec.push({area:"top",code:topCode},{area:"left",code:"M"},{area:"right",code:"D"});
    if(codes.has("L")) spec.push({area:"bottom",code:"L"});
  }
  const byArea={top:null,left:null,center:null,right:null,bottom:null};
  spec.forEach(item=>{if(codes.has(item.code)) byArea[item.area]=item.code});
  return byArea
}
function treatmentHint(id){
  const hints={
    composite:"surface filling",
    amalgam:"metal filling",
    gic:"glass ionomer",
    sealant:"occlusal seal",
    caries:"carious spot",
    rootCaries:"root lesion",
    fracture:"crack / fracture",
    missing:"missing tooth",
    rootCanal:"root canal",
    extraction:"extracted tooth",
    implant:"implant fixture",
    crown:"full crown",
    veneer:"facial shell"
  };
  return hints[id]||(TREATMENTS[id]?.mode==="surface"?"surface method":TREATMENTS[id]?.mode==="root"?"root method":"whole-tooth method");
}
function treatmentHelp(id){
  const help={
    composite:"Colors the selected surface only.",
    amalgam:"Colors the selected surface only.",
    gic:"Colors the selected surface only.",
    sealant:"Marks occlusal sealing only.",
    caries:"Marks the exact carious area.",
    rootCaries:"Use on root view for cervical/root caries.",
    fracture:"Marks the fractured area or surface.",
    missing:"Whole-tooth finding.",
    rootCanal:"Shows canal lines on root view only.",
    extraction:"Whole-tooth procedure.",
    implant:"Whole-tooth replacement marker.",
    crown:"Covers the whole crown view.",
    veneer:"Covers the visible front shell."
  };
  return help[id]||(TREATMENTS[id]?.mode==="surface"?"Colors the selected surface only.":TREATMENTS[id]?.mode==="root"?"Uses the root view only.":"Applies to the whole tooth.");
}
function treatmentIconHTML(id){
  const treatment=TREATMENTS[id];return treatmentIconMarkup(treatment?.icon||defaultTreatmentIcon(id),COLORS[id]||"#3b82f6")
}
function treatmentIconMarkup(icon,color){if(icon==="canal")return`<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true"><path d="M9 4 C6 8 6 20 9 24" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/><path d="M19 4 C22 8 22 20 19 24" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/></svg>`;if(icon==="crown")return`<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true"><path d="M6 8 C6 4 10 3 14 3 C18 3 22 4 22 8 L20 22 L8 22 Z" fill="${color}"/><path d="M10 8 L10 21 M14 7 L14 22 M18 8 L18 21" stroke="rgba(255,255,255,.45)"/></svg>`;if(icon==="veneer")return`<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true"><path d="M8 4 C8 3 10 3 14 3 C18 3 20 3 20 4 L18 24 C17 25 11 25 10 24 Z" fill="${color}"/></svg>`;if(icon==="implant")return`<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true"><path d="M14 4 L18 8 L18 20 L14 24 L10 20 L10 8 Z" fill="${color}"/><path d="M11 10 L17 10 M11 14 L17 14 M11 18 L17 18" stroke="rgba(255,255,255,.5)" stroke-width="1.2"/></svg>`;if(icon==="cross")return`<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true"><path d="M7 7 L21 21 M21 7 L7 21" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/></svg>`;if(icon==="seal")return`<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true"><path d="M8 14 C10 11 18 11 20 14" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/></svg>`;if(icon==="circle")return`<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true"><circle cx="14" cy="14" r="6" fill="${color}"/><circle cx="12" cy="12" r="2" fill="rgba(255,255,255,.2)"/></svg>`;if(icon==="bolt")return`<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true"><path d="M15 4 L11 12 L15 12 L12 24 L18 14 L14 14 Z" fill="${color}"/></svg>`;return`<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true"><rect x="6" y="6" width="16" height="16" rx="4" fill="${color}"/></svg>`}
function entriesForTooth(n){return activeState()[n].entries}
function entryLayer(entry){return entry.layer||(entry.status==="planned"?"planned":"existing")}
function entriesByStatus(n,s,layer=null){return entriesForTooth(n).filter(e=>e.status===s&&(layer===null||entryLayer(e)===layer))}
function latestWhole(n,s,layer=null){const m=entriesByStatus(n,s,layer).filter(e=>treatmentFor(e.treatment).mode==="whole"); return m.length?m[m.length-1]:null}
function latestRoot(n,s,layer=null){const m=entriesByStatus(n,s,layer).filter(e=>treatmentFor(e.treatment).mode==="root"); return m.length?m[m.length-1]:null}
function latestWatch(n,layer=null){const m=entriesByStatus(n,"watch",layer); return m.length?m[m.length-1]:null}
function reviewBadgeHTML(n,v){if(v!=="front") return ""; return `<div class="review-badge${isUpper(n)?"":" bottom"}">R</div>`}
function surfaceMap(n,v,s,layer=null){const map={}; entriesByStatus(n,s,layer).filter(e=>treatmentFor(e.treatment).mode==="surface").filter(e=>e.view===v).forEach(e=>e.surfaces.forEach(sf=>map[sf]=e.treatment)); return map}
function isVeneer(t){return t==="veneer"}
function hideWholeRing(t){return t==="crown"||t==="implant"||t==="rootCanal"||t==="extraction"}
function selectionSummary(){const viewText=draft.view==="occ"?"Crown view":"Root view"; const surfaceText=draft.surfaces.length?` · ${draft.surfaces.join("/")} surface`:""; return `${viewText}${surfaceText}`}
function flatEntries(){return Object.keys(activeState()).flatMap(key=>activeState()[key].entries.map(entry=>({tooth:Number(key),...entry}))).sort((a,b)=>String(b.id).localeCompare(String(a.id)))}
function statusLabel(status){return STATUSES.find(s=>s.id===status)?.label||status}
function entrySurfaceLabel(entry){const mode=treatmentFor(entry.treatment).mode; if(mode==="surface") return entry.surfaces.join("/"); if(mode==="root") return "Root"; return "Whole tooth"}
function toothTooltipText(n){if(isGhostPrimarySlot(n)) return "Double-click to add this permanent molar"; const items=entriesForTooth(n); if(!items.length) return ""; return items.map(entry=>{const treatment=treatmentFor(entry.treatment); const details=[]; details.push(treatment.label); details.push(statusLabel(entry.status)); if(treatment.mode!=="whole"){details.push(entry.view==="occ"?"Crown":"Root"); details.push(entrySurfaceLabel(entry))} if(entry.note) details.push(`Note: ${entry.note}`); return details.join(" · ")}).join("\n")}
function tooltipOnLeft(n){const order=isUpper(n)?activeUpper():activeLower(); return order.indexOf(n)>=Math.max(0,order.length-4)}
function normalizeDraft(){if(!draft.tooth)return; const avail=Object.entries(TREATMENTS).filter(([,t])=>t.category===draft.category); if(!avail.find(([id])=>id===draft.treatment)) draft.treatment=avail[0][0]; const t=treatmentFor(draft.treatment); if(!t.views.includes(draft.view)) draft.view=t.views[0]; if(t.mode==="surface"){const allowed=new Set(availableSurfaceCodes(draft.tooth,draft.view)); draft.surfaces=draft.surfaces.filter(s=>allowed.has(s)); if(!draft.surfaces.length) draft.surfaces=defaultSurfaceFor(draft.tooth,draft.view)} else draft.surfaces=[]}
function openTooth(n,v,surface=null,preserve=false,statusContext="existing"){editingEntry=null; draft.tooth=n; draft.view=v; draft.layer=statusContext; if(!preserve){draft.category="restoration"; draft.treatment="composite"; draft.status=statusContext; draft.note=""; els.noteInput.value=""} else {draft.status=statusContext} draft.surfaces=surface?[surface]:defaultSurfaceFor(n,v); if(selection.multi){if(!selection.teeth.includes(n)) selection.teeth.push(n)} else selection.teeth=[n]; normalizeDraft(); renderAll()}
function resetDraft(){if(!draft.tooth)return; draft.category="restoration"; draft.treatment="composite"; draft.view="occ"; draft.status="existing"; draft.layer="existing"; draft.surfaces=defaultSurfaceFor(draft.tooth,draft.view); draft.note=""; els.noteInput.value=""; normalizeDraft(); renderAll()}
function clearCurrentTooth(){const targets=selection.multi&&selection.teeth.length?selection.teeth:(draft.tooth?[draft.tooth]:[]); if(!targets.length)return; targets.forEach(n=>activeState()[n].entries=[]); draft.note=""; els.noteInput.value=""; renderAll()}
function refreshChart(){window.location.reload()}
function saveDraft(){const targets=selection.multi&&selection.teeth.length?selection.teeth:(draft.tooth?[draft.tooth]:[]); if(!targets.length)return; normalizeDraft(); targets.forEach(n=>{const entry={id:editingEntry&&editingEntry.tooth===n?editingEntry.id:uid(),tooth:n,treatment:draft.treatment,category:draft.category,status:draft.status,layer:draft.status==="watch"?draft.layer:(draft.status==="planned"?"planned":"existing"),view:draft.view,surfaces:[...draft.surfaces],note:draft.note.trim()}; const entries=activeState()[n].entries,index=editingEntry&&editingEntry.tooth===n?entries.findIndex(item=>item.id===editingEntry.id):-1; if(index>=0)entries[index]=entry; else entries.push(entry)}); editingEntry=null; selection.multi=false; selection.teeth=[]; draft.tooth=null; draft.category="restoration"; draft.treatment="composite"; draft.view="occ"; draft.status="existing"; draft.layer="existing"; draft.surfaces=[]; draft.note=""; els.noteInput.value=""; renderAll()}
function downloadPdf(){window.print()}
function pickCategory(c){draft.category=c; normalizeDraft(); renderAll()}
function pickView(v){draft.view=v; normalizeDraft(); renderAll()}
function pickTreatment(t){draft.treatment=t; draft.category=treatmentFor(t).category; normalizeDraft(); renderAll()}
function pickStatus(s){draft.status=s; if(s==="existing"||s==="planned") draft.layer=s; renderSidebar()}
function toggleSurface(s){const set=new Set(draft.surfaces); if(set.has(s)) set.delete(s); else set.add(s); draft.surfaces=[...set]; if(!draft.surfaces.length) draft.surfaces=[s]; renderAll()}
function toggleMultiMode(){selection.multi=!selection.multi; selection.teeth=draft.tooth?[draft.tooth]:[]; renderAll()}
function isMobileToothModalViewport(){return window.matchMedia("(max-width: 600px)").matches}
function closeMobileToothModal(){
  mobileToothModalOpen=false;
  mobileToothEls.modal.classList.remove("show");
  mobileToothEls.modal.setAttribute("aria-hidden","true");
  if(draft.tooth&&isGhostPrimarySlot(draft.tooth)){
    selection.teeth=selection.teeth.filter(tooth=>tooth!==draft.tooth);
    draft.tooth=null;
    draft.surfaces=[];
    draft.note="";
    els.noteInput.value="";
    renderAll();
  }
}
function finishMobileToothSelection(){
  const canChart=Boolean(draft.tooth)&&!isGhostPrimarySlot(draft.tooth);
  closeMobileToothModal();
  if(canChart)openMobileEntryWizard();
}
function openMobileEntryWizard(){
  if(!isMobileToothModalViewport()||!draft.tooth||isGhostPrimarySlot(draft.tooth))return;
  closeMobileToothModal();
  mobileEntryOpen=true;
  // mobileEntryStep=1;
  mobileEntryStep=2;
  mobileEntryEls.content.appendChild(els.editor);
  renderMobileEntryWizard();
}
function closeMobileEntryWizard(){
  mobileEntryOpen=false;
  mobileEntryEls.modal.classList.remove("show");
  mobileEntryEls.modal.setAttribute("aria-hidden","true");
  if(els.editor.parentElement!==editorHome)editorHome.appendChild(els.editor);
}
function setMobileEntryStep(step){
  // mobileEntryStep=Math.max(1,Math.min(4,step));
  mobileEntryStep=Math.max(2,Math.min(4,step));
  renderMobileEntryWizard();
  mobileEntryEls.content.scrollTop=0;
}
function completeMobileEntryWizard(){
  if(!draft.tooth)return;
  closeMobileEntryWizard();
  saveDraft();
}
function renderMobileEntryWizard(){
  const hasTooth=Boolean(draft.tooth)&&!isGhostPrimarySlot(draft.tooth);
  mobileEntryEls.trigger.disabled=!hasTooth;
  mobileEntryEls.hint.textContent=hasTooth?`Tooth ${draft.tooth} selected. Tap to add its entry.`:"Tap a tooth, then add its chart entry.";
  const shouldShow=mobileEntryOpen&&isMobileToothModalViewport()&&hasTooth;
  mobileEntryEls.modal.classList.toggle("show",shouldShow);
  mobileEntryEls.modal.setAttribute("aria-hidden",shouldShow?"false":"true");
  if(!shouldShow){if(mobileEntryOpen&&!hasTooth)closeMobileEntryWizard();return}
  if(els.editor.parentElement!==mobileEntryEls.content)mobileEntryEls.content.appendChild(els.editor);
  const titles=["Chart type","View & surface","Treatment","Status & note"];
  mobileEntryEls.content.dataset.step=String(mobileEntryStep);
  mobileEntryEls.title.textContent=titles[mobileEntryStep-1];
  // mobileEntryEls.progress.querySelectorAll("[data-entry-stage]").forEach(stage=>{const number=Number(stage.dataset.entryStage);stage.classList.toggle("current",number===mobileEntryStep);stage.classList.toggle("complete",number<mobileEntryStep);stage.querySelector("span").textContent=number<mobileEntryStep?"✓":number});
  mobileEntryEls.progress
  .querySelectorAll("[data-entry-stage]")
  .forEach(stage => {
    const number = Number(stage.dataset.entryStage);
    const displayNumber = number - 1;

    stage.classList.toggle(
      "current",
      number === mobileEntryStep
    );

    stage.classList.toggle(
      "complete",
      number < mobileEntryStep
    );

    stage.querySelector("span").textContent =
      number < mobileEntryStep ? "✓" : displayNumber;
  });
  // mobileEntryEls.back.disabled=mobileEntryStep===1;
  mobileEntryEls.back.disabled=mobileEntryStep===2;
  mobileEntryEls.next.hidden=mobileEntryStep===4;
  mobileEntryEls.done.hidden=mobileEntryStep!==4;
}
function setSplitChartView(view){
  if(!["existing","planned"].includes(view)||view===splitChartView)return;
  splitChartView=view;
  closeMobileToothModal();
  closeMobileEntryWizard();
  renderSplitChartView();
}
function renderSplitChartView(){
  els.splitStage.querySelectorAll("[data-chart-layer]").forEach(group=>group.classList.toggle("view-hidden",group.dataset.chartLayer!==splitChartView));
  els.chartViewToggle.querySelectorAll("[data-chart-view]").forEach(btn=>{
    const active=btn.dataset.chartView===splitChartView;
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-pressed",String(active));
  });
}
function mobileToothNeighbors(n){
  const available=list=>list.filter(tooth=>tooth&&(!isGhostPrimarySlot(tooth)||tooth===n));
  const upper=available(activeUpperDisplay()),lower=available(activeLowerDisplay());
  const arch=upper.includes(n)?upper:lower;
  const index=arch.indexOf(n);
  return {previous:index>0?arch[index-1]:null,next:index>=0&&index<arch.length-1?arch[index+1]:null};
}
function toggleMobileOptionalMolar(){
  const n=draft.tooth;
  if(chartMode!=="primary"||!isPrimaryOptionalMolar(n))return;
  if(primaryOptionalActive.has(n)){
    const existingEntries=entriesForTooth(n);
    if(existingEntries.length&&!window.confirm(`Deactivate permanent molar ${n}?\nSaved entries stay recorded.`))return;
    primaryOptionalActive.delete(n);
    selection.teeth=selection.teeth.filter(tooth=>tooth!==n);
    draft.surfaces=[];
  }else{
    primaryOptionalActive.add(n);
    selection.teeth=[n];
    draft.view="occ";
    draft.surfaces=defaultSurfaceFor(n,"occ");
    normalizeDraft();
  }
  mobileToothModalOpen=true;
  renderAll();
}
function navigateMobileTooth(direction){
  if(!draft.tooth)return;
  const neighbors=mobileToothNeighbors(draft.tooth),next=direction<0?neighbors.previous:neighbors.next;
  if(!next)return;
  mobileToothModalOpen=true;
  openTooth(next,draft.view,null,false,draft.layer);
}
function renderMobileToothModal(){
  const shouldShow=mobileToothModalOpen&&isMobileToothModalViewport()&&Boolean(draft.tooth);
  mobileToothEls.modal.classList.toggle("show",shouldShow);
  mobileToothEls.modal.setAttribute("aria-hidden",shouldShow?"false":"true");
  if(!shouldShow)return;
  mobileToothEls.title.textContent=`Tooth ${draft.tooth}`;
  mobileToothEls.name.textContent=currentToothName(draft.tooth);
  mobileToothEls.root.replaceChildren(buildToothElement(draft.tooth,"front",draft.layer));
  mobileToothEls.crown.replaceChildren(buildToothElement(draft.tooth,"occ",draft.layer));
  const optionalMolar=chartMode==="primary"&&isPrimaryOptionalMolar(draft.tooth);
  const optionalMolarActive=optionalMolar&&primaryOptionalActive.has(draft.tooth);
  mobileToothEls.optionalMolar.hidden=!optionalMolar;
  mobileToothEls.optionalMolar.classList.toggle("activate",optionalMolar&&!optionalMolarActive);
  mobileToothEls.optionalMolar.textContent=optionalMolar?(optionalMolarActive?"Deactivate permanent molar":"Activate permanent molar"):"";
  const neighbors=mobileToothNeighbors(draft.tooth);
  mobileToothEls.prev.disabled=!neighbors.previous;
  mobileToothEls.next.disabled=!neighbors.next;
  mobileToothEls.prevNumber.textContent=neighbors.previous?`Tooth ${neighbors.previous}`:"Start";
  mobileToothEls.nextNumber.textContent=neighbors.next?`Tooth ${neighbors.next}`:"End";
  mobileToothEls.prev.setAttribute("aria-label",neighbors.previous?`Select tooth ${neighbors.previous}, to the left`:`No tooth to the left`);
  mobileToothEls.next.setAttribute("aria-label",neighbors.next?`Select tooth ${neighbors.next}, to the right`:`No tooth to the right`);
  const viewLabel=draft.view==="occ"?"Crown":"Root";
  const surfaceLabel=draft.surfaces.length?draft.surfaces.join(" / "):"whole tooth";
  mobileToothEls.selection.textContent=optionalMolar&&!optionalMolarActive?"This permanent molar is inactive.":`Current selection: ${viewLabel} view · ${surfaceLabel}`;
}
function handleToothClick(n,v,statusContext="existing"){if(!selection.multi){if(isMobileToothModalViewport())mobileToothModalOpen=true;openTooth(n,v,null,false,statusContext); return} if(selection.teeth.includes(n)){selection.teeth=selection.teeth.filter(i=>i!==n); if(draft.tooth===n){draft.tooth=selection.teeth.length?selection.teeth[selection.teeth.length-1]:null} renderAll(); return} openTooth(n,v,null,selection.teeth.length>0,statusContext)}
function openEntry(tooth,id){const entry=activeState()[tooth].entries.find(item=>item.id===id); if(!entry)return; editingEntry={tooth,id}; if(chartMode==="primary"&&isPrimaryOptionalMolar(tooth)) primaryOptionalActive.add(tooth); selection.multi=false; selection.teeth=[tooth]; draft.tooth=tooth; draft.category=entry.category; draft.treatment=entry.treatment; draft.view=entry.view; draft.status=entry.status; draft.layer=entryLayer(entry); draft.surfaces=[...entry.surfaces]; draft.note=entry.note||""; els.noteInput.value=draft.note; normalizeDraft(); renderAll(); if(isMobileToothModalViewport())openMobileEntryWizard()}
function removeEntry(tooth,id){
  const toothState=activeState()[tooth];
  if(!toothState)return;
  toothState.entries=toothState.entries.filter(entry=>entry.id!==id);
  if(draft.tooth===tooth){selection.multi=false;selection.teeth=[];draft.tooth=null;draft.surfaces=[];draft.note="";els.noteInput.value=""}
  renderAll();
}
function rctGeometry(n){
  const t=toothType(n),u=isUpper(n);
  let lefts=["42%","58%"],top=u?"68%":"56%",height=t==="canine"?"38%":(t==="incisor"?"34%":"32%");
  if(t==="molar"||t==="wisdom"){
    lefts=["32%","68%"];
    top=u?"69%":"61%";
    height=u?"24%":"30%";
  } else if(t==="premolar"){
    lefts=["38%","62%"];
    top=u?"66%":"59%";
    height=u?"26%":"31%";
  } else if(t==="canine"){
    top=u?"57%":"55%";
    height=u?"32%":"36%";
  } else {
    top=u?"66%":"54%";
    height=u?"26%":"32%";
  }
  return{lefts,top,height}
}
function rctOverlayHTML(n){const g=rctGeometry(n); return `<div class="rct-lines">${g.lefts.map(left=>`<span style="left:calc(${left} - 1.2px);top:${g.top};height:${g.height}"></span>`).join("")}</div>`}
function surfaceClipPath(n,v){
  const photoKey=`${chartMode}:${n}:${v}`;
  if(hasPhotoTooth(n)&&typeof TOOTH_SILHOUETTES!=="undefined"&&TOOTH_SILHOUETTES[photoKey]) return `<path d="${TOOTH_SILHOUETTES[photoKey]}"></path>`;
  const t=toothType(n);
  if(chartMode==="permanent"&&n===16){if(v==="occ")return`<path d="M1,9 C3,3 10,0 20,1 C29,-1 43,1 49,7 C54,13 53,29 49,34 C44,40 35,40 27,40 C17,41 7,39 3,34 C0,29 -1,16 1,9 Z"></path>`;return`<path d="M3,5 C8,0 16,0 21,3 C25,0 34,0 39,3 C45,0 52,2 54,7 L54,45 C52,53 45,57 39,53 C34,58 23,58 16,53 C9,57 4,52 2,45 Z"></path>`}
  if(v==="front"){
    const u=isUpper(n), c=n%10===1;
    if(n===18) return `<path d="M8,34 C5,28 4,20 5,12 C6,5 11,1 18,0 C20,4 21,11 21,18 C21,11 24,4 28,0 C34,1 38,5 39,12 C40,21 38,29 34,34 C31,39 11,39 8,34 Z"></path><path d="M9,39 C8,49 8,57 9,63 C10,69 12,73 15,74 C17,74 18,72 18,68 C18,60 17,50 16,39 Z"></path><path d="M18,39 C17,49 17,57 18,64 C19,70 20,73 21,74 C22,73 23,70 24,64 C25,57 25,49 24,39 Z"></path><path d="M26,39 C25,50 24,60 24,68 C24,72 25,74 27,74 C30,73 32,69 33,63 C34,57 34,49 33,39 Z"></path>`;
    if(u){
      if(t==="molar"||t==="wisdom"){const w=t==="wisdom"?52:56,m=w/2;return `<path d="M6,62 C3,56 2,46 2,35 C2,19 8,7 14,0 C18,0 21,4 23,10 C25,4 29,0 33,0 C39,7 45,19 45,35 C45,46 44,56 41,62 C37,69 15,69 6,62 Z"></path><path d="M9,68 C7,79 7,89 8,96 C9,100 13,102 16,102 L20,102 C22,102 23,99 23,94 C22,86 21,77 20,68 Z"></path><path d="M${m-5},68 C${m-6},79 ${m-7},89 ${m-6},97 C${m-5},100 ${m-2},102 ${m},102 C${m+2},102 ${m+5},100 ${m+6},97 C${m+7},89 ${m+6},79 ${m+5},68 Z"></path><path d="M${w-9},68 C${w-7},79 ${w-7},89 ${w-8},96 C${w-9},100 ${w-13},102 ${w-16},102 L${w-20},102 C${w-22},102 ${w-23},99 ${w-23},94 C${w-22},86 ${w-21},77 ${w-20},68 Z"></path>`}
      if(t==="premolar") return `<path d="M8,58 C5,53 4,45 4,36 C4,22 9,8 14,0 C18,0 22,0 26,0 C31,8 36,22 36,36 C36,45 35,53 32,58 C29,62 11,62 8,58 Z"></path><path d="M10,60 C8,71 8,81 9,88 C10,93 13,96 16,98 L20,98 C22,98 23,93 22,88 C21,79 20,69 19,60 Z"></path><path d="M22,60 C21,70 21,79 22,85 C23,91 26,95 29,95 L33,95 C35,95 36,91 35,85 C34,79 33,70 31,60 Z"></path>`;
      if(t==="canine") return `<path d="M16,54 C9,52 6,44 5,36 C4,26 7,12 13,3 C14,1 15,0 16,0 C17,0 18,1 19,3 C25,12 28,26 27,36 C26,44 23,52 16,54 Z"></path><path d="M8,52 C6,64 5,79 6,90 C7,99 11,105 16,108 C21,105 25,99 26,90 C27,79 26,64 24,52 C21,44 19,38 16,30 C13,38 11,44 8,52 Z"></path>`;
      const w=c?40:36,x=w/2,cw=c?16:14,rw=c?7:6; return `<path d="M${x-cw},48 C${x-cw-1},35 ${x-cw+2},17 ${x-10},7 C${x-6},2 ${x-1},0 ${x},0 C${x+1},0 ${x+6},2 ${x+10},7 C${x+cw-2},17 ${x+cw+1},35 ${x+cw},48 C${x+cw-1},61 ${x+9},67 ${x},70 C${x-9},67 ${x-cw+1},61 ${x-cw},48 Z"></path><path d="M${x-rw},68 C${x-rw-1},56 ${x-rw},42 ${x-rw+1},28 C${x-rw+2},18 ${x-rw+3},8 ${x},0 C${x+rw-3},8 ${x+rw-2},18 ${x+rw-1},28 C${x+rw},42 ${x+rw+1},56 ${x+rw},68 C${x+rw-1},82 ${x+4},93 ${x},100 C${x-4},93 ${x-rw+1},82 ${x-rw},68 Z"></path>`;
    }
    if(t==="molar"||t==="wisdom"){const w=t==="wisdom"?48:52,m=w/2;return `<path d="M6,4 C3,9 2,20 2,30 C2,40 4,50 8,58 C12,65 16,67 ${m},68 C${w-16},67 ${w-12},65 ${w-8},58 C${w-4},50 ${w-2},40 ${w-2},30 C${w-2},20 ${w-3},9 ${w-6},4 C${w-10},1 ${w-14},0 ${m},0 C14,0 10,1 6,4 Z"></path><path d="M8,66 C6,79 6,89 7,97 C8,102 12,106 16,106 L20,106 C22,106 23,102 23,97 C22,89 21,79 20,66 Z"></path><path d="M${w-8},66 C${w-6},79 ${w-6},89 ${w-7},97 C${w-8},102 ${w-12},106 ${w-16},106 L${w-20},106 C${w-22},106 ${w-23},102 ${w-23},97 C${w-22},89 ${w-21},79 ${w-20},66 Z"></path>`}
    if(t==="premolar") return `<path d="M8,4 C6,9 4,18 4,26 C4,36 6,45 10,53 C12,58 15,60 18,61 C21,60 24,58 26,53 C30,45 32,36 32,26 C32,18 30,9 28,4 C25,1 22,0 18,0 C14,0 11,1 8,4 Z"></path><path d="M13,59 C11,71 11,81 12,89 C13,94 15,96 18,96 C21,96 23,94 24,89 C25,81 25,71 23,59 Z"></path>`;
    if(t==="canine") return `<path d="M16,4 C12,7 9,14 8,22 C7,30 8,39 11,47 C12,52 14,56 16,59 C18,56 20,52 21,47 C24,39 25,30 24,22 C23,14 20,7 16,4 Z"></path><path d="M11,57 C9,71 9,84 10,95 C11,102 13,107 16,110 C19,107 21,102 22,95 C23,84 23,71 21,57 Z"></path>`;
    const w=c?28:30,x=w/2,cw=c?10:11,rw=c?5:6; return `<path d="M${x-cw},4 C${x-cw-1},12 ${x-cw},22 ${x-cw+2},32 C${x-cw+4},45 ${x-5},56 ${x},59 C${x+5},56 ${x+cw-4},45 ${x+cw-2},32 C${x+cw},22 ${x+cw+1},12 ${x+cw},4 C${x+cw-2},1 ${x+5},0 ${x},0 C${x-5},0 ${x-cw+2},1 ${x-cw},4 Z"></path><path d="M${x-rw},57 C${x-rw-1},71 ${x-rw-1},84 ${x-rw+1},93 C${x-rw+2},98 ${x-2},102 ${x},102 C${x+2},102 ${x+rw-2},98 ${x+rw-1},93 C${x+rw+1},84 ${x+rw+1},71 ${x+rw},57 Z"></path>`;
  }
  const {width:w,height:h}=crownDims(n);
  if(t==="molar"||t==="wisdom"){const x=w/2,y=h/2; return `<path d="M6,${y} C6,12 13,4 ${x},4 C${w-13},4 ${w-6},12 ${w-6},${y} C${w-6},${h-8} ${w-13},${h-4} ${x},${h-4} C13,${h-4} 6,${h-8} 6,${y} Z"></path>`}
  if(t==="premolar") return `<path d="M17,4 C8,4 4,10 4,17 C4,25 8,30 17,30 C26,30 30,25 30,17 C30,10 26,4 17,4 Z"></path>`;
  if(t==="canine") return `<path d="M13,2 C8,4 5,10 5,16 C5,23 8,26 13,26 C18,26 21,23 21,16 C21,10 18,4 13,2 Z"></path>`;
  return `<path d="M2,${h/2} C3,4 ${w*.3},2 ${w*.7},2 C${w-3},4 ${w-2},${h-4} ${w-2},${h/2} C${w-3},${h-4} ${w*.7},${h-2} ${w*.3},${h-2} C3,${h-4} 2,${h-4} 2,${h/2} Z"></path>`;
}
function veneerClipPath(n,v){
  const t=toothType(n);
  if(v==="front"){
    const w=toothW(n),cut=crownCutY(n);
    if(t==="incisor"||t==="canine") return `<path d="M4,4 C6,18 8,34 10,${cut-4} L${w*.28},${cut} L${w*.72},${cut} L${w-10},${cut-4} C${w-8},34 ${w-6},18 ${w-4},4 Z"></path>`;
    return `<path d="M4,4 C5,18 6,30 8,${cut-4} L${w*.24},${cut} L${w*.76},${cut} L${w-8},${cut-4} C${w-6},30 ${w-5},18 ${w-4},4 L${w*.7},4 L${w*.3},4 Z"></path>`;
  }
  return surfaceClipPath(n,"occ");
}
let plannedPatternSerial=0;
function plannedPatternDef(treatment){
  const id=`planned-hatch-${treatment}-${plannedPatternSerial++}`;
  const color=COLORS[treatment]||"#64748b";
  const background=lighten(color,18);
  const hatch=darken(color,24);
  return {id,markup:`<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${background}"></rect><path d="M-1 1 L1 -1 M0 6 L6 0 M5 7 L7 5" fill="none" stroke="${hatch}" stroke-width="1.45" stroke-opacity=".82"></path></pattern>`};
}
function wholeOverlaySVG(n,v,treatment,status){
  if(!isVeneer(treatment)) return "";
  if(status==="planned"){
    const pattern=plannedPatternDef(treatment);
    const dims=v==="front"?{width:toothW(n),height:toothH(n)}:crownDims(n);
    const paths=veneerClipPath(n,v).replace(/<path /g,`<path fill="url(#${pattern.id})" stroke="none" `);
    return `<svg class="surface-svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}"><defs>${pattern.markup}</defs>${paths}</svg>`;
  }
  const fill=lighten(COLORS[treatment],18);
  const opacity=status==="preview"?"0.34":"0.58";
  const dims=v==="front"?{width:toothW(n),height:toothH(n)}:crownDims(n);
  const paths=veneerClipPath(n,v).replace(/<path /g, `<path fill="${fill}" fill-opacity="${opacity}" `);
  return `<svg class="surface-svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">${paths}</svg>`;
}
function wholeStatusOverlaySVG(n,v,treatment,status){
  const dims=v==="front"?{width:toothW(n),height:toothH(n)}:crownDims(n);
  if(status==="planned"){
    const pattern=plannedPatternDef(treatment);
    const paths=surfaceClipPath(n,v).replace(/<path /g,`<path fill="url(#${pattern.id})" stroke="none" `);
    return `<svg class="surface-svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}"><defs>${pattern.markup}</defs>${paths}</svg>`;
  }
  const fill=lighten(COLORS[treatment],18);
  const stroke=darken(COLORS[treatment],14);
  const paths=surfaceClipPath(n,v).replace(/<path /g,`<path fill="${fill}" fill-opacity="0.24" stroke="${stroke}" stroke-width="1.45" `);
  return `<svg class="surface-svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">${paths}</svg>`;
}
function renderSurfaceOverlay(n,v,{complete={},planned={},review={},selected=new Set(),previewColor=null,preview=false,clipKey="chart"}={}){
  const dims=v==="front"?{width:toothW(n),height:toothH(n)}:crownDims(n);
  const crownMode=v==="occ";
  const clipId=`clip-${clipKey}-${n}-${v}-${preview?"preview":"saved"}`;
  const plannedPatterns=new Map([...new Set(Object.values(planned))].map(treatment=>[treatment,plannedPatternDef(treatment)]));
  const patternMarkup=[...plannedPatterns.values()].map(pattern=>pattern.markup).join("");
  return `<svg class="surface-svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}"><defs><clipPath id="${clipId}">${surfaceClipPath(n,v)}</clipPath>${patternMarkup}</defs><g clip-path="url(#${clipId})">${surfaceDefs(n,v).map(def=>{
    const ct=complete[def.key];
    const pt=planned[def.key];
    const rt=review[def.key];
    const isSel=selected.has(def.key);
    const color=ct?lighten(COLORS[ct],18):(pt?lighten(COLORS[pt],18):(rt?lighten(COLORS[rt],18):(preview&&isSel?lighten(previewColor,18):null)));
    const fill=pt?`url(#${plannedPatterns.get(pt).id})`:(color||"transparent");
    const fillOpacity=pt?"1":(ct?(crownMode?"0.95":"0.88"):(rt?(crownMode?"0.26":"0.22"):(preview&&isSel?(crownMode?"0.52":"0.4"):"0")));
    const idleStroke=chartMode==="permanent"?"transparent":"rgba(255,255,255,.14)";
    // Keep the outline only for the surface currently being edited. Saved
    // and preview overlays are intentionally fill-only.
    const stroke=isSel?"#8fc9ff":(ct||pt||rt?"transparent":idleStroke);
    const strokeWidth=isSel?"2.5":"0";
    const cls=`surface-region${isSel?" selected":""}`;
    const crownMark=""; /* Inner surface status circles intentionally hidden; the tooth/status outline remains. */ /* crownMode?(ct
      ?`<circle cx="${def.cx}" cy="${def.cy}" r="4.2" fill="${lighten(COLORS[ct],18)}" stroke="${darken(COLORS[ct],34)}" stroke-width="1"></circle>`
      :(pt
        ?`<circle cx="${def.cx}" cy="${def.cy}" r="4.7" fill="${lighten(COLORS[pt],18)}" fill-opacity=".3" stroke="${darken(COLORS[pt],8)}" stroke-width="1.6" stroke-dasharray="3 2"></circle>`
        :(rt
          ?`<circle cx="${def.cx}" cy="${def.cy}" r="4.5" fill="${lighten(COLORS[rt],18)}" fill-opacity=".26" stroke="${darken(COLORS[rt],12)}" stroke-width="1.25"></circle>`
          :(preview&&isSel
          ?`<circle cx="${def.cx}" cy="${def.cy}" r="3.6" fill="${lighten(previewColor,18)}" stroke="rgba(255,255,255,0.9)" stroke-width="0.9"></circle>`
          :""))))
      :""; */
    return `<path class="${cls}" data-surface="${def.key}" d="${def.path}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${strokeWidth}"></path>${crownMark}`;
  }).join("")}</g></svg>`;
}
function surfaceOverlaySVG(n,v,preview=false){
  const complete=preview?{}:surfaceMap(n,v,"existing");
  const planned=preview?{}:surfaceMap(n,v,"planned");
  const review=preview?{}:surfaceMap(n,v,"watch");
  const selected=preview?new Set(draft.surfaces):(draft.tooth===n&&draft.view===v?new Set(draft.surfaces):new Set());
  const previewColor=preview?COLORS[draft.treatment]:null;
  return renderSurfaceOverlay(n,v,{complete,planned,review,selected,previewColor,preview,clipKey:preview?"draft":"chart"});
}
function buildToothElement(n,v,layer="combined"){const ghost=isGhostPrimarySlot(n),showExisting=layer!=="planned",showPlanned=layer!=="existing",reviewLayer=layer==="planned"?"planned":(layer==="existing"?"existing":null),wholeExisting=showExisting?latestWhole(n,"existing"):null,wholePlanned=showPlanned?latestWhole(n,"planned"):null,wholeReview=latestWhole(n,"watch",reviewLayer),rootExisting=showExisting?latestRoot(n,"existing"):null,rootPlanned=showPlanned?latestRoot(n,"planned"):null,rootReview=latestRoot(n,"watch",reviewLayer),watch=latestWatch(n,reviewLayer),missing=wholeExisting&&wholeExisting.treatment==="missing",selected=!ghost&&!selection.multi&&draft.tooth===n,statusContext=layer==="planned"?"planned":"existing"; const holder=document.createElement("div"); holder.className=`tooth${selected?" active":""}${ghost?" ghost":""}`; const tooltip=toothTooltipText(n); if(tooltip){holder.classList.add("has-tooltip"); holder.dataset.tooltip=tooltip; if(tooltipOnLeft(n)) holder.classList.add("tooltip-left")} const art=document.createElement("div"); art.className="tooth-art"; const core=document.createElement("div"); core.className=`art-core ${v==="front"?`front ${isUpper(n)?"upper":"lower"}`:"occ"}`; if(missing&&layer!=="planned"){core.innerHTML=missingSVG(n,v)} else {const split=layer!=="combined"; const baseWhole=!split&&wholeExisting&&!isVeneer(wholeExisting.treatment)?wholeExisting:null; const fill=split?"#F5F2EC":(baseWhole?COLORS[baseWhole.treatment]:"#F5F2EC"); const baseSVG=v==="front"?toothSVG(n,fill):crownOnlySVG(n,fill); core.innerHTML=baseSVG; if(!ghost){if(split&&wholeExisting&&!isVeneer(wholeExisting.treatment)) core.insertAdjacentHTML("beforeend",wholeStatusOverlaySVG(n,v,wholeExisting.treatment,"existing")); if(wholeExisting&&isVeneer(wholeExisting.treatment)) core.insertAdjacentHTML("beforeend",wholeOverlaySVG(n,v,wholeExisting.treatment,"existing")); if(wholePlanned&&isVeneer(wholePlanned.treatment)) core.insertAdjacentHTML("beforeend",wholeOverlaySVG(n,v,wholePlanned.treatment,"planned")); if(!wholeExisting&&!wholePlanned&&wholeReview&&isVeneer(wholeReview.treatment)) core.insertAdjacentHTML("beforeend",wholeOverlaySVG(n,v,wholeReview.treatment,"watch")); if(selection.multi&&selection.teeth.includes(n)&&isVeneer(draft.treatment)&&layer==="combined") core.insertAdjacentHTML("beforeend",wholeOverlaySVG(n,v,draft.treatment,"preview")); if((split||!wholeExisting)&&wholePlanned&&!isVeneer(wholePlanned.treatment)) core.insertAdjacentHTML("beforeend",wholeStatusOverlaySVG(n,v,wholePlanned.treatment,"planned")); if((split||!wholeExisting&&!wholePlanned)&&wholeReview&&!isVeneer(wholeReview.treatment)) core.insertAdjacentHTML("beforeend",wholeStatusOverlaySVG(n,v,wholeReview.treatment,"watch")); if(layer==="combined") core.insertAdjacentHTML("beforeend",surfaceOverlaySVG(n,v)); else if(layer==="existing") core.insertAdjacentHTML("beforeend",renderSurfaceOverlay(n,v,{complete:surfaceMap(n,v,"existing"),review:surfaceMap(n,v,"watch","existing"),selected:draft.tooth===n&&draft.view===v?new Set(draft.surfaces):new Set(),previewColor:null,preview:false,clipKey:`existing-${n}-${v}`})); else core.insertAdjacentHTML("beforeend",renderSurfaceOverlay(n,v,{planned:surfaceMap(n,v,"planned"),review:surfaceMap(n,v,"watch","planned"),selected:draft.tooth===n&&draft.view===v?new Set(draft.surfaces):new Set(),previewColor:null,preview:false,clipKey:`planned-${n}-${v}`})); if(v==="front"&&((layer==="planned"&&(rootPlanned||rootReview))||(layer==="existing"&&(rootExisting||rootReview))||(layer==="combined"&&(rootExisting||rootReview)))) core.insertAdjacentHTML("beforeend",rctOverlayHTML(n))}} art.appendChild(core); if(layer==="combined"){if(!ghost&&wholeExisting&&!missing&&!isVeneer(wholeExisting.treatment)&&!hideWholeRing(wholeExisting.treatment)) art.insertAdjacentHTML("beforeend",`<div class="status-ring" style="--ring-color:${COLORS[wholeExisting.treatment]}"></div>`); if(!ghost&&((wholePlanned||(rootPlanned&&!wholeExisting))&&!(wholePlanned&&isVeneer(wholePlanned.treatment)))){const t=wholePlanned?wholePlanned.treatment:rootPlanned.treatment; if(!hideWholeRing(t)) art.insertAdjacentHTML("beforeend",`<div class="plan-ring" style="--ring-color:${COLORS[t]}"></div>`)} if(!ghost&&v==="front"&&latestWatch(n,"existing")) art.insertAdjacentHTML("beforeend",reviewBadgeHTML(n,v))} else if(!ghost&&v==="front"&&watch){art.insertAdjacentHTML("beforeend",reviewBadgeHTML(n,v))} holder.appendChild(art); if(ghost){holder.addEventListener("click",e=>{if(!isMobileToothModalViewport())return;e.preventDefault();e.stopPropagation();activatePrimaryOptionalTooth(n)});holder.addEventListener("dblclick",e=>{e.preventDefault(); e.stopPropagation(); activatePrimaryOptionalTooth(n)}); return holder} holder.addEventListener("click",()=>handleToothClick(n,v,statusContext)); if(chartMode==="primary"&&isPrimaryOptionalMolar(n)) holder.addEventListener("dblclick",e=>{e.preventDefault(); e.stopPropagation(); deactivatePrimaryOptionalTooth(n)}); else if(chartMode==="primary"&&swapPrimaryToothNumber(n)) holder.addEventListener("dblclick",e=>{e.preventDefault(); e.stopPropagation(); togglePrimaryTooth(n,v)}); art.querySelectorAll("[data-surface]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openTooth(n,v,el.dataset.surface,selection.multi&&selection.teeth.length>0,statusContext)})); return holder}
function renderNumbersRow(container,list){container.innerHTML=""; list.forEach(n=>{const item=document.createElement("div"); item.className=`number${n===null?" empty":""}${n!==null&&isGhostPrimarySlot(n)?" ghost":""}`; item.textContent=n===null?"":n; container.appendChild(item)})}
function renderToothRow(container,list,view,layer="combined"){container.innerHTML=""; list.forEach(n=>{if(n===null){const spacer=document.createElement("div"); spacer.className="tooth-spacer"; container.appendChild(spacer); return} container.appendChild(buildToothElement(n,view,layer))})}
function renderCombinedChart(){renderToothRow(els.upperFront,activeUpperDisplay(),"front","combined"); renderToothRow(els.upperOcc,activeUpperDisplay(),"occ","combined"); renderNumbersRow(els.upperNumbers,activeUpperDisplay()); renderNumbersRow(els.lowerNumbers,activeLowerDisplay()); renderToothRow(els.lowerOcc,activeLowerDisplay(),"occ","combined"); renderToothRow(els.lowerFront,activeLowerDisplay(),"front","combined")}
function renderSplitChart(){renderNumbersRow(els.splitPlannedUpperNumbers,activeUpperDisplay()); renderToothRow(els.splitPlannedUpperFront,activeUpperDisplay(),"front","planned"); renderToothRow(els.splitPlannedUpperOcc,activeUpperDisplay(),"occ","planned"); renderNumbersRow(els.splitExistingUpperNumbers,activeUpperDisplay()); renderToothRow(els.splitExistingUpperFront,activeUpperDisplay(),"front","existing"); renderToothRow(els.splitExistingUpperOcc,activeUpperDisplay(),"occ","existing"); renderNumbersRow(els.splitExistingLowerNumbers,activeLowerDisplay()); renderToothRow(els.splitExistingLowerOcc,activeLowerDisplay(),"occ","existing"); renderToothRow(els.splitExistingLowerFront,activeLowerDisplay(),"front","existing"); renderNumbersRow(els.splitPlannedLowerNumbers,activeLowerDisplay()); renderToothRow(els.splitPlannedLowerOcc,activeLowerDisplay(),"occ","planned"); renderToothRow(els.splitPlannedLowerFront,activeLowerDisplay(),"front","planned")}
function renderChart(){els.combinedStage.classList.add("hidden"); els.splitStage.classList.remove("hidden"); renderSplitChart(); renderSplitChartView()}
function renderEntryPreview(entry){const treatment=treatmentFor(entry.treatment),icon=treatment.icon||defaultTreatmentIcon(entry.treatment),color=COLORS[entry.treatment]||"#64748b",badge=entry.status==="watch"?'<span class="review-badge summary-review-badge">R</span>':"";return `<span class="summary-treatment-icon">${treatmentIconMarkup(icon,color)}</span>${badge}`}
function renderEntries(){const items=flatEntries(); els.entriesCount.textContent=`${items.length} item${items.length===1?"":"s"}`; els.entriesList.innerHTML=""; if(!items.length){els.entriesList.innerHTML='<div class="entry-empty">No saved chart entries yet.</div>'; return} items.forEach(entry=>{const row=document.createElement("div"); row.className="entry-row"; const open=document.createElement("button"); open.type="button"; open.className="entry-open"; open.innerHTML=`<div class="entry-preview">${renderEntryPreview(entry)}</div><div class="entry-text"><div class="entry-title">Tooth ${entry.tooth} · ${TREATMENTS[entry.treatment].label}</div><div class="entry-meta">${statusLabel(entry.status)} · ${entry.view==="occ"?"Crown":"Root"} · ${entrySurfaceLabel(entry)}</div><div class="entry-note">${entry.note?`Note: ${entry.note}`:"Note: —"}</div></div>`; open.setAttribute("aria-label",`Edit saved entry for tooth ${entry.tooth}`); open.addEventListener("click",()=>openEntry(entry.tooth,entry.id)); const remove=document.createElement("button"); remove.type="button"; remove.className="entry-remove"; remove.innerHTML='<span class="entry-remove-text">Remove</span><svg class="entry-remove-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm3 2v7h2v-7H9Zm4 0v7h2v-7h-2Z" fill="currentColor"/></svg>'; remove.setAttribute("aria-label",`Remove saved entry for tooth ${entry.tooth}`); remove.addEventListener("click",()=>removeEntry(entry.tooth,entry.id)); row.append(open,remove); els.entriesList.appendChild(row)})}
function renderSelectedTeeth(){els.selectedTeeth.innerHTML=""; if(!selection.teeth.length){els.selectedTeeth.innerHTML='<span class="tooth-tag">No teeth selected</span>'; return} selection.teeth.forEach(n=>{const tag=document.createElement("span"); tag.className="tooth-tag"; tag.textContent=n; els.selectedTeeth.appendChild(tag)})}
function renderDentitionSwitch(){els.dentitionSwitch.querySelectorAll("[data-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.mode===chartMode)); els.dentitionHint.textContent=chartMode==="primary"?(isMobileToothModalViewport()?"Hint: Tap a faded permanent 6/7 molar to add it. Use desktop double-click for tooth swapping and removal.":"Hint: Double-click baby teeth to swap with permanent successors. Double-click faded 6/7 slots to add, and double-click active 6/7 molars to hide them."):""}
function renderSidebar(){const has=Boolean(draft.tooth); els.sidebarEmpty.style.display="none"; els.editor.classList.add("show"); els.multiToggleBtn.textContent=`Batch select: ${selection.multi?"On":"Off"}`; renderSelectedTeeth(); els.clearCurrentBtn.disabled=false; els.resetBtn.disabled=!has; els.saveBtn.disabled=!has; els.noteInput.disabled=!has; els.saveBtn.textContent=selection.multi&&selection.teeth.length>1?"Apply to selected":"Done"; if(!has){els.selectedCode.textContent="--"; els.selectedName.textContent=`Select a ${chartMode} tooth to start charting`; els.noteInput.value=""; els.noteInput.placeholder="Select a tooth to add a note"; els.miniPreview.classList.add("empty"); els.miniPreview.innerHTML="🦷"; renderCategoryGrid(true); renderViewGrid(true); renderSurfaceGrid(true); renderTreatmentGrid(true); renderStatusGrid(true); els.previewBox.innerHTML="<strong>Ready</strong><br>Select any tooth or surface on the left to begin."; return} normalizeDraft(); els.selectedCode.textContent=draft.tooth; els.selectedName.textContent=selection.multi&&selection.teeth.length>1?`${currentToothName(draft.tooth)} · ${selection.teeth.length} teeth selected · ${selectionSummary()}`:`${currentToothName(draft.tooth)} · ${selectionSummary()}`; els.noteInput.disabled=false; els.noteInput.placeholder="Optional note for this tooth"; els.noteInput.value=draft.note; renderMiniPreview(); renderCategoryGrid(false); renderViewGrid(false); renderSurfaceGrid(false); renderTreatmentGrid(false); renderStatusGrid(false); renderPreview()}
function renderCategoryGrid(disabled=false){els.categoryGrid.innerHTML=""; CATEGORIES.forEach(c=>{const b=document.createElement("button"); b.className=`chip${draft.category===c.id?" active":""}`; b.type="button"; b.textContent=c.label; b.disabled=disabled; if(!disabled) b.addEventListener("click",()=>pickCategory(c.id)); els.categoryGrid.appendChild(b)})}
function renderViewGrid(disabled=false){const t=treatmentFor(draft.treatment); els.viewGrid.innerHTML=""; [{id:"occ",label:"Crown view"},{id:"front",label:"Root view"}].forEach(v=>{const b=document.createElement("button"); b.className=`chip${draft.view===v.id?" active":""}`; b.type="button"; b.textContent=v.label; const blocked=disabled||!t.views.includes(v.id); b.disabled=blocked; if(!blocked) b.addEventListener("click",()=>pickView(v.id)); if(!t.views.includes(v.id)) b.style.opacity=".38"; els.viewGrid.appendChild(b)}); els.viewNote.textContent=disabled?"Select a tooth first.":(t.mode==="surface"?"Surface treatments color only the selected region.":(t.mode==="root"?"Root canal and root findings use the root view only.":"Whole-tooth treatments cover the whole tooth representation."))}
function renderSurfaceGrid(disabled=false){const t=treatmentFor(draft.treatment),show=!disabled,interactive=!disabled&&t.mode==="surface"; els.surfaceField.style.display=show?"grid":"none"; els.surfaceGrid.innerHTML=""; if(!show){els.surfaceNote.textContent=disabled?"":"";
return} const pad=document.createElement("div"); pad.className=`surface-pad${interactive?"":" inactive"}`; const spec=surfacePadSpec(draft.tooth,draft.view); ["top","left","center","right","bottom"].forEach(area=>{const code=spec[area]; const b=document.createElement("button"); b.className=`surface-chip${code&&draft.surfaces.includes(code)?" active":""}${code?"":" empty"}`; b.type="button"; b.dataset.area=area; if(!code){b.disabled=true; b.textContent=""; pad.appendChild(b); return} b.disabled=!interactive; b.textContent=surfaceShortLabel(code,draft.tooth,draft.view); b.title=surfaceLongLabel(code,draft.tooth,draft.view); if(interactive) b.addEventListener("click",()=>toggleSurface(code)); pad.appendChild(b)}); els.surfaceGrid.appendChild(pad); els.surfaceNote.textContent=interactive?(draft.view==="occ"?"Tap the pad to build combinations like MO, MOD or OL.":"Tap the root pad for mesial, buccal/facial, distal or lingual root areas."):"Surface selection is not used for this treatment, so the pad stays visible but read-only."}
function renderTreatmentGrid(disabled=false){els.treatmentGrid.innerHTML=""; const ordered=CATEGORIES.flatMap(category=>Object.entries(TREATMENTS).filter(([,t])=>t.category===category.id&&t.visible!==false)); ordered.forEach(([id,t])=>{const b=document.createElement("button"); b.className=`chip treatment${draft.treatment===id?" active":""}`; b.type="button"; b.disabled=disabled; b.title=treatmentHelp(id); const icon=document.createElement("span");icon.className="treatment-icon";icon.innerHTML=treatmentIconHTML(id);const text=document.createElement("span");text.className="treatment-text";const name=document.createElement("span");name.className="treatment-name";name.textContent=t.label;const hint=document.createElement("span");hint.className="treatment-hint";hint.textContent=treatmentHint(id);text.append(name,hint);b.append(icon,text); if(!disabled) b.addEventListener("click",()=>pickTreatment(id)); els.treatmentGrid.appendChild(b)})}
function renderStatusGrid(disabled=false){els.statusGrid.innerHTML=""; STATUSES.forEach(s=>{const b=document.createElement("button"); b.className=`chip${draft.status===s.id?" active":""}`; b.type="button"; b.disabled=disabled; b.textContent=s.label; if(!disabled) b.addEventListener("click",()=>pickStatus(s.id)); els.statusGrid.appendChild(b)})}
function miniPreviewTransform(n,view){
  if(view==="occ"){
    const dims=crownDims(n);
    const scale=Math.min(72/dims.width,72/dims.height)*0.98;
    return `translate(-50%,-50%) scale(${scale})`;
  }
  const width=toothW(n),height=toothH(n);
  const scale=Math.min(72/width,88/height)*0.98;
  return `translate(-50%,-50%) scale(${scale},${isUpper(n)?-scale:scale})`;
}
function renderMiniPreview(){els.miniPreview.classList.remove("empty"); const t=treatmentFor(draft.treatment),whole=t.mode==="whole",missing=draft.treatment==="missing"; if(missing){els.miniPreview.innerHTML=missingSVG(draft.tooth,draft.view); return} const baseSVG=draft.view==="front"?toothSVG(draft.tooth,"#F5F2EC"):crownOnlySVG(draft.tooth,"#F5F2EC"); let html=baseSVG; if(whole&&isVeneer(draft.treatment)) html+=wholeOverlaySVG(draft.tooth,draft.view,draft.treatment,draft.status); if(whole&&!isVeneer(draft.treatment)) html+=wholeStatusOverlaySVG(draft.tooth,draft.view,draft.treatment,draft.status==="planned"?"planned":draft.status==="watch"?"watch":"existing"); if(t.mode==="root") html+=rctOverlayHTML(draft.tooth); if(t.mode==="surface"){const map={}; draft.surfaces.forEach(s=>map[s]=draft.treatment); html+=renderSurfaceOverlay(draft.tooth,draft.view,{complete:draft.status==="existing"?map:{},planned:draft.status==="planned"?map:{},review:draft.status==="watch"?map:{},selected:new Set(),previewColor:null,preview:false,clipKey:"draft-mini"})} const modeClass=draft.view==="front"?`front ${isUpper(draft.tooth)?"upper":"lower"}`:"occ"; const badge=draft.status==="watch"?reviewBadgeHTML(draft.tooth,draft.view):""; els.miniPreview.innerHTML=`<div class="mini-art ${modeClass}"><div class="art-core ${modeClass}" style="transform:${miniPreviewTransform(draft.tooth,draft.view)}">${html}</div>${badge}</div>`}
function renderPreview(){const t=treatmentFor(draft.treatment),surfaceText=t.mode==="surface"?draft.surfaces.join(""):(t.mode==="root"?"Root":"Whole tooth"),status=STATUSES.find(i=>i.id===draft.status).label,targetText=selection.multi&&selection.teeth.length>1?`${selection.teeth.length} teeth`: `Tooth ${draft.tooth}`; els.previewBox.innerHTML=`<strong>${t.label}</strong><br>${targetText} · ${draft.view==="occ"?"Crown view":"Root view"} · ${surfaceText}<br>Status: ${status}`}
function renderAll(){syncDateField("dob"); syncDateField("visit"); renderDentitionSwitch(); renderPatientHeader(); renderVisitHeader(); renderPrintSections(); renderChart(); renderEntries(); renderSidebar(); renderMobileToothModal(); renderMobileEntryWizard()}
renderAll();
