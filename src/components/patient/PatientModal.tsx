/**
 * Patient modal markup extracted from index.html.
 *
 * During the compatibility phase, public/js/app.js continues to bind the existing
 * element IDs and owns validation, local storage, rendering, and open/close
 * behavior. Keeping those IDs stable prevents any functional change.
 */
export function PatientModal() {
  return (
    <div className="modal-backdrop" id="patient-modal" aria-hidden="true">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="patient-modal-title">
        <div className="modal-head">
          <div>
            <h3 id="patient-modal-title">Patient information</h3>
            <p>Update the patient header and keep it for later visits on this browser.</p>
          </div>
          <button className="icon-btn" type="button" id="patient-close-btn" aria-label="Close">✕</button>
        </div>

        <form className="patient-form" id="patient-form">
          <div className="patient-grid">
            <div className="patient-field full">
              <label htmlFor="patient-full-name">Full name</label>
              <input id="patient-full-name" name="fullName" type="text" placeholder="Type patient full name" />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-dob-text">Date of birth</label>
              <div className="date-field-shell">
                <input className="date-text-input" id="patient-dob-text" type="text" inputMode="numeric" placeholder="DD/MM/YYYY" autoComplete="bday" />
                <button className="date-picker-btn" id="patient-dob-trigger" type="button" aria-label="Open date of birth calendar">📅</button>
                <input id="patient-dob" name="dob" type="hidden" />
              </div>
            </div>

            <div className="patient-field">
              <label htmlFor="patient-id">Patient ID</label>
              <input id="patient-id" name="patientId" type="text" placeholder="Optional patient ID" />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-gender">Gender</label>
              <select id="patient-gender" name="gender" defaultValue="">
                <option value="">Not set</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="patient-field">
              <label htmlFor="patient-phone">Phone</label>
              <input id="patient-phone" name="phone" type="text" placeholder="Optional phone number" />
            </div>

            <div className="patient-field">
              <label htmlFor="patient-email">Email</label>
              <input id="patient-email" name="email" type="email" placeholder="Optional email" />
            </div>

            <div className="patient-field full">
              <label htmlFor="patient-notes">Basic information / notes</label>
              <textarea id="patient-notes" name="notes" placeholder="Medical alert, address, or basic information" />
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
