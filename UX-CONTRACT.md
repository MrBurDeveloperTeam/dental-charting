# Chart editor UI contract

Source: user's 11 September 2026 material/condition sidebar request; existing clinic access is implemented by `getClinicSession` in `src/services/dentalPatients.ts`.

| Capability | Owner | Contract | Verification |
| --- | --- | --- | --- |
| Material selection | `renderMaterialGrid` in `public/js/materials.js` | Native buttons with pressed state; three columns; nullable selection | Desktop and 390px browser workflow |
| Material form | Existing treatment-manager modal, now managed by `public/js/materials.js` | Name/color only; unique nonempty names; explicit Save; inline loading/failure; Escape and Tab containment; focus restoration | Custom-material create/save and unit color tests |
| Chart form | `public/js/app.js` | Existing hidden category/view logic; explicit Done; material required for four restorations; no implicit cloud success | Bridge and material tests |
| Scrollbar | `css/base.css`, geometry in `css/layout.css` | Editor fields scroll while selected tooth stays visible | Desktop/mobile screenshot |
| CRUD | `src/services/dentalMaterials.ts`, `src/services/dentalCharts.ts` | Clinic-scoped records; errors propagated; no local color persistence | Build and unit tests; live database verification pending |
| Status | Existing chart status model | Existing/Planning for new entry UI; historical watch rows remain readable | Browser status step |

Sibling patient modal and saved-entry behaviors remain owned by their existing React/legacy integration. Native selects and date inputs in unrelated patient workflows are not redesigned by this change. The existing general-purpose premium audit cannot detect their delegated legacy handlers; its remaining findings are recorded in `docs/material-workflow.md`.
