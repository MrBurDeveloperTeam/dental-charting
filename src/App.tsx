import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DentalChartPage } from "./pages/DentalChartPage";
import { PatientRecordsPage } from "./pages/PatientRecordsPage";
import { PatientModal } from "./components/patient/PatientModal";
import { AuthGate } from "./components/auth/AuthGate";
import type { PatientRecord } from "./services/patientRecords";

export default function App() {
  const [view, setView] = useState<"chart" | "records" | "review">("chart");
  const [selectedRecord, setSelectedRecord] = useState<PatientRecord | null>(null);

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

  const openRecord = (record: PatientRecord) => {
    setSelectedRecord(record);
    setView("review");
    window.setTimeout(() => document.dispatchEvent(new CustomEvent("dental-chart:open-record", { detail: { patient: record.patient, visitDate: record.visitDate } })), 0);
  };

  const app = (
    <>
      <PatientModal />
      {view === "records" ? <PatientRecordsPage onOpenRecord={openRecord} /> : <DentalChartPage />}
      {view === "review" && selectedRecord && document.getElementById("record-review-summary-root") && createPortal(
        <section className="record-review-panel" aria-label="Patient referral details">
          <div className="record-review-toolbar"><button type="button" onClick={() => setView("records")}><span aria-hidden="true">←</span> Back to Patient Records</button></div>
          <div className="record-review-summary">
            <div><small>Name</small><strong>{String(selectedRecord.patient.name || "—")}</strong></div>
            <div><small>Date of birth</small><strong>{selectedRecord.patient.dob ? new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${selectedRecord.patient.dob}T00:00:00`)) : "—"}</strong></div>
            <div><small>IC</small><strong>{String(selectedRecord.patient.id_number || "—")}</strong></div>
            <div><small>Gender</small><strong>{selectedRecord.patient.gender ? String(selectedRecord.patient.gender).charAt(0).toUpperCase() + String(selectedRecord.patient.gender).slice(1) : "—"}</strong></div>
            <div><small>Phone</small><strong>{String(selectedRecord.patient.phone || "—")}</strong></div>
            <div><small>Email</small><strong>{String(selectedRecord.patient.email || "—")}</strong></div>
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
