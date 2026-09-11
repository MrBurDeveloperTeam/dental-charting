import { getSupabaseClient } from '../lib/supabaseClient';
import { getClinicSession } from './dentalPatients';

export type DentalMaterial = { id: string; code: string | null; name: string; color: string };
const defaults = [
  ['amalgam', 'Amalgam', '#7a858f'], ['composite', 'Composite', '#c87a4d'],
  ['gic', 'GIC', '#f8530d'], ['zirconia', 'Zirconia', '#e7f0f3'],
  ['emax', 'eMax', '#f2c7a5'], ['pfm', 'PFM', '#d5dce3'],
  ['gold', 'Gold', '#d4a72c'], ['metal', 'Metal', '#56616b'],
  ['temporary', 'Temporary', '#e9d36f'], ['ceramic', 'Ceramic', '#e8d7c8'],
];

async function load(): Promise<DentalMaterial[]> {
  const supabase = getSupabaseClient();
  const { clinicId } = await getClinicSession();
  const { data, error } = await supabase.from('dental_material')
    .select('id,code,name,color').eq('clinic_id', clinicId).order('sort_order').order('created_at');
  if (error) throw error;
  const rows = (data || []) as DentalMaterial[];
  const overrides = new Map(rows.filter(item => item.code).map(item => [item.code, item]));
  const builtins = defaults.map(([code, name, color]) => {
    const override = overrides.get(code);
    return { id: code, code, name: override?.name || name, color: override?.color || color };
  });
  return [...builtins, ...rows.filter(item => !item.code)];
}

async function save(materials: DentalMaterial[]) {
  const { clinicId } = await getClinicSession();
  const names = materials.map(item => item.name.trim().toLowerCase());
  if (new Set(names).size !== names.length || names.some(name => !name || name.length > 40)) {
    throw new Error('Material names must be unique and contain 1–40 characters.');
  }
  if (materials.some(item => !/^#[0-9a-f]{6}$/i.test(item.color))) throw new Error('Choose a valid material color.');
  const supabase = getSupabaseClient();
  const defaultMap = new Map(defaults.map(([code, name, color], sortOrder) => [code, { name, color, sortOrder }]));
  const changedBuiltins = materials.filter(item => item.code && defaultMap.has(item.code) && (
    item.name.trim() !== defaultMap.get(item.code)!.name || item.color.toLowerCase() !== defaultMap.get(item.code)!.color
  ));
  const resetCodes = materials.filter(item => item.code && defaultMap.has(item.code) && !changedBuiltins.includes(item)).map(item => item.code!);
  if (changedBuiltins.length) {
    const { error } = await supabase.from('dental_material').upsert(changedBuiltins.map(item => ({
      clinic_id: clinicId, code: item.code, name: item.name.trim(), color: item.color,
      sort_order: defaultMap.get(item.code!)!.sortOrder, updated_at: new Date().toISOString(),
    })), { onConflict: 'clinic_id,code' });
    if (error) throw error;
  }
  if (resetCodes.length) {
    const { error } = await supabase.from('dental_material').delete().eq('clinic_id', clinicId).in('code', resetCodes);
    if (error) throw error;
  }
  const custom = materials.filter(item => !item.code);
  if (custom.length) {
    const { error } = await supabase.from('dental_material').upsert(custom.map((item, index) => ({
      id: item.id, clinic_id: clinicId, code: null, name: item.name.trim(), color: item.color,
      sort_order: defaults.length + index, updated_at: new Date().toISOString(),
    })), { onConflict: 'id' });
    if (error) throw error;
  }
}

export const dentalMaterials = { load, save };
