import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import html2canvas from "html2canvas";
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

declare global {
  interface Window {
    dentalPatients: typeof dentalPatients;
    dentalCharts: typeof dentalCharts;
    dentalMaterials: typeof dentalMaterials;
    html2canvas: typeof html2canvas;
  }
}

captureWorkspaceFromUrl();
window.dentalPatients = dentalPatients;
window.dentalCharts = dentalCharts;
window.dentalMaterials = dentalMaterials;
window.html2canvas = html2canvas;

const rootElement = document.getElementById("react-root");
if (!rootElement) throw new Error("Missing #react-root migration mount point");
flushSync(() => {
  createRoot(rootElement).render(<App />);
});
