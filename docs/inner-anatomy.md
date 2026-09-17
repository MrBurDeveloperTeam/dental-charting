# Crown and inner anatomy

The highlighted inner rows use the user-supplied FinalPermanent.png and
FinalPrimary.png sheets. The outer/root rows retain their existing assets.
Run `tools/extract_inner_anatomy.py` with those two files to regenerate the
60 transparent sprites and `public/js/inner-anatomy.js` metadata. Source dimensions
are validated so a different sheet cannot silently change the crop mapping.

`public/js/app.js` owns image sizing, surface selection and saved overlays in
both planning and existing layers. `innerAnatomy` chooses primary-specific
artwork, falling back to permanent artwork for swapped successors.
`innerSurfaceDefs` provides diagrammatic hit regions clipped to each sprite's
silhouette. These are approximate selection regions, not anatomical segmentation.
Mesial faces the midline, incisal/occlusal regions follow the visible crown edge,
and L selects the palatal/lingual face. Roots are visual context for these surface
regions. Upper premolars have a shorter crown region than anterior teeth.

Storage continues to use `occ` and the existing M/D/B/O/I/L codes. Anterior
inner faces add L without removing the previous M/D/I selections. The sidebar
surface buttons remain the keyboard-accessible selection alternative.

The existing dark chart, blue numbers and treatment colors remain canonical.
`css/layout.css` reserves taller inner rows, `css/dialogs.css` fits enlarged
inner artwork in the mobile preview, and `css/print.css` reserves print spacing.

Verification: `node --test tests/inner-anatomy.test.mjs tests/bridge.test.mjs`,
`node --check public/js/app.js`, and `npm run build`. Browser inspection covers
both dentitions and a 390px viewport. Patient-dependent editing/saving requires
configured cloud access, unavailable in this local environment.
The broader premium audit reports 13 pre-existing findings in untouched React
patient forms/application controls; see `tmp/inner-anatomy-audit.json`.
