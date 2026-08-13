import { getSupabaseClient } from "../lib/supabaseClient";

type PatientInput = Record<string, unknown>;

const apiBase = (import.meta.env.VITE_API_BASE_URL || "https://app.snabbb.com/api")
  .replace(/\/$/, "");
const exchangeEndpoint = apiBase.endsWith("/api")
  ? `${apiBase}/sso/exchange`
  : `${apiBase}/api/sso/exchange`;

type ClinicSession = { userId: string; clinicId: string; expiresAt: number };

let clinicSession: ClinicSession | null = null;
let sessionPromise: Promise<ClinicSession> | null = null;

async function establishClinicSession() {
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.clinic_id) throw new Error("No clinic is assigned to this account.");

  const lifetimeSeconds = Number(exchange.expires_in) || 3600;
  return {
    userId,
    clinicId: profile.clinic_id as string,
    expiresAt: Date.now() + Math.max(60, lifetimeSeconds - 60) * 1000,
  };
}

async function getClinicSession() {
  if (clinicSession && clinicSession.expiresAt > Date.now()) return clinicSession;
  if (!sessionPromise) {
    sessionPromise = establishClinicSession()
      .then((session) => {
        clinicSession = session;
        return session;
      })
      .finally(() => {
        sessionPromise = null;
      });
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

export async function createDentalPatient(input: PatientInput) {
  const supabase = getSupabaseClient();
  const { clinicId, userId } = await getClinicSession();
  const payload = {
    clinic_id: clinicId,
    created_by: userId,
    name: input.name,
    phone: input.phone || null,
    email: input.email || null,
    email_is_guardian: Boolean(input.emailIsGuardian),
    guardian_name: input.guardianName || null,
    guardian_relationship: input.guardianRelationship || null,
    id_number: input.idNumber || null,
    address: input.address || null,
    dob: input.dob || null,
    gender: input.gender || null,
    tax_number: input.taxNumber || null,
    emergency_contact_name: input.emergencyContactName || null,
    emergency_contact_phone: input.emergencyContactPhone || null,
    allergies: input.allergies || null,
    medical_conditions: input.medicalConditions || null,
    medications: input.medications || null,
    source: input.source || null,
    preferred_dentist_id: input.preferredDentist || null,
    insurance: input.insurance || null,
    notes: input.notes || null,
  };

  const { data, error } = await supabase
    .from("apt_patients")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export const dentalPatients = {
  search: searchDentalPatients,
  create: createDentalPatient,
};
