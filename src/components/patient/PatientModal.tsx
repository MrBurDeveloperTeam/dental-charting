import { useState } from "react";

/**
 * Patient modal markup extracted from index.html.
 *
 * During the compatibility phase, public/js/app.js continues to bind the existing
 * element IDs and owns validation, local storage, rendering, and open/close
 * behavior. Keeping those IDs stable prevents any functional change.
 */
export function PatientModal() {
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");

  return (
    <div className="modal-backdrop" id="patient-modal" aria-hidden="true">
      <div className="modal patient-modal" role="dialog" aria-modal="true" aria-labelledby="patient-modal-title">
        <div className="modal-head">
          <div>
            <h3 id="patient-modal-title">Patient information</h3>
            <p>Find an existing patient or add a new patient to begin charting.</p>
          </div>
          <button className="icon-btn" type="button" id="patient-close-btn" aria-label="Close">✕</button>
        </div>

        <div className="patient-tabs" role="tablist" aria-label="Patient options">
          <button className={`patient-tab ${activeTab === "existing" ? "active" : ""}`} type="button" role="tab" aria-selected={activeTab === "existing"} aria-controls="existing-patient-panel" onClick={() => setActiveTab("existing")}>Existing Patient</button>
          <button className={`patient-tab ${activeTab === "new" ? "active" : ""}`} type="button" role="tab" aria-selected={activeTab === "new"} aria-controls="patient-form" onClick={() => setActiveTab("new")}>New Patient</button>
        </div>

        <section className="existing-patient-panel" id="existing-patient-panel" role="tabpanel" hidden={activeTab !== "existing"}>
          <div className="patient-search-copy">
            <h4>Search existing patients</h4>
            <p>Search by patient name, phone number, IC/ID, or email address.</p>
          </div>
          <div className="patient-search-bar">
            <input id="patient-search-input" type="search" placeholder="Search name, phone, IC/ID, or email" aria-label="Search existing patients" />
            <button className="btn primary" id="patient-search-btn" type="button">Search</button>
          </div>
          <div className="patient-search-results" id="patient-search-results" aria-live="polite">
            <div className="patient-search-empty">
              <span className="patient-search-icon" aria-hidden="true">⌕</span>
              <strong>Search for a patient</strong>
              <p>Matching patients will appear here for selection.</p>
            </div>
          </div>
        </section>

        <form className="patient-form" id="patient-form" role="tabpanel" hidden={activeTab !== "new"}>
          <div className="patient-grid">
            <div className="patient-field full">
              <label htmlFor="patient-full-name">Full name</label>
              <input id="patient-full-name" name="fullName" type="text" placeholder="Type patient full name" required />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-dob-text">Date of birth</label>
              <div className="date-field-shell">
                <input className="date-text-input" id="patient-dob-text" type="text" inputMode="numeric" placeholder="DD/MM/YYYY" autoComplete="bday" />
                <button className="date-picker-btn" id="patient-dob-trigger" type="button" aria-label="Open date of birth calendar">📅</button>
                <input id="patient-dob" name="dob" type="hidden" />
              </div>
            </div>

            {/* Internal database ID: populated automatically when patient records are connected. */}
            <input id="patient-id" name="patientId" type="hidden" />

            <div className="patient-field">
              <label htmlFor="patient-id-number">IC/ID</label>
              <input id="patient-id-number" name="idNumber" type="text" placeholder="Identity card / ID number" />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-gender">Gender</label>
              <select id="patient-gender" name="gender" defaultValue="">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="patient-field">
              <label htmlFor="patient-tax-number">Tax Number</label>
              <input id="patient-tax-number" name="taxNumber" type="text" placeholder="Optional tax number" />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-phone">Phone</label>
              <input id="patient-phone" name="phone" type="tel" placeholder="Phone number" required />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-email">Email</label>
              <input id="patient-email" name="email" type="email" placeholder="Optional email" />
            </div>

            <div className="patient-field full">
              <label>
                <input id="patient-email-is-guardian" name="emailIsGuardian" type="checkbox" />
                {' '}This email belongs to the patient's parent or legal guardian
              </label>
            </div>

            <div className="patient-field">
              <label htmlFor="patient-guardian-name">Parent / Guardian Name</label>
              <input id="patient-guardian-name" name="guardianName" type="text" placeholder="Enter full name" />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-guardian-relationship">Relationship to Patient</label>
              <select id="patient-guardian-relationship" name="guardianRelationship" defaultValue="">
                <option value="">Select</option>
                <option value="parent">Parent</option>
                <option value="legal-guardian">Legal guardian</option>
                <option value="other-responsible-adult">Other responsible adult</option>
              </select>
            </div>

            <div className="patient-field full">
              <label htmlFor="patient-address">Address</label>
              <input id="patient-address" name="address" type="text" placeholder="Patient address" />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-emergency-name">Emergency Contact Name</label>
              <input id="patient-emergency-name" name="emergencyContactName" type="text" />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-emergency-phone">Emergency Contact Phone</label>
              <input id="patient-emergency-phone" name="emergencyContactPhone" type="tel" />
            </div>

            <div className="patient-field full">
              <label htmlFor="patient-allergies">Allergies</label>
              <textarea id="patient-allergies" name="allergies" />
            </div>

            <div className="patient-field full">
              <label htmlFor="patient-medical-conditions">Medical Conditions</label>
              <textarea id="patient-medical-conditions" name="medicalConditions" />
            </div>

            <div className="patient-field full">
              <label htmlFor="patient-medications">Medications</label>
              <textarea id="patient-medications" name="medications" />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-source">Source</label>
              <select id="patient-source" name="source" defaultValue="">
                <option value="">Select</option>
                <option value="walk-in">Walk-in</option>
                <option value="call">Call</option>
                <option value="social-media">Social Media</option>
                <option value="referral">Referral</option>
                <option value="phone">Phone</option>
                <option value="google">Google</option>
                <option value="website">Website</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="patient-field">
              <label htmlFor="patient-preferred-dentist">Preferred Dentist</label>
              <input id="patient-preferred-dentist" name="preferredDentist" type="text" placeholder="No preference" />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-insurance">Insurance</label>
              <input id="patient-insurance" name="insurance" type="text" />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-notes">Notes</label>
              <textarea id="patient-notes" name="notes" />
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn secondary" type="button" id="patient-clear-btn">Clear</button>
            <button className="btn secondary" type="button" id="patient-cancel-btn">Cancel</button>
            <button className="btn primary" type="submit">Save patient</button>
          </div>
        </form>
      </div>
    </div>
  );
}
