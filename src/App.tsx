import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DentalChartPage } from "./pages/DentalChartPage";
import { PatientRecordsPage } from "./pages/PatientRecordsPage";
import { PatientModal } from "./components/patient/PatientModal";
import { AuthGate } from "./components/auth/AuthGate";
import { getLatestPatientRecord, listPatientRecords, type PatientRecord } from "./services/patientRecords";

export default function App() {
  const [view, setView] = useState<"chart" | "records" | "review">("chart");
  const [selectedRecord, setSelectedRecord] = useState<PatientRecord | null>(null);
  const [patientVisitRecords, setPatientVisitRecords] = useState<PatientRecord[]>([]);
  const [reviewLayer, setReviewLayer] = useState<"existing" | "planned">("existing");

  useEffect(() => {
    const chartNav = document.getElementById("chart-nav-item");
    const recordsNav = document.getElementById("patient-record-nav-item");
    const showChart = () => { setSelectedRecord(null); setView("chart"); };
    const showRecords = () => setView("records");
    chartNav?.addEventListener("click", showChart);
    recordsNav?.addEventListener("click", showRecords);
    return () => { chartNav?.removeEventListener("click", showChart); recordsNav?.removeEventListener("click", showRecords); };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("patient-records-view", view === "records");
    document.body.classList.toggle("patient-record-review", view === "review");
    const chartNav = document.getElementById("chart-nav-item");
    const recordsNav = document.getElementById("patient-record-nav-item");
    chartNav?.classList.toggle("active", view === "chart");
    recordsNav?.classList.toggle("active", view !== "chart");
    chartNav?.setAttribute("aria-current", view === "chart" ? "page" : "false");
    recordsNav?.setAttribute("aria-current", view !== "chart" ? "page" : "false");
    return () => { document.body.classList.remove("patient-records-view", "patient-record-review"); };
  }, [view]);

  useEffect(() => {
    if (view !== "review") return;
    const entriesList = document.getElementById("entries-list");
    if (!entriesList) return;
    const setReadOnly = (readOnly: boolean) => entriesList.querySelectorAll<HTMLButtonElement>(".entry-open").forEach((button) => {
      button.disabled = readOnly;
      button.removeAttribute("title");
      button.setAttribute("aria-label", readOnly ? "Saved dental chart entry" : button.getAttribute("aria-label") || "Edit saved dental chart entry");
    });
    setReadOnly(true);
    const observer = new MutationObserver(() => setReadOnly(true));
    observer.observe(entriesList, { childList: true, subtree: true });
    return () => { observer.disconnect(); setReadOnly(false); };
  }, [view]);

  const openRecord = (record: PatientRecord) => {
    setSelectedRecord(record);
    setPatientVisitRecords((current) => current.some((item) => item.patient.id === record.patient.id) ? current : [record]);
    setReviewLayer("existing");
    setView("review");
    window.setTimeout(() => document.dispatchEvent(new CustomEvent("dental-chart:open-record", { detail: { patient: record.patient, visitDate: record.visitDate, dentition: record.dentition } })), 0);
  };

  useEffect(() => {
    const patientId = selectedRecord?.patient.id;
    if (!patientId || view !== "review") return;
    let active = true;
    listPatientRecords(patientId)
      .then((records) => { if (active) setPatientVisitRecords(records); })
      .catch((reason: unknown) => {
        if (active) console.error("Unable to load the patient's visit history", reason);
      });
    return () => { active = false; };
  }, [selectedRecord?.patient.id, view]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get("patient_id");
    if (params.get("record") !== "latest" || !patientId) return;

    let active = true;
    getLatestPatientRecord(patientId)
      .then((record) => {
        if (!active) return;
        if (!record) throw new Error("No saved dental record was found for this patient.");
        openRecord(record);
      })
      .catch((reason: unknown) => {
        if (active) window.alert(reason instanceof Error ? reason.message : "Unable to open the latest dental record.");
      });
    return () => { active = false; };
  }, []);

  const app = (
    <>
      <PatientModal />
      {view === "records" ? <PatientRecordsPage onOpenRecord={openRecord} /> : <DentalChartPage />}
      {view === "review" && selectedRecord && document.getElementById("record-review-summary-root") && createPortal(
        <section className="record-review-panel" aria-label="Patient referral details">
          <div className="record-review-toolbar"><button type="button" onClick={() => setView("records")}><span aria-hidden="true">←</span> Back to Patient Records</button><button className="record-review-download" type="button" onClick={() => document.getElementById("download-pdf-btn")?.click()}><svg className="record-review-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5" /></svg> Download PDF</button></div>
          <div className="record-review-summary">
            <div className="record-review-identity">
              <h2>{String(selectedRecord.patient.name || "Unknown patient")}</h2>
              <div className="record-review-identity-details">
                <span>{String(selectedRecord.patient.id_number || "IC not set")}</span>
                <span>{selectedRecord.patient.gender ? String(selectedRecord.patient.gender).charAt(0).toUpperCase() + String(selectedRecord.patient.gender).slice(1) : "Gender not set"}</span>
                <span>{selectedRecord.patient.dob ? new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${selectedRecord.patient.dob}T00:00:00`)) : "DOB not set"}</span>
                <span>{String(selectedRecord.patient.phone || "Phone not set")}</span>
                <span className="record-review-email">{String(selectedRecord.patient.email || "Email not set")}</span>
              </div>
            </div>
            <div className="record-review-cards">
              <div className="record-review-card">
                <small>Preferred dentist</small>
                <strong>{selectedRecord.dentist?.name || "Not assigned"}</strong>
              </div>
              <div className="record-review-card">
                <small>Dentition</small>
                <strong>{selectedRecord.dentition.charAt(0).toUpperCase() + selectedRecord.dentition.slice(1)}</strong>
              </div>
              <div className="record-review-card record-review-visit-field">
                <label htmlFor="record-review-visit"><small>Visit date</small></label>
                <select id="record-review-visit" value={selectedRecord.id} onChange={(event) => { const record = patientVisitRecords.find((item) => item.id === event.target.value); if (record) openRecord(record); }}>{patientVisitRecords.map((record) => <option key={record.id} value={record.id}>{new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${record.visitDate}T00:00:00`))}</option>)}</select>
              </div>
            </div>
          </div>
          <div className="record-review-layer-switch" aria-label="Chart layer">
            {(["existing", "planned"] as const).map((layer) => <button key={layer} type="button" className={reviewLayer === layer ? "active" : ""} aria-pressed={reviewLayer === layer} onClick={() => { setReviewLayer(layer); (document.querySelector(`[data-chart-view="${layer}"]`) as HTMLButtonElement | null)?.click(); }}>{layer === "existing" ? "Existing" : "Planning"}</button>)}
          </div>
        </section>,
        document.getElementById("record-review-summary-root")!,
      )}
    </>
  );

  // Local-only CSS/UI debugging switch. Production can never use this bypass.
  const bypassAuth = import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === "true";

  return bypassAuth ? app : <AuthGate>{app}</AuthGate>;
}
