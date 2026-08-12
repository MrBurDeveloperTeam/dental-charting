import type { ChartEntryDraft, DentalChartState, Patient } from "../types";

export const EMPTY_PATIENT: Patient = {
  id: null, fullName: "", dob: "", patientId: "", gender: "",
  phone: "", email: "", notes: "",
};
export const INITIAL_CHART_STATE: DentalChartState = {
  chartMode: "permanent", permanent: {}, primary: {},
};
export const INITIAL_ENTRY_DRAFT: ChartEntryDraft = {
  tooth: null, category: "restoration", treatment: "composite", view: "occ",
  status: "existing", layer: "existing", surfaces: [], note: "",
};
