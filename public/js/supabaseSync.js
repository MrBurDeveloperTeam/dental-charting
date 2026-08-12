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
        gender: patient.gender || "",
        phone: patient.phone || "",
        email: patient.email || "",
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

    // Patient info saved (fullName/dob/patientId/etc via the patient modal).
    const patientForm = document.getElementById("patient-form");
    if (patientForm) patientForm.addEventListener("submit", () => setTimeout(scheduleSync, 50));

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
  window.dentalCloudSync = { push: () => pushChart(true), pull: pullChart };
})();
