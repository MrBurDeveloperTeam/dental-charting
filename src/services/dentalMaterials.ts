import { getSupabaseClient } from '../lib/supabaseClient';
import { getClinicSession } from './dentalPatients';

export type DentalMaterial = { id: string; code: string | null; name: string; color: string };
const defaults = [
  ['amalgam', 'Amalgam', '#7a858f'], ['composite', 'Composite', '#c87a4d'],
  ['gic', 'GIC', '#9dc9c1'], ['zirconia', 'Zirconia', '#e7f0f3'],
  ['emax', 'eMax', '#f2c7a5'], ['pfm', 'PFM', '#d5dce3'],
  ['gold', 'Gold', '#d4a72c'], ['metal', 'Metal', '#56616b'],
  ['temporary', 'Temporary', '#e9d36f'], ['ceramic', 'Ceramic', '#e8d7c8'],
];

async function load(): Promise<DentalMaterial[]> {
  const supabase = getSupabaseClient();
  const { clinicId } = await getClinicSession();
  // Ignore conflicts to preserve clinic edits, including names and colors.
  const { error: seedError } = await supabase.from('dental_material').upsert(
    defaults.map(([code, name, color], sort_order) => ({ clinic_id: clinicId, code, name, color, sort_order })),
    { onConflict: 'clinic_id,code', ignoreDuplicates: true },
  );
  if (seedError) throw seedError;
  const { data, error } = await supabase.from('dental_material')
    .select('id,code,name,color').eq('clinic_id', clinicId).order('sort_order').order('created_at');
  if (error) throw error;
  return data || [];
}

async function save(materials: DentalMaterial[]) {
  const { clinicId } = await getClinicSession();
  const names = materials.map(item => item.name.trim().toLowerCase());
  if (new Set(names).size !== names.length || names.some(name => !name || name.length > 40)) {
    throw new Error('Material names must be unique and contain 1–40 characters.');
  }
  if (materials.some(item => !/^#[0-9a-f]{6}$/i.test(item.color))) throw new Error('Choose a valid material color.');
  const { error } = await getSupabaseClient().from('dental_material').upsert(
    materials.map((item, sort_order) => ({
      id: item.id, clinic_id: clinicId, code: item.code, name: item.name.trim(),
      color: item.color, sort_order, updated_at: new Date().toISOString(),
    })), { onConflict: 'id' },
  );
  if (error) throw error;
}

export const dentalMaterials = { load, save };
