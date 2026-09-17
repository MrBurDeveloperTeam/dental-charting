# Dental Charting — Quick Guide

## Project Overview

Dental Charting helps clinic staff record tooth conditions, plan treatments, and review patient visits.

- **Main screens:** Dental Chart, Patient Records, and Record Review / Edit.
- **Technology:** React + TypeScript, JavaScript, and Supabase (database and login session).
- **Code structure:** React handles navigation and patient records. The tooth chart still uses `index.html` and `public/js/app.js`.

## Charting Feature

### Flow

Select or create patient → Set visit date → Select tooth → Enter treatment → Click **Done** → Check **Cloud: saved ✓**.

### Tooth Chart Function

| Function | What it does |
| --- | --- |
| Tooth selection | Select a tooth to open its treatment editor. |
| Dentition | Switch between permanent (adult) and primary (baby) teeth. |
| Batch selection | Apply an entry to multiple selected teeth. |
| Chart display | Show tooth conditions and treatments using visual markings. |
| Existing / Planning | View current findings and planned treatments. |

**Code:** `public/js/app.js` — selection, `renderChart()`, and chart behaviour. `public/js/tooth-silhouettes.js` — tooth shapes.

### Sidebar Function

| Field / action | Purpose |
| --- | --- |
| Selected tooth | Show tooth number, name, and preview. |
| Surface / area | Choose the affected part of the tooth. |
| Condition / treatment | Choose the finding or procedure. |
| Material | Select a material where required; **Edit / Add** manages materials. |
| Status | Mark the entry as Existing or Planning. |
| Clinical note | Add a short optional note. |
| Done / Reset | Save the entry, or delete all entries from the selected tooth or teeth and reset the editor. |

**Code:** `index.html` — sidebar layout; `public/js/app.js` — `renderSidebar()` and `saveDraft()`; `public/js/materials.js` and `src/services/dentalMaterials.ts` — materials.

### Saved Entries

- Lists recorded entries under **Existing**, **Planning**, and **Review** when present.
- Open an entry to edit it; select entries to delete them with confirmation.
- Clicking **Done** starts the database save. The cloud indicator confirms the result.
- Each visit date has its own chart. Entries from earlier visit dates stay in their original chart and do not appear in a new visit.
- **Download PDF** opens the browser print dialog; choose **Save as PDF**.

**Code:** `public/js/app.js` — `renderEntries()`, `saveDraft()`, and `downloadPdf()`; `public/js/supabaseSync.js` — save/load events; `src/services/dentalCharts.ts` — database operations.

## Patient Records Flow

### Table

- Shows all chart visits saved for the signed-in clinic account.
- Columns: Patient, IC / ID, Chart visit, Appointment, Dentist, Entries, Status, Last updated.
- Search by name, IC / ID, phone, or date.
- Filter by visit date, status, gender, or preferred dentist; sort supported columns.
- Click a row to open the saved chart.

**Code:** `src/pages/PatientRecordsPage.tsx` — table and filters; `src/services/patientRecords.ts` — record retrieval.

### Patient Details

- Select an existing patient or create a patient from the chart's patient dialog.
- Record Review shows identity, contact details, dentist, dentition, and visit date.
- Change the visit dropdown to review another saved visit.
- Use **Edit chart** to change entries. Patient, date, and dentition controls are locked during editing.
- Save each entry with **Done**. **Save chart** returns to Record Review.

**Code:** `src/components/patient/PatientModal.tsx` — patient dialog; `src/services/dentalPatients.ts` — patient search/create; `src/App.tsx` — review and edit screens.

## Database Relationship

**Main relationship:** One patient → many chart visits → many tooth entries.

| Table | Stores | Relationship used by the app |
| --- | --- | --- |
| `profiles` | User's clinic assignment | `user_id` identifies the signed-in user; `clinic_id` selects the clinic. |
| `apt_patients` | Patient details | Patient `id` links to visit `patient_id`. |
| `dental_chart_visits` | Visit date, patient, appointment, dentist | Visit `id` links to entry `chart_visit_id`. |
| `dental_chart_entries` | Tooth, surfaces, treatment, status, material, note | Each entry belongs to a visit; `bridge_id` groups related prosthetic entries. |
| `appointments` | Appointment details | Optional visit `appointment_id` links to appointment `id`. |
| `apt_staff` | Dentist details | Referenced by `dentist_id` or patient `preferred_dentist_id`. |
| `dental_material` | Clinic material names and colours | Custom entry `material` stores the material ID; built-in materials use `material_code`. |

A new chart visit links to the latest-created appointment for the same patient and date, if available.

**Code:** `src/services/` — data access; `src/lib/supabaseClient.ts` — database connection; `migrations/` and `supabase/migrations/` — available schema changes.

*Relationships above reflect application code. This repository does not include the complete database schema.*

## Page Navigation Flow

These are screens within one app. `src/App.tsx` switches views; there are no separate `.aspx` pages.

| Step | Page / screen | Action | Outcome |
| --- | --- | --- | --- |
| 1 | Login / access check | User signs in through the connected system. | App establishes a user and clinic session. |
| 2 | Dental Chart | Select or create a patient and set the visit date. | Charting becomes available. |
| 3 | Dental Chart — sidebar | Select tooth, enter treatment, and click Done. | Entry appears and is sent to the database. |
| 4 | Dental Chart — Saved Entries | Review, edit, or delete entries. | Chart and saved data are updated. |
| 5 | Patient Records | Search or filter recent records. | Matching chart visits appear. |
| 6 | Record Review | Open a row and select a visit. | Patient details and saved chart appear. |
| 7 | Record Edit | Click Edit chart, save entry changes, then Save chart. | Return to Record Review. |
| 8 | Record Review | Click Download PDF or Back to Patient Records. | Open print/export dialog or return to the table. |

## Code Location Summary

| Area | Main location |
| --- | --- |
| App startup | `src/main.tsx` |
| Navigation, review, edit | `src/App.tsx` |
| Login access check | `src/components/auth/AuthGate.tsx` |
| Chart page wrapper | `src/pages/DentalChartPage.tsx` |
| Chart layout and functions | `index.html`, `public/js/app.js` |
| Chart-to-database connection | `public/js/supabaseSync.js`, `src/services/dentalCharts.ts` |
| Patient records | `src/pages/PatientRecordsPage.tsx`, `src/services/patientRecords.ts` |
| Patient selection and creation | `src/components/patient/PatientModal.tsx`, `src/services/dentalPatients.ts` |
| Styling | `css/chart.css`, `css/patient-records.css` |
