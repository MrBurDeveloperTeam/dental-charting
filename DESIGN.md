---
version: alpha
name: "SNABBB Dental Charting"
description: "A dense clinical odontogram workspace that keeps charting, treatment entry, and saved history visible together."
colors:
  primary: "#1a78e8"
  primaryDark: "#1565c0"
  background: "#f0f4fb"
  panel: "#ffffff"
  panelSoft: "#f5f7fa"
  ink: "#1a2332"
  muted: "#6b7a90"
  board: "#0d1725"
  line: "rgba(26,120,232,.15)"
typography:
  sans:
    fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
rounded:
  DEFAULT: "0.75rem"
  sm: "0.375rem"
  md: "0.75rem"
  lg: "1.25rem"
spacing:
  control-gap: "0.625rem"
  panel-gap: "0.75rem"
  section-gap: "1.125rem"
components:
  button: { }
  chartBoard: { }
  treatmentPanel: { }
  entriesPanel: { }
  dialog: { }
---

# SNABBB Dental Charting Design System

## Overview

The visual North Star is a dentist's illuminated charting station: a dark, high-contrast odontogram surrounded by quiet white clinical controls and compact blue annotations.

- **Audience and job:** Dental clinicians recording conditions and planned treatment while reviewing saved entries.
- **Market and locale:** Not specified in repository evidence; the English interface remains market-neutral.
- **Usage:** Desktop-first, information-dense clinical work with responsive mobile entry dialogs.
- **Register:** Product interface; speed, legibility, and persistent context lead.
- **Signature:** The dark odontogram board is the visual anchor.
- **Restraint:** Treatment controls and history stay flat and pale so they do not compete with tooth-state colors.
- **Anti-references:** Avoid consumer wellness styling, decorative gradients, and oversized dashboard cards.
- **Runtime mapping:** This file mirrors `css/base.css`; responsive layout behavior is owned by `css/layout.css`.

## Colors

Blue denotes selection and primary action. White and pale blue-gray surfaces separate work regions. The near-navy board isolates tooth anatomy and treatment overlays. Semantic treatment colors are not decorative colors.

## Typography

Inter is the product face. Compact uppercase labels identify clinical fields; sentence case is used for actions and guidance. Tooth numbers and chart codes use heavier weights for scanability.

## Layout

On wide screens, the clinical heading spans the full workspace. Below it, the order is a compact odontogram, a dominant treatment editor, then a widened saved-entry panel. All three panels share an exact 760px height. The treatment and saved-entry panels are separate rounded containers, while the odontogram is centered vertically and its tooth rows are centered horizontally. The selected-tooth summary stays visible while only treatment fields scroll. Tablet and phone widths keep the established stacked layout and mobile flow.

## Elevation & Depth

Hierarchy comes from tonal contrast and one-pixel rules. The treatment editor is a separate rounded card with a restrained shadow and clear space before the saved-entry rail. Dialogs may use the shared shadow token.

## Shapes

Controls use the shared 12px radius. Dense field chips may use 6px radii. The chart board uses the 20px large radius on desktop and tighter corners on mobile.

## Components

All controls require clear hover, focus-visible, active, selected, and disabled states. Treatment-field scrollbars remain visible and inherit application tokens; the saved-entry list is the documented compact-rail exception, remaining wheel/touch/keyboard scrollable while its scrollbar chrome is hidden. Blue solid buttons commit, white outlined buttons are secondary, and red is destructive. The selected-tooth summary is fixed within the editor column; its lower fields own vertical scrolling. Motion is limited to short hover and selection feedback.

## Do's and Don'ts

- **Do:** Keep desktop work regions in chart → treatment → saved-entry order, with treatment as the widest working column.
- **Do:** Preserve the dark board as the visual landmark and reuse runtime tokens.
- **Don't:** Let long treatment content push the selected-tooth summary off screen.
- **Don't:** Hide scrollbars or add decorative color to clinical controls.

## Material and condition workflow

The treatment editor follows surface → material → condition/treatment → status → clinical note. Chart-type and view controls remain commented in the markup; the existing category and view models still drive chart geometry and persistence. Material swatches use a three-column grid, while condition/treatment buttons use neutral text and category headings. The name/color-only editor reuses the existing modal and saves the clinic catalogue through `src/services/dentalMaterials.ts`.

Clinical colors come from `dental_material`, referenced by nullable entry material IDs. The built-in palette uses distinct, clinically inspired families: cool silver for amalgam, saturated resin amber for composite so it remains visible against the warm tooth anatomy, translucent aqua-gray for GIC, high-value cool white for zirconia, peach enamel for eMax, blue-white porcelain plus its dark cervical line for PFM, warm yellow metal for gold, dark alloy for generic metal, pale yellow resin for temporary work, and warm ivory for ceramic. Defaults are defined by the migration and mirrored in the service and offline fixture; live catalog rows are authoritative. Later palette migrations may replace only untouched legacy default values and must preserve clinic edits. Presentation geometry and below-tooth annotation badges live in `public/js/materials.js`; `css/materials.css` owns the new editor styles without replacing the application's palette or typography.

Bridge and implant use procedure fallbacks only when no material is selected: structural indigo (`#6366f1`) for bridge and surgical teal (`#0f9fa8`) for implant. A selected material remains authoritative and replaces the fallback on the rendered restoration.

Crown-view surfaces use the previous anatomical circular-sector map, scaled into the photographed crown bounds so overlays do not reach the roots. Teeth 13, 12, 11, 21, 22, 23, 42, 41, and 32 intentionally retain the established straight-edged anterior geometry; surface codes, selection targets, and persistence are unchanged.
