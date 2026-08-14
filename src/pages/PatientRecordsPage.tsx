import { useEffect, useMemo, useRef, useState } from "react";
import { listDentalDentists, type DentalDentist } from "../services/dentalPatients";
import { listRecentPatientRecords, type PatientRecord } from "../services/patientRecords";

type SortField = "patient" | "visit" | "appointment" | "dentist" | "status" | "updated";
type SortState = { field: SortField; direction: "asc" | "desc" };
const statusLabel = (status: string) => status === "watch" ? "Review" : status.charAt(0).toUpperCase() + status.slice(1);
const formatDate = (value?: string, time = false) => value ? new Intl.DateTimeFormat("en-MY", time ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const initials = (name = "Patient") => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

function SortButton({ field, children, sort, onSort }: { field: SortField; children: React.ReactNode; sort: SortState; onSort: (field: SortField) => void }) {
  const active = sort.field === field;
  return <button className={active ? "active" : ""} onClick={() => onSort(field)}>{children}<span aria-hidden="true">{active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</span></button>;
}

export function PatientRecordsPage({ onOpenRecord }: { onOpenRecord: (record: PatientRecord) => void }) {
  const [records, setRecords] = useState<PatientRecord[]>([]); const [dentists, setDentists] = useState<DentalDentist[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false); const [statuses, setStatuses] = useState<string[]>([]); const [genders, setGenders] = useState<string[]>([]); const [dentistIds, setDentistIds] = useState<string[]>([]);
  const [sort, setSort] = useState<SortState>({ field: "updated", direction: "desc" }); const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => { let active = true; Promise.all([listRecentPatientRecords(), listDentalDentists()]).then(([rows, staff]) => { if (active) { setRecords(rows); setDentists(staff); } }).catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Unable to load patient records.")).finally(() => active && setLoading(false)); return () => { active = false; }; }, []);
  useEffect(() => { const close = (event: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  const toggle = (value: string, values: string[], setter: (next: string[]) => void) => setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  const activeFilters = statuses.length + genders.length + dentistIds.length;
  const visible = useMemo(() => records.filter((record) => {
    const patient = record.patient; const search = query.trim().toLowerCase();
    return (!search || [patient.name, patient.id_number, patient.phone].some((value) => String(value || "").toLowerCase().includes(search))) && (!statuses.length || statuses.some((status) => record.statuses.includes(status))) && (!genders.length || genders.includes(String(patient.gender || "").toLowerCase())) && (!dentistIds.length || dentistIds.includes(String(patient.preferred_dentist_id || "")));
  }).sort((a, b) => {
    const values: Record<SortField, [string, string]> = { patient: [String(a.patient.name || ""), String(b.patient.name || "")], visit: [a.visitDate, b.visitDate], appointment: [a.appointment?.date || "", b.appointment?.date || ""], dentist: [a.dentist?.name || "", b.dentist?.name || ""], status: [a.statuses.join(","), b.statuses.join(",")], updated: [a.lastUpdated, b.lastUpdated] };
    const result = values[sort.field][0].localeCompare(values[sort.field][1], undefined, { numeric: true }); return sort.direction === "asc" ? result : -result;
  }), [records, query, statuses, genders, dentistIds, sort]);
  const changeSort = (field: SortField) => setSort((current) => ({ field, direction: current.field === field && current.direction === "asc" ? "desc" : "asc" }));

  return <main className="patient-records-page">
    <header className="patient-records-heading"><h2>Patient Records</h2><p>Dental charts updated within the last 7 days</p></header>
    <section className="patient-records-toolbar"><label className="patient-record-search"><span>⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, IC/ID or phone..." /></label>
      <div className="patient-record-filter-wrap" ref={filterRef}><button className={`patient-record-filter-trigger ${filterOpen ? "active" : ""}`} onClick={() => setFilterOpen(!filterOpen)}>≡ <span>Filter</span>{activeFilters > 0 && <b>{activeFilters}</b>}</button>
        {filterOpen && <aside className="patient-record-filter-panel"><div className="patient-record-filter-title"><strong>Filters</strong><button onClick={() => setFilterOpen(false)} aria-label="Close filters">×</button></div>
          <h3>Status</h3><div className="patient-record-filter-chips">{["planned", "existing", "watch"].map((value) => <button key={value} className={statuses.includes(value) ? "selected" : ""} onClick={() => toggle(value, statuses, setStatuses)}>{statusLabel(value)}</button>)}</div>
          <h3>Gender</h3><div className="patient-record-filter-chips">{["male", "female"].map((value) => <button key={value} className={genders.includes(value) ? "selected" : ""} onClick={() => toggle(value, genders, setGenders)}>{statusLabel(value)}</button>)}</div>
          <h3>Preferred dentist</h3><div className="patient-record-filter-dentists">{dentists.map((dentist) => <button key={dentist.id} className={dentistIds.includes(dentist.id) ? "selected" : ""} onClick={() => toggle(dentist.id, dentistIds, setDentistIds)}>{dentist.name}</button>)}</div>
          {activeFilters > 0 && <button className="patient-record-clear-filters" onClick={() => { setStatuses([]); setGenders([]); setDentistIds([]); }}>Clear all filters</button>}
        </aside>}
      </div><span className="patient-record-result-count">{visible.length} of {records.length} records</span>
    </section>
    <section className="patient-record-table-card"><div className="patient-record-table-scroll"><table className="patient-record-table"><thead><tr>
      <th><SortButton field="patient" sort={sort} onSort={changeSort}>Patient</SortButton></th><th>IC / ID</th><th><SortButton field="visit" sort={sort} onSort={changeSort}>Chart visit</SortButton></th><th><SortButton field="appointment" sort={sort} onSort={changeSort}>Appointment</SortButton></th><th><SortButton field="dentist" sort={sort} onSort={changeSort}>Dentist</SortButton></th><th>Entries</th><th><SortButton field="status" sort={sort} onSort={changeSort}>Status</SortButton></th><th><SortButton field="updated" sort={sort} onSort={changeSort}>Last updated</SortButton></th><th></th>
    </tr></thead><tbody>
      {loading && <tr><td className="patient-record-empty" colSpan={9}>Loading recent patient records…</td></tr>}{error && <tr><td className="patient-record-empty error" colSpan={9}>{error}</td></tr>}
      {!loading && !error && visible.map((record) => <tr key={record.id} tabIndex={0} onClick={() => onOpenRecord(record)} onKeyDown={(event) => event.key === "Enter" && onOpenRecord(record)}>
        <td><div className="patient-record-person"><span>{initials(String(record.patient.name || "Patient"))}</span><strong>{String(record.patient.name || "Unknown patient")}</strong></div></td><td>{String(record.patient.id_number || "—")}</td><td>{formatDate(record.visitDate)}</td>
        <td>{record.appointment ? <><strong>{formatDate(record.appointment.date)}</strong><small>{record.appointment.start_time?.slice(0, 5)}</small></> : <em>Not linked</em>}</td><td>{record.dentist?.name || "Not assigned"}</td><td><strong>{record.entries.length}</strong></td>
        <td><div className="patient-record-statuses">{record.statuses.map((value) => <span className={`status-${value}`} key={value}>{statusLabel(value)}</span>)}</div></td><td>{formatDate(record.lastUpdated, true)}</td><td className="patient-record-chevron">›</td>
      </tr>)}{!loading && !error && !visible.length && <tr><td className="patient-record-empty" colSpan={9}>No records match your search and filters.</td></tr>}
    </tbody></table></div></section>
  </main>;
}
