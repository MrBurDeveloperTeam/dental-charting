import { getSupabaseClient } from "../lib/supabaseClient";
import { getClinicSession } from "./dentalPatients";

export type DentalChartEntryInput = {
  id?: string;
  dentition: string;
  toothNumber: number;
  chartType: string;
  view: string;
  surfaces: string[];
  treatment: string;
  status: string;
  layer: string;
  clinicalNote?: string;
};

export type DentalChartEntryRow = {
  id: string;
  chart_visit_id: string;
  dentition: string;
  tooth_number: number;
  chart_type: string;
  view: string;
  surfaces: string[];
  treatment: string;
  status: string;
  layer: string;
  clinical_note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type VisitContext = {
  patientId: string;
  visitDate: string;
  dentistId?: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function findVisit(context: VisitContext) {
  const supabase = getSupabaseClient();
  const { clinicId } = await getClinicSession();
  const { data, error } = await supabase
    .from("dental_chart_visits")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("patient_id", context.patientId)
    .eq("visit_date", context.visitDate)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

async function getOrCreateVisit(context: VisitContext) {
  const existing = await findVisit(context);
  if (existing) return existing;

  const supabase = getSupabaseClient();
  const { clinicId, userId } = await getClinicSession();
  const { data: appointments, error: appointmentError } = await supabase
    .from("appointments")
    .select("id,dentist_id")
    .eq("clinic_id", clinicId)
    .eq("patient_id", context.patientId)
    .eq("date", context.visitDate)
    .order("created_at", { ascending: false })
    .limit(1);
  if (appointmentError) throw appointmentError;

  const appointment = appointments?.[0] || null;
  const fallbackDentistId = context.dentistId && uuidPattern.test(context.dentistId)
    ? context.dentistId
    : null;
  const { data, error } = await supabase
    .from("dental_chart_visits")
    .insert({
      clinic_id: clinicId,
      patient_id: context.patientId,
      appointment_id: appointment?.id || null,
      dentist_id: appointment?.dentist_id || fallbackDentistId,
      visit_date: context.visitDate,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

function entryPayload(entry: DentalChartEntryInput) {
  return {
    dentition: entry.dentition,
    tooth_number: entry.toothNumber,
    chart_type: entry.chartType,
    view: entry.view,
    surfaces: Array.isArray(entry.surfaces) ? entry.surfaces : [],
    treatment: entry.treatment,
    status: entry.status,
    layer: entry.layer,
    clinical_note: entry.clinicalNote?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

export async function loadDentalChart(context: VisitContext) {
  const visit = await findVisit(context);
  if (!visit) return { visit: null, entries: [] as DentalChartEntryRow[] };

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("dental_chart_entries")
    .select("*")
    .eq("chart_visit_id", visit.id)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return { visit, entries: (data || []) as DentalChartEntryRow[] };
}

export async function saveDentalChartEntry(context: VisitContext, entry: DentalChartEntryInput) {
  const supabase = getSupabaseClient();
  const visit = await getOrCreateVisit(context);
  const { userId } = await getClinicSession();
  const payload = entryPayload(entry);

  if (entry.id && uuidPattern.test(entry.id)) {
    const { data, error } = await supabase
      .from("dental_chart_entries")
      .update(payload)
      .eq("id", entry.id)
      .eq("chart_visit_id", visit.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as DentalChartEntryRow;
  }

  const { data, error } = await supabase
    .from("dental_chart_entries")
    .insert({
      ...payload,
      chart_visit_id: visit.id,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as DentalChartEntryRow;
}

export async function deleteDentalChartEntry(context: VisitContext, entryId: string) {
  if (!uuidPattern.test(entryId)) return;
  const visit = await findVisit(context);
  if (!visit) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("dental_chart_entries")
    .delete()
    .eq("id", entryId)
    .eq("chart_visit_id", visit.id);
  if (error) throw error;
}

export async function deleteDentalChartEntries(context: VisitContext, entryIds: string[]) {
  const ids = entryIds.filter((id) => uuidPattern.test(id));
  if (!ids.length) return;
  const visit = await findVisit(context);
  if (!visit) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("dental_chart_entries")
    .delete()
    .eq("chart_visit_id", visit.id)
    .in("id", ids);
  if (error) throw error;
}

export const dentalCharts = {
  load: loadDentalChart,
  saveEntry: saveDentalChartEntry,
  deleteEntry: deleteDentalChartEntry,
  deleteEntries: deleteDentalChartEntries,
};
