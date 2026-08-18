import { getSupabaseClient } from "../lib/supabaseClient";
import { getClinicSession } from "./dentalPatients";

export type PatientRecordEntry = { id: string; chart_visit_id: string; dentition: "permanent" | "primary"; tooth_number: number; treatment: string; status: string; updated_at: string };
type AppointmentRow = { id: string; date: string; start_time?: string; status?: string; dentist_id?: string };
export type PatientRecord = {
  id: string; visitDate: string; lastUpdated: string;
  dentition: "Permanent" | "Primary" | "Mixed";
  patient: Record<string, unknown> & { id: string; name?: string; dob?: string; gender?: string; id_number?: string; phone?: string; email?: string; preferred_dentist_id?: string };
  appointment: { id: string; date: string; start_time?: string; status?: string; dentist_id?: string } | null;
  dentist: { id: string; name: string } | null; entries: PatientRecordEntry[]; statuses: string[];
};

function recordDentition(entries: PatientRecordEntry[]): PatientRecord["dentition"] {
  const modes = new Set(entries.map((entry) => entry.dentition));
  if (modes.size > 1) return "Mixed";
  return modes.has("primary") ? "Primary" : "Permanent";
}

export async function listRecentPatientRecords(): Promise<PatientRecord[]> {
  const supabase = getSupabaseClient();
  const { clinicId } = await getClinicSession();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
  const { data: recentEntries, error: entryError } = await supabase.from("dental_chart_entries")
    .select("id,chart_visit_id,dentition,tooth_number,treatment,status,updated_at").gte("updated_at", cutoff.toISOString()).order("updated_at", { ascending: false });
  if (entryError) throw entryError;
  if (!recentEntries?.length) return [];

  const visitIds = [...new Set(recentEntries.map((entry) => entry.chart_visit_id))];
  const { data: visits, error: visitError } = await supabase.from("dental_chart_visits")
    .select("id,patient_id,appointment_id,dentist_id,visit_date,created_at").eq("clinic_id", clinicId).in("id", visitIds);
  if (visitError) throw visitError;
  if (!visits?.length) return [];

  const patientIds = [...new Set(visits.map((visit) => visit.patient_id).filter(Boolean))];
  const appointmentIds = [...new Set(visits.map((visit) => visit.appointment_id).filter(Boolean))];
  const [patientsResult, appointmentsResult, dentistsResult] = await Promise.all([
    supabase.from("apt_patients").select("*").eq("clinic_id", clinicId).in("id", patientIds),
    appointmentIds.length ? supabase.from("appointments").select("id,date,start_time,status,dentist_id").eq("clinic_id", clinicId).in("id", appointmentIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("apt_staff").select("id,name").eq("clinic_id", clinicId).eq("role", "dentist"),
  ]);
  const error = patientsResult.error || appointmentsResult.error || dentistsResult.error; if (error) throw error;
  const index = <T extends { id: string }>(rows: T[] | null) => new Map((rows || []).map((row) => [row.id, row]));
  const patients = index(patientsResult.data); const appointments = index((appointmentsResult.data || []) as AppointmentRow[]); const dentists = index(dentistsResult.data);
  const entriesByVisit = new Map<string, PatientRecordEntry[]>();
  for (const entry of recentEntries as PatientRecordEntry[]) { const rows = entriesByVisit.get(entry.chart_visit_id) || []; rows.push(entry); entriesByVisit.set(entry.chart_visit_id, rows); }

  return visits.flatMap((visit) => {
    const patient = patients.get(visit.patient_id); const entries = entriesByVisit.get(visit.id) || []; if (!patient || !entries.length) return [];
    const appointment = appointments.get(visit.appointment_id) || null;
    const dentistId = visit.dentist_id || appointment?.dentist_id || patient.preferred_dentist_id;
    return [{ id: visit.id, visitDate: visit.visit_date, lastUpdated: entries[0]?.updated_at || visit.created_at, dentition: recordDentition(entries), patient, appointment, dentist: dentists.get(dentistId) || null, entries, statuses: [...new Set(entries.map((entry) => entry.status).filter(Boolean))] }];
  }).sort((a, b) => Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated));
}

export async function listPatientRecords(patientId: string): Promise<PatientRecord[]> {
  const supabase = getSupabaseClient();
  const { clinicId } = await getClinicSession();
  const { data: visits, error: visitError } = await supabase.from("dental_chart_visits")
    .select("id,patient_id,appointment_id,dentist_id,visit_date,created_at")
    .eq("clinic_id", clinicId).eq("patient_id", patientId)
    .order("visit_date", { ascending: false }).order("created_at", { ascending: false });
  if (visitError) throw visitError;
  if (!visits?.length) return [];

  const visitIds = visits.map((visit) => visit.id);
  const { data: allEntries, error: entryError } = await supabase.from("dental_chart_entries")
    .select("id,chart_visit_id,dentition,tooth_number,treatment,status,updated_at")
    .in("chart_visit_id", visitIds).order("updated_at", { ascending: false });
  if (entryError) throw entryError;
  const visitsWithEntries = visits.filter((visit) => allEntries?.some((entry) => entry.chart_visit_id === visit.id));
  if (!visitsWithEntries.length) return [];
  const appointmentIds = [...new Set(visitsWithEntries.map((visit) => visit.appointment_id).filter(Boolean))];

  const [patientResult, appointmentsResult, dentistsResult] = await Promise.all([
    supabase.from("apt_patients").select("*").eq("clinic_id", clinicId).eq("id", patientId).maybeSingle(),
    appointmentIds.length ? supabase.from("appointments").select("id,date,start_time,status,dentist_id").eq("clinic_id", clinicId).in("id", appointmentIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("apt_staff").select("id,name").eq("clinic_id", clinicId).eq("role", "dentist"),
  ]);
  const error = patientResult.error || appointmentsResult.error || dentistsResult.error;
  if (error) throw error;
  if (!patientResult.data) return [];

  const appointments = new Map(((appointmentsResult.data || []) as AppointmentRow[]).map((row) => [row.id, row]));
  return visitsWithEntries.map((visit) => {
    const entries = (allEntries || []).filter((entry) => entry.chart_visit_id === visit.id) as PatientRecordEntry[];
    const appointment = appointments.get(visit.appointment_id) || null;
    const dentistId = visit.dentist_id || appointment?.dentist_id || patientResult.data.preferred_dentist_id;
    return {
      id: visit.id,
      visitDate: visit.visit_date,
      lastUpdated: entries[0]?.updated_at || visit.created_at,
      dentition: recordDentition(entries),
      patient: patientResult.data,
      appointment,
      dentist: (dentistsResult.data || []).find((row) => row.id === dentistId) || null,
      entries,
      statuses: [...new Set(entries.map((entry) => entry.status).filter(Boolean))],
    };
  });
}

export async function getLatestPatientRecord(patientId: string): Promise<PatientRecord | null> {
  return (await listPatientRecords(patientId))[0] || null;
}
