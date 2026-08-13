/*
 * supabaseSync.js
 * ---------------------------------------------------------------------
 * Adds cloud sync to the dental charting app, mirroring the same pattern
 * used by the Inventory / Appointment mini apps in the mrbur/Snabbb
 * ecosystem:
 *
 *   browser (this app) --cookie session--> Cloudflare Worker (app.snabbb.com)
 *                                              --service role key--> Supabase
 *
 * This app never talks to Supabase directly and never sees a Supabase key.
 * It authenticates the same way Inventory does: via the shared `mrbur_sso`
 * session cookie (Domain=.snabbb.com), sent automatically on same-site
 * fetch requests when this app is hosted on a *.snabbb.com subdomain (or
 * proxied through the Worker itself).
 *
 * This file is purely additive. It does not modify app.js. It reads/writes
 * the same `patient`, `visit`, `chartMode` and `state` bindings that
 * app.js declares at the top level of the page (they're visible here
 * because classic <script> tags on the same page share one global scope),
 * and it calls app.js's existing `renderAll()` to redraw after a pull.
 *
 * Requires: this <script> tag must load AFTER js/app.js in index.html.
 * ---------------------------------------------------------------------
 */
(function () {
  "use strict";

  /* ================= CONFIG ================= */
  // Base origin of the Cloudflare Worker that proxies Supabase.
  // Override before this script runs with:
  //   <script>window.DENTAL_SYNC_API_BASE = "https://app.snabbb.com";</script>
  const API_BASE = window.DENTAL_SYNC_API_BASE || "https://app.snabbb.com";
  const CHART_ENDPOINT = API_BASE + "/api/dental/chart";
  const PATIENTS_ENDPOINT = API_BASE + "/api/patients";
  const DEBOUNCE_MS = 1000;

  /* ================= STATUS BADGE ================= */
  const badge = document.createElement("div");
  badge.id = "cloud-sync-badge";
  badge.style.cssText =
    "position:fixed;right:14px;bottom:14px;z-index:9999;font:12px/1.4 system-ui,sans-serif;" +
    "padding:6px 12px;border-radius:999px;background:#1f2937;color:#fff;opacity:.92;" +
    "box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;user-select:none;transition:background .2s;";
  badge.title = "Click to sync now";
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(badge));
  if (document.readyState !== "loading") document.body.appendChild(badge);

  function setBadge(text, color) {
    badge.textContent = text;
    badge.style.background = color || "#1f2937";
  }
  setBadge("Cloud: idle", "#4b5563");
  badge.addEventListener("click", () => pushChart(true));

  /* ================= HELPERS ================= */
  function currentPatientId() {
    // patient.patientId is declared by app.js and kept live in memory.
    try {
      return (patient && patient.patientId && patient.patientId.trim()) || "";
    } catch {
      return "";
    }
  }

  function buildChartPayload() {
    return {
      patient_id: currentPatientId(),
      patient: {
        fullName: patient.fullName || "",
        dob: patient.dob || "",
        idNumber: patient.idNumber || "",
        gender: patient.gender || "",
        taxNumber: patient.taxNumber || "",
        phone: patient.phone || "",
        email: patient.email || "",
        emailIsGuardian: Boolean(patient.emailIsGuardian),
        guardianName: patient.guardianName || "",
        guardianRelationship: patient.guardianRelationship || "",
        address: patient.address || "",
        emergencyContactName: patient.emergencyContactName || "",
        emergencyContactPhone: patient.emergencyContactPhone || "",
        allergies: patient.allergies || "",
        medicalConditions: patient.medicalConditions || "",
        medications: patient.medications || "",
        source: patient.source || "",
        preferredDentist: patient.preferredDentist || "",
        insurance: patient.insurance || "",
        notes: patient.notes || "",
      },
      visit_date: (visit && visit.date) || new Date().toISOString().slice(0, 10),
      chart_mode: typeof chartMode !== "undefined" ? chartMode : "permanent",
      chart_data: {
        permanent: state.permanent,
        primary: state.primary,
      },
    };
  }

  function applyServerChart(record) {
    if (!record || !record.chart_data) return;
    if (record.chart_data.permanent) {
      Object.keys(record.chart_data.permanent).forEach((tooth) => {
        state.permanent[tooth] = record.chart_data.permanent[tooth];
      });
    }
    if (record.chart_data.primary) {
      Object.keys(record.chart_data.primary).forEach((tooth) => {
        state.primary[tooth] = record.chart_data.primary[tooth];
      });
    }
    if (record.visit_date && visit) visit.date = record.visit_date;
    if (record.chart_mode) chartMode = record.chart_mode;
    if (typeof renderAll === "function") renderAll();
    if (typeof persistVisit === "function") persistVisit();
  }

  /* ================= EXISTING PATIENTS ================= */
  const patientSearchInput = document.getElementById("patient-search-input");
  const patientSearchBtn = document.getElementById("patient-search-btn");
  const patientSearchResults = document.getElementById("patient-search-results");
  let patientSearchRequest = 0;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizePatient(row) {
    return {
      patientId: row.id || row.patientId || "",
      fullName: row.name || row.fullName || "",
      dob: row.dob || "",
      idNumber: row.idNumber || row.id_number || "",
      gender: row.gender || "",
      taxNumber: row.taxNumber || row.tax_number || "",
      phone: row.phone || "",
      email: row.email || "",
      emailIsGuardian: Boolean(row.emailIsGuardian ?? row.email_is_guardian),
      guardianName: row.guardianName || row.guardian_name || "",
      guardianRelationship: row.guardianRelationship || row.guardian_relationship || "",
      address: row.address || "",
      emergencyContactName: row.emergencyContactName || row.emergency_contact_name || "",
      emergencyContactPhone: row.emergencyContactPhone || row.emergency_contact_phone || "",
      allergies: row.allergies || "",
      medicalConditions: row.medicalConditions || row.medical_conditions || "",
      medications: row.medications || "",
      source: row.source || "",
      preferredDentist: row.preferredDentist || row.preferred_dentist_id || "",
      insurance: row.insurance || "",
      notes: row.notes || "",
    };
  }

  function patientFormPayload() {
    const form = document.getElementById("patient-form");
    if (!form) return null;

    const value = (name) => String(form.elements.namedItem(name)?.value || "").trim();
    const emailIsGuardian = Boolean(form.elements.namedItem("emailIsGuardian")?.checked);

    const preferredDentist = value("preferredDentist");
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return {
      name: value("fullName"),
      phone: value("phone"),
      email: value("email").toLowerCase() || null,
      idNumber: value("idNumber") || null,
      address: value("address") || null,
      dob: value("dob") || null,
      gender: value("gender") || null,
      taxNumber: value("taxNumber") || null,
      emergencyContactName: value("emergencyContactName") || null,
      emergencyContactPhone: value("emergencyContactPhone") || null,
      allergies: value("allergies") || null,
      medicalConditions: value("medicalConditions") || null,
      medications: value("medications") || null,
      source: value("source") || null,
      // This column is a UUID foreign key. Never submit a typed dentist name.
      preferredDentist: uuidPattern.test(preferredDentist) ? preferredDentist : null,
      insurance: value("insurance") || null,
      notes: value("notes") || null,
      emailIsGuardian,
      guardianName: emailIsGuardian ? value("guardianName") || null : null,
      guardianRelationship: emailIsGuardian ? value("guardianRelationship") || null : null,
    };
  }

  async function createNewPatient(event) {
    // Capture this submission before app.js stores a patient without a cloud UUID.
    event.preventDefault();
    event.stopImmediatePropagation();

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    if (typeof commitDateField === "function" && !commitDateField("dob", { emptyOk: true })) {
      document.getElementById("patient-dob-text")?.focus();
      return;
    }
    const payload = patientFormPayload();
    if (!payload) return;

    if (!payload.name || !payload.phone) {
      form.reportValidity();
      return;
    }
    if (payload.emailIsGuardian && (!payload.email || !payload.guardianName || !payload.guardianRelationship)) {
      window.alert("Enter the guardian email, name, and relationship.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.textContent;
      submitButton.textContent = "Saving patient…";
    }
    setBadge("Cloud: creating patient…", "#1d4ed8");

    try {
      const res = await fetch(PATIENTS_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) {
        throw new Error("Your login has expired. Sign in again before creating a patient.");
      }
      if (!res.ok) throw new Error(data?.error || "Unable to create patient");

      const created = normalizePatient(data?.patient || data);
      if (!created.patientId) throw new Error("The patient was created without a patient ID.");

      Object.assign(patient, created);
      clearChartForPatientSelection();
      if (typeof persistPatient === "function") persistPatient();
      if (typeof renderAll === "function") renderAll();
      if (typeof closePatientModal === "function") closePatientModal();
      setBadge("Cloud: patient created ✓", "#15803d");
    } catch (error) {
      setBadge("Cloud: patient save failed", "#b91c1c");
      window.alert(error?.message || "Unable to create patient. Please try again.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || "Save patient";
        delete submitButton.dataset.originalText;
      }
    }
  }

  function renderPatientSearchMessage(title, message, state) {
    if (!patientSearchResults) return;
    patientSearchResults.classList.remove("has-results");
    patientSearchResults.innerHTML = `
      <div class="patient-search-empty" data-state="${escapeHtml(state || "empty")}">
        <span class="patient-search-icon" aria-hidden="true">${state === "loading" ? "…" : "⌕"}</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(message)}</p>
      </div>`;
  }

  function renderPatientResults(rows) {
    if (!patientSearchResults) return;
    if (!rows.length) {
      renderPatientSearchMessage("No patients found", "Try another name, phone number, IC/ID, or email.", "empty");
      return;
    }

    patientSearchResults.classList.add("has-results");
    patientSearchResults.innerHTML = rows.map((row, index) => {
      const record = normalizePatient(row);
      const details = [record.idNumber && `IC/ID: ${record.idNumber}`, record.phone, record.email]
        .filter(Boolean)
        .join(" · ");
      return `
        <button class="patient-search-result" type="button" data-patient-index="${index}">
          <span class="patient-search-result-main">
            <strong>${escapeHtml(record.fullName || "Unnamed patient")}</strong>
            <span>${escapeHtml(details || "No contact details")}</span>
          </span>
          <span class="patient-search-result-action">Select</span>
        </button>`;
    }).join("");

    patientSearchResults.querySelectorAll("[data-patient-index]").forEach((button) => {
      button.addEventListener("click", () => selectExistingPatient(rows[Number(button.dataset.patientIndex)]));
    });
  }

  async function searchExistingPatients() {
    if (!patientSearchResults) return;
    const requestId = ++patientSearchRequest;
    const query = (patientSearchInput?.value || "").trim();
    renderPatientSearchMessage("Loading patients…", "Searching your clinic's patient records.", "loading");

    try {
      const url = new URL(PATIENTS_ENDPOINT);
      url.searchParams.set("limit", "50");
      url.searchParams.set("debug", "1");
      if (query) url.searchParams.set("query", query);
      const res = await fetch(url, { method: "GET", credentials: "include", headers: { Accept: "application/json" } });
      if (requestId !== patientSearchRequest) return;
      if (res.status === 401 || res.status === 403) {
        renderPatientSearchMessage("Login required", "Sign in again before searching patient records.", "error");
        return;
      }
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Unable to load patients");
      const rows = Array.isArray(payload) ? payload : (payload?.patients || []);
      renderPatientResults(rows);
    } catch (error) {
      if (requestId !== patientSearchRequest) return;
      renderPatientSearchMessage("Could not load patients", error?.message || "Please try again.", "error");
    }
  }

  function clearChartForPatientSelection() {
    [state.permanent, state.primary].forEach((dentition) => {
      Object.keys(dentition).forEach((tooth) => {
        dentition[tooth] = { entries: [] };
      });
    });
  }

  function selectExistingPatient(row) {
    const selected = normalizePatient(row);
    if (!selected.patientId) {
      renderPatientSearchMessage("Patient cannot be selected", "This record is missing its patient ID.", "error");
      return;
    }
    Object.assign(patient, selected);
    clearChartForPatientSelection();
    if (typeof persistPatient === "function") persistPatient();
    if (typeof renderAll === "function") renderAll();
    if (typeof closePatientModal === "function") closePatientModal();
    pullChart();
  }

  /* ================= NETWORK ================= */
  let pushing = false;
  let pendingPush = false;

  async function pushChart(manual) {
    const patientId = currentPatientId();
    if (!patientId) {
      setBadge("Cloud: add patient ID to sync", "#92400e");
      return;
    }
    if (pushing) {
      pendingPush = true;
      return;
    }
    pushing = true;
    setBadge(manual ? "Cloud: syncing…" : "Cloud: saving…", "#1d4ed8");
    try {
      const res = await fetch(CHART_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildChartPayload()),
      });
      if (res.status === 401) {
        setBadge("Cloud: sign in required", "#b91c1c");
        return;
      }
      if (!res.ok) {
        setBadge("Cloud: sync failed", "#b91c1c");
        return;
      }
      setBadge("Cloud: synced ✓", "#15803d");
    } catch (e) {
      setBadge("Cloud: offline", "#6b7280");
    } finally {
      pushing = false;
      if (pendingPush) {
        pendingPush = false;
        pushChart(false);
      }
    }
  }

  async function pullChart() {
    const patientId = currentPatientId();
    if (!patientId) return;
    setBadge("Cloud: loading…", "#1d4ed8");
    try {
      const url = CHART_ENDPOINT + "?patient_id=" + encodeURIComponent(patientId);
      const res = await fetch(url, { method: "GET", credentials: "include" });
      if (res.status === 401) {
        setBadge("Cloud: sign in required", "#b91c1c");
        return;
      }
      if (res.status === 404) {
        setBadge("Cloud: no saved chart yet", "#4b5563");
        return;
      }
      if (!res.ok) {
        setBadge("Cloud: load failed", "#b91c1c");
        return;
      }
      const data = await res.json();
      applyServerChart(data && data.chart ? data.chart : data);
      setBadge("Cloud: loaded ✓", "#15803d");
    } catch (e) {
      setBadge("Cloud: offline", "#6b7280");
    }
  }

  /* ================= DEBOUNCE + TRIGGERS ================= */
  let debounceTimer = null;
  let lastImmediatePush = 0;
  function scheduleSync() {
    // The Done button already triggers an immediate push (see below). Skip
    // the debounced path if that just happened, so a normal save doesn't
    // fire the request twice.
    if (Date.now() - lastImmediatePush < 500) return;
    setBadge("Cloud: pending…", "#92400e");
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => pushChart(false), DEBOUNCE_MS);
  }

  function attachTriggers() {
    // Primary trigger: the "Done" button (id="save-btn"). app.js already
    // binds saveDraft() to this same element's click event and registers
    // it first, so by the time this listener runs, saveDraft() has already
    // finished mutating `state` and re-rendering — this fires a save to
    // Supabase (via the Worker) immediately, not debounced.
    const saveBtn = document.getElementById("save-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        lastImmediatePush = Date.now();
        pushChart(true);
      });
    }

    // Secondary/fallback triggers, debounced — cover actions that change
    // the chart without going through the Done button: removing an entry
    // (the trash icon on each row) and edits made via the treatment manager.
    const entriesList = document.getElementById("entries-list");
    if (entriesList) {
      new MutationObserver(scheduleSync).observe(entriesList, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    // Create the patient in Supabase before allowing local/chart persistence.
    const patientForm = document.getElementById("patient-form");
    if (patientForm) patientForm.addEventListener("submit", createNewPatient, true);

    const patientTrigger = document.getElementById("patient-trigger");
    if (patientTrigger) patientTrigger.addEventListener("click", searchExistingPatients);
    if (patientSearchBtn) patientSearchBtn.addEventListener("click", searchExistingPatients);
    if (patientSearchInput) {
      patientSearchInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        searchExistingPatients();
      });
    }

    // Visit date saved.
    const dateForm = document.getElementById("date-form");
    if (dateForm) dateForm.addEventListener("submit", () => setTimeout(scheduleSync, 50));
  }

  /* ================= INIT ================= */
  function init() {
    attachTriggers();
    if (currentPatientId()) {
      pullChart();
    } else {
      setBadge("Cloud: idle", "#4b5563");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Exposed for manual use from the console or future UI hooks.
  window.dentalCloudSync = { push: () => pushChart(true), pull: pullChart, searchPatients: searchExistingPatients };
})();
