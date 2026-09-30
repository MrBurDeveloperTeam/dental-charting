import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { chartToBlob } from "./services/chartImage";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import App from "./App";
import { captureWorkspaceFromUrl } from "./services/workspaceContext";
import { dentalPatients } from "./services/dentalPatients";
import { dentalCharts } from "./services/dentalCharts";
import { dentalMaterials } from "./services/dentalMaterials";
import { startActivityTracking } from "./services/activityLog";
import { loadLegacyChartScripts } from "./legacy/loadLegacyChartScripts";

declare global {
  interface Window {
    dentalPatients: typeof dentalPatients;
    dentalCharts: typeof dentalCharts;
    dentalMaterials: typeof dentalMaterials;
    chartToBlob: typeof chartToBlob;
  }
}

captureWorkspaceFromUrl();
window.dentalPatients = dentalPatients;
window.dentalCharts = dentalCharts;
window.dentalMaterials = dentalMaterials;
window.chartToBlob = chartToBlob;
// Must run after the window.dental* services above exist — it wraps them.
// Local UI review does not have a Snabbb session, so avoid a guaranteed 401.
if (!(import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === "true")) {
  startActivityTracking();
}

const rootElement = document.getElementById("react-root");
if (!rootElement) throw new Error("Missing #react-root migration mount point");
flushSync(() => {
  createRoot(rootElement).render(<App />);
});
// Classic scripts share globals and must bind after React mounts the patient form.
void loadLegacyChartScripts().catch((error: unknown) => {
  console.error("Unable to initialize the dental chart", error);
});
