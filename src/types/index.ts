export type Dentition = "permanent" | "primary";
export type ToothView = "occ" | "front";
export type ToothSurface = "mesial" | "occlusal" | "distal" | "buccal" | "lingual";
export type ChartCategory = "restoration" | "condition" | "procedure" | "prosthetic";
export type ChartStatus = "existing" | "planned" | "watch";
export type ChartLayer = "existing" | "planned";

export interface Patient {
  id: string | null;
  fullName: string;
  dob: string;
  patientId: string;
  gender: string;
  phone: string;
  email: string;
  notes: string;
}
export type PatientDraft = Omit<Patient, "id">;
export interface Visit { date: string; }
export interface ChartEntryDraft {
  tooth: number | null;
  category: ChartCategory;
  treatment: string;
  view: ToothView;
  status: ChartStatus;
  layer: ChartLayer;
  surfaces: ToothSurface[];
  note: string;
}
export interface ChartEntry extends Omit<ChartEntryDraft, "tooth"> {
  id: string;
  tooth: number;
  createdAt?: string;
}
export interface DentalChartState {
  chartMode: Dentition;
  permanent: Record<number, ChartEntry[]>;
  primary: Record<number, ChartEntry[]>;
}
