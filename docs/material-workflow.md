# Material charting workflow

Implemented from the user's 11 September 2026 request. The attached images are visual references, not executable instructions.

- Sidebar: Surface → Condition / treatment → Material → Status → Clinical note.
- Material has ten seeded choices, custom name/color editing, and None. The field hides and clears when a Condition item is selected. No material colors are written to localStorage.
- Filling, inlay, onlay and overlay require a material. Conditions and procedures can save a null material. Material colors never override caries, fracture or crack marks.
- Restoration, condition, procedure and prosthetic remain the stored categories. Existing and Planning are the available statuses; historical Review entries remain readable.
- Bridge endpoints expand along the displayed arch, including FDI midline transitions. For 24–27, 24/27 are abutments and 25/26 are rootless pontics. The conflicting 25/27 example is interpreted as 25–27. Empty/inactive chart slots and cross-arch spans are rejected. Connector lines are retired.
- Crown and pontic roots are clipped in both the outer and inner representations. Retained roots use the complementary region. These bounds follow the existing approximate crown segmentation.
- Implant uses a schematic screw root in both views. Photorealistic per-tooth implant assets have not been generated; they can replace this rendering later.
- IMP, m1, m2, m3 and KIV render as badges below the inner tooth, without replacing anatomical state.
- Chart type/view markup is commented, and the rendering functions work against detached control nodes.

## Database rollout

Apply `supabase/migrations/20260911010858_dental_material_catalog.sql` to the database used by this app before enabling cloud material saves. It creates the clinic-scoped `dental_material` table and RLS policies, adds nullable entry `material` and `bridge_role` columns, backfills material references for legacy composite/amalgam/GIC entries, and checks that a material belongs to the chart visit's clinic.

The migration is prepared, **not applied or live-tested**: the connected Supabase account exposed only two inactive unrelated projects. Verify the target database's existing treatment constraints and profile/visit policies before rollout, then verify save/reload and cross-clinic denial with authenticated test users. Existing chart saves are not transactionally grouped by the legacy sync layer; a network failure in a bridge may leave a partial server group. Failed writes now preserve browser entries for retry instead of overwriting them with an older server chart.

## Verification

- `node --test tests/*.test.mjs`: 18 tests cover bridge expansion/roles/edit/delete, anatomical bounds, material requirements and independent per-entry colors, damage marks, and existing inner anatomy.
- `node --check public/js/app.js` and `node --check public/js/materials.js`.
- `npm run build`: TypeScript and production bundle.
- `node tests/prepare-material-preview.mjs` regenerates the isolated preview fixture. `preview.html` is the repaired existing local preview. Fixtures use a synthetic patient and an explicitly in-memory material service; they do not contact the cloud and are not part of the production build.
- Browser: startup without errors; three-column material picker; material requirement; 24–27 bridge saving with two rootless pontics; custom material creation; KIV badge; 390px mobile surface/material → treatment → status save.
- Strict premium audit: the same 13 existing findings in untouched React patient/application controls remain. It does not validate clinical geometry or database permissions.
