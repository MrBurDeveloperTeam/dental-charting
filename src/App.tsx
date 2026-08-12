import { DentalChartPage } from "./pages/DentalChartPage";
import { PatientModal } from "./components/patient/PatientModal";
import { AuthGate } from "./components/auth/AuthGate";

export default function App() {
  const app = (
    <>
      <PatientModal />
      <DentalChartPage />
    </>
  );

  // Local-only CSS/UI debugging switch. Production can never use this bypass.
  const bypassAuth = import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === "true";

  return bypassAuth ? app : <AuthGate>{app}</AuthGate>;
}
