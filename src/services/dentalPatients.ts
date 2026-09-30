import { getSupabaseClient } from "../lib/supabaseClient";
import { getWorkspaceSelection } from "./workspaceContext";

type PatientInput = {
  name: unknown;
  phone?: unknown;
  email?: unknown;
  emailIsGuardian?: unknown;
  guardianName?: unknown;
  guardianRelationship?: unknown;
  idNumber?: unknown;
  address?: unknown;
  dob?: unknown;
  gender?: unknown;
  taxNumber?: unknown;
  emergencyContactName?: unknown;
  emergencyContactPhone?: unknown;
  allergies?: unknown;
  medicalConditions?: unknown;
  medications?: unknown;
  source?: unknown;
  preferredDentist?: unknown;
  insurance?: unknown;
  notes?: unknown;
};

export type DentalDentist = {
  id: string;
  name: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export type PatientValidationField = "fullName" | "dob" | "idNumber" | "gender" | "phone" | "email";
export type PatientValidationErrors = Partial<Record<PatientValidationField, string>>;

const personNamePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizePatientIdNumber(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function validateDentalPatient(input: PatientInput): PatientValidationErrors {
  const errors: PatientValidationErrors = {};
  const name = String(input.name ?? "").trim();
  const dob = String(input.dob ?? "").trim();
  const idNumber = String(input.idNumber ?? "").trim();
  const gender = String(input.gender ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  const email = String(input.email ?? "").trim();

  if (!name) errors.fullName = "Enter the patient's full name.";
  else if (!personNamePattern.test(name)) errors.fullName = "Full name can only contain letters, spaces, apostrophes, or hyphens.";

  if (!dob) errors.dob = "Enter the patient's date of birth.";
  else {
    const match = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = match ? new Date(`${dob}T00:00:00`) : null;
    if (!match || !date || Number.isNaN(date.getTime()) ||
        date.getFullYear() !== Number(match[1]) || date.getMonth() + 1 !== Number(match[2]) || date.getDate() !== Number(match[3])) {
      errors.dob = "Enter a valid date as DD/MM/YYYY.";
    } else if (dob > new Date().toISOString().slice(0, 10)) {
      errors.dob = "Date of birth cannot be later than today.";
    }
  }

  if (!idNumber) errors.idNumber = "Enter the patient's IC / ID number.";
  else if (/[A-Za-z]/.test(idNumber) || !/\d/.test(idNumber)) errors.idNumber = "IC / ID number can contain numbers and symbols, but no letters.";

  if (!gender) errors.gender = "Select the patient's gender.";
  if (!phone) errors.phone = "Enter the patient's phone number.";
  else if (/[A-Za-z]/.test(phone) || !/\d/.test(phone)) errors.phone = "Phone number can contain numbers and phone symbols, but no letters.";

  if (!email) errors.email = "Enter the patient's email address.";
  else if (!emailPattern.test(email)) errors.email = "Enter a valid email address, for example name@example.com.";
  return errors;
}

export function buildNewPatientPayload(input: PatientInput, clinicId: string, userId: string) {
  const validationErrors = validateDentalPatient(input);
  if (Object.keys(validationErrors).length) {
    const error = new Error("Check the highlighted patient details and try again.");
    Object.assign(error, { code: "PATIENT_VALIDATION", validationErrors });
    throw error;
  }
  const preferredDentistId = optionalText(input.preferredDentist);
  const emailIsGuardian = Boolean(input.emailIsGuardian);
  if (preferredDentistId && !uuidPattern.test(preferredDentistId)) {
    throw new Error("The selected preferred dentist is invalid.");
  }

  // Explicit allowlist: database-generated and existing-row identifiers are
  // deliberately absent, so this payload can only describe a new patient row.
  return {
    clinic_id: clinicId,
    name: requiredText(input.name, "Patient name"),
    phone: optionalText(input.phone),
    email: optionalText(input.email)?.toLowerCase() ?? null,
    id_number: optionalText(input.idNumber),
    address: optionalText(input.address),
    created_by: userId,
    dob: optionalText(input.dob),
    gender: optionalText(input.gender),
    tax_number: optionalText(input.taxNumber),
    emergency_contact_name: optionalText(input.emergencyContactName),
    emergency_contact_phone: optionalText(input.emergencyContactPhone),
    allergies: optionalText(input.allergies),
    medical_conditions: optionalText(input.medicalConditions),
    medications: optionalText(input.medications),
    source: optionalText(input.source),
    preferred_dentist_id: preferredDentistId,
    insurance: optionalText(input.insurance),
    notes: optionalText(input.notes),
    email_is_guardian: emailIsGuardian,
    guardian_name: emailIsGuardian ? optionalText(input.guardianName) : null,
    guardian_relationship: emailIsGuardian ? optionalText(input.guardianRelationship) : null,
  };
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || "https://app.snabbb.com/api")
  .replace(/\/$/, "");
const exchangeEndpoint = apiBase.endsWith("/api")
  ? `${apiBase}/sso/exchange`
  : `${apiBase}/api/sso/exchange`;

type ClinicSession = { userId: string; clinicId: string; expiresAt: number };

let clinicSession: ClinicSession | null = null;
let sessionPromise: Promise<ClinicSession> | null = null;

async function establishClinicSession(selection: ReturnType<typeof getWorkspaceSelection>) {
  const supabase = getSupabaseClient();
  const response = await fetch(exchangeEndpoint, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const exchange = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(exchange?.error || "Your login has expired. Sign in again.");
  }
  if (!exchange?.access_token || !exchange?.refresh_token) {
    throw new Error("The login exchange did not return a Supabase session.");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: exchange.access_token,
    refresh_token: exchange.refresh_token,
  });
  if (sessionError) throw sessionError;

  const userId = sessionData.user?.id;
  if (!userId) throw new Error("No authenticated Supabase user was returned.");

  const contextResponse = await fetch(exchangeEndpoint.replace(/sso\/exchange$/, 'company/workspace-context'), {
    method: 'GET', credentials: 'include',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + exchange.access_token, ...selection.headers },
  });
  const context = await contextResponse.json().catch(() => null);
  if (!contextResponse.ok || !context?.ok) throw new Error(context?.error || 'Unable to resolve the selected workspace.');
  if (context.actorUserId !== userId || context.workspaceType !== selection.type ||
      (selection.owner && context.workspaceUserId !== selection.owner)) {
    throw new Error('The returned workspace does not match your selection. Reopen Dental Charting from Snabbb.');
  }
  if (!context.clinicId) throw new Error('No clinic is assigned to the selected workspace.');

  const lifetimeSeconds = Number(exchange.expires_in) || 3600;
  return {
    userId,
    clinicId: context.clinicId as string,
    expiresAt: Date.now() + Math.max(60, lifetimeSeconds - 60) * 1000,
  };
}

let sessionWorkspaceKey: string | null = null;
export async function getClinicSession() {
  const selection = getWorkspaceSelection();
  if (sessionWorkspaceKey !== selection.key) {
    sessionWorkspaceKey = selection.key;
    clinicSession = null;
    sessionPromise = null;
  }
  if (clinicSession && clinicSession.expiresAt > Date.now()) return clinicSession;
  if (!sessionPromise) {
    const pending = establishClinicSession(selection).then((session) => {
      if (getWorkspaceSelection().key !== selection.key) throw new Error('Workspace changed. Please reload Dental Charting.');
      clinicSession = session;
      return session;
    }).finally(() => {
      if (sessionPromise === pending) sessionPromise = null;
    });
    sessionPromise = pending;
  }
  return sessionPromise;
}

function safeSearchTerm(query: string) {
  // Commas and parentheses are PostgREST `or` syntax, not search text.
  return query.trim().replace(/[(),]/g, " ").replace(/\s+/g, " ");
}

export async function searchDentalPatients(query = "") {
  const supabase = getSupabaseClient();
  const { clinicId } = await getClinicSession();
  const term = safeSearchTerm(query);

  let request = supabase
    .from("apt_patients")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (term) {
    const pattern = `%${term}%`;
    request = request.or(
      `name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern},id_number.ilike.${pattern},address.ilike.${pattern}`
    );
  }

  const { data, error } = await request;
  if (error) throw error;
  return data || [];
}

export async function getDentalPatientById(patientId: string) {
  if (!uuidPattern.test(patientId)) throw new Error("The patient link is invalid.");

  const supabase = getSupabaseClient();
  const { clinicId } = await getClinicSession();
  const { data, error } = await supabase
    .from("apt_patients")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("id", patientId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listDentalDentists(): Promise<DentalDentist[]> {
  const supabase = getSupabaseClient();
  const { clinicId } = await getClinicSession();
  const { data, error } = await supabase
    .from("apt_staff")
    .select("id,name")
    .eq("clinic_id", clinicId)
    .eq("role", "dentist")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    name: String(row.name || "Unnamed dentist"),
  }));
}

export async function createDentalPatient(input: PatientInput) {
  const supabase = getSupabaseClient();
  const { clinicId, userId } = await getClinicSession();
  const payload = buildNewPatientPayload(input, clinicId, userId);

  const { data, error } = await supabase
    .from("apt_patients")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505" && [error.message, error.details, error.hint].some((value) => String(value || "").includes("apt_patients_clinic_normalized_ic_key"))) {
      const duplicateError = new Error(`A patient with IC / ID ${payload.id_number} already exists. Search for and select the existing patient instead.`);
      Object.assign(duplicateError, { code: "PATIENT_DUPLICATE", field: "idNumber" });
      throw duplicateError;
    }
    throw error;
  }
  return data;
}

export const dentalPatients = {
  search: searchDentalPatients,
  getById: getDentalPatientById,
  create: createDentalPatient,
  validate: validateDentalPatient,
  listDentists: listDentalDentists,
};
