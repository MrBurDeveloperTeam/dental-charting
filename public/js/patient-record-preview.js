/* Local sample data only. The chart, editor, saved entries and downloads are
   provided by the unmodified app.js and chart-image-export.js above. */
(() => {
  const icon = (path) => `<svg class="record-review-action-icon" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  const downloadIcon = icon('<path d="M12 3v12m-4-4 4 4 4-4M5 18v3h14v-3"/>');
  const editIcon = icon('<path d="m4 20 4-1L19 8a2.1 2.1 0 0 0-3-3L5 16 4 20ZM14 7l3 3"/>');
  const sampleDates = ['2026-10-09', '2026-09-16'];
  const sampleVisits = new Map();
  const dateLabel = (date) => new Intl.DateTimeFormat('en-MY', {day:'2-digit', month:'short', year:'numeric'}).format(new Date(`${date}T00:00:00`));
  let activeDate = sampleDates[0];
  let editMode = false;
  window.dentalMaterials = { load: async () => dentalMaterials.map(item => ({...item})), save: async rows => { dentalMaterials = rows.map(item => ({...item})); } };
  materialCatalogLoaded = true;
  Object.assign(patient, emptyPatient(), { patientId:'preview-sarah-lim', fullName:'Sarah Lim', idNumber:'PT-00248', gender:'female', dob:'1992-09-16', phone:'+60 12-345 6789', email:'sarah.lim@example.com', preferredDentist:'Dr. Amelia Tan' });
  chartMode = 'permanent';
  const sampleEntry = (id, tooth, treatment, view, surfaces, extra = {}) => ({ id, tooth, treatment, view, surfaces, category:'condition', status:'existing', layer:'existing', note:'', ...extra });
  const currentEntries = [
    sampleEntry('sample-fracture',36,'fracture','front',['B']),
    sampleEntry('sample-spacing-36',36,'spacing','front',[],{bridgeId:'sample-spacing'}),
    sampleEntry('sample-spacing-37',37,'spacing','front',[],{bridgeId:'sample-spacing'}),
    sampleEntry('sample-caries',36,'caries','occ',['O'])
  ];
  sampleVisits.set(sampleDates[0], structuredClone(currentEntries));
  sampleVisits.set(sampleDates[1], structuredClone(currentEntries.filter(entry => entry.treatment === 'spacing')));
  const summary = document.getElementById('record-review-summary-root');
  summary.innerHTML = `<section class="record-review-panel" aria-label="Patient record overview">
    <div class="record-review-toolbar"><button id="preview-back" type="button">← Back to Patient Records</button><div class="record-review-actions"><button class="record-review-chart-download" id="preview-image" type="button">${downloadIcon} Download Chart Image</button><button class="record-review-download" id="preview-pdf" type="button">${icon('<path d="M6 3h8l4 4v14H6zM14 3v5h5M12 11v6m-3-3 3 3 3-3"/>')} Download PDF</button></div></div>
    <div class="preview-patient-card"><div class="preview-patient-identity"><div><div class="preview-patient-name"><h2>Sarah Lim</h2></div><p>Female <span>·</span> 16 Sep 1992 <span>·</span> 34 years</p><div class="preview-contact"><span>+60 12-345 6789</span><span>sarah.lim@example.com</span></div></div></div><div class="preview-patient-meta"><div><small>Preferred dentist</small><strong>Dr. Amelia Tan</strong></div><div><small>Dentition</small><strong>Permanent</strong></div><div><label for="preview-visit">Visit date</label><select id="preview-visit">${sampleDates.map(date => `<option value="${date}">${dateLabel(date)}</option>`).join('')}</select></div></div></div>
    </section>`;
  const list = document.getElementById('preview-record-list');
  list.innerHTML = `<div class="patient-records-heading"><h2>Patient records</h2><p>Local preview · Sample patient</p></div><div class="patient-records-toolbar"><label class="patient-record-search"><input type="search" id="preview-patient-search" placeholder="Search patient name or ID" aria-label="Search patients"></label></div><div class="preview-patient-result"><button type="button" id="preview-open-record"><span class="preview-avatar">SL</span><span><strong>Sarah Lim</strong><small>PT-00248 · Last visit 09 Oct 2026</small></span><span aria-hidden="true">→</span></button><p id="preview-no-results" hidden>No matching patients.</p></div>`;
  document.getElementById('record-edit-chart-root').innerHTML = `<button class="record-edit-chart-button" type="button" id="preview-edit">${editIcon} Edit chart</button>`;
  document.getElementById('chart-edit-mode-root').innerHTML = `<section class="chart-edit-mode-bar"><div class="chart-edit-mode-message"><span></span>Editing chart for <strong>Sarah Lim</strong></div><div class="chart-edit-mode-actions"><span>Local preview · Changes stay in this page</span><button type="button" id="preview-save-chart">✓ Save chart</button></div></section>`;
  const editBar = document.getElementById('chart-edit-mode-root');
  editBar.hidden = true;
  const chartNav = document.getElementById('chart-nav-item');
  const recordNav = document.getElementById('patient-record-nav-item');
  chartNav.onclick = () => { window.location.href = '../preview.html'; };
  recordNav.onclick = showList;
  chartNav.classList.remove('active');
  chartNav.removeAttribute('aria-current');
  recordNav.classList.add('active');
  recordNav.setAttribute('aria-current','page');
  document.getElementById('preview-back').onclick = showList;
  document.getElementById('preview-open-record').onclick = showReview;
  document.getElementById('preview-patient-search').oninput = (event) => {
    const match = 'sarah lim pt-00248'.includes(event.target.value.toLowerCase().trim());
    document.getElementById('preview-open-record').hidden = !match;
    document.getElementById('preview-no-results').hidden = match;
  };
  document.getElementById('preview-image').onclick = () => els.downloadChartImageBtn.click();
  document.getElementById('preview-pdf').onclick = () => els.downloadPdfBtn.click();
  document.getElementById('preview-visit').onchange = (event) => {
    sampleVisits.set(activeDate, structuredClone(flatEntries()));
    activeDate = event.target.value;
    loadVisitFixture();
  };
  document.getElementById('preview-edit').onclick = () => {
    editMode = true;
    document.body.classList.remove('patient-record-review');
    document.body.classList.add('patient-record-edit');
    summary.hidden = true;
    editBar.hidden = false;
    renderAll();
    syncReadOnlyEntries();
  };
  document.getElementById('preview-save-chart').onclick = () => {
    sampleVisits.set(activeDate, structuredClone(flatEntries()));
    showReview();
  };
  function syncReadOnlyEntries() {
    document.querySelectorAll('.entry-open').forEach(button => { button.disabled = !editMode; });
  }
  new MutationObserver(syncReadOnlyEntries).observe(els.entriesList, {childList:true, subtree:true});
  function showList() {
    sampleVisits.set(activeDate, structuredClone(flatEntries()));
    editMode = false;
    editBar.hidden = true;
    summary.hidden = true;
    list.hidden = false;
    document.body.classList.remove('patient-record-review','patient-record-edit');
    document.body.classList.add('patient-records-view');
  }
  function showReview() {
    editMode = false;
    editBar.hidden = true;
    list.hidden = true;
    summary.hidden = false;
    document.body.classList.remove('patient-records-view','patient-record-edit');
    document.body.classList.add('patient-record-review');
    draft.tooth = null;
    selection.teeth = [];
    editingEntry = null;
    renderAll();
    syncReadOnlyEntries();
  }
  function loadVisitFixture() {
    Object.values(state.permanent).forEach(tooth => { tooth.entries = []; });
    sampleVisits.get(activeDate).forEach(entry => state.permanent[entry.tooth].entries.push(structuredClone(entry)));
    visit.date = activeDate;
    showReview();
  }
  document.body.classList.remove('saved-entries-collapsed');
  document.querySelector('.entries-panel').classList.remove('is-collapsed');
  // Preserve the production edit-mode restriction on patient/visit identity.
  [els.patientTrigger, els.dateTrigger, ...els.dentitionSwitch.querySelectorAll('button')].forEach(button => { button.disabled = true; });
  loadVisitFixture();
})();

