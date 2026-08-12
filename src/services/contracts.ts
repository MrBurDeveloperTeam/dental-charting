import type { DentalChartState, Patient, PatientDraft } from "../types";

export interface PatientService {
  getPatient(patientId: string): Promise<Patient | null>;
  savePatient(patient: PatientDraft): Promise<Patient>;
  searchPatients(query: string): Promise<Patient[]>;
}
export interface DentalChartService {
  load(patientId: string): Promise<DentalChartState | null>;
  save(patientId: string, chart: DentalChartState): Promise<void>;
}
export const STORAGE_KEYS = {
  patient: "dental-charting-2-patient",
  visit: "dental-charting-2-visit",
  mode: "dental-charting-2-mode",
  treatments: "dental-charting-2-treatment-methods",
} as const;
