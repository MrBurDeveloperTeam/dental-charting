import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import App from "./App";
import { dentalPatients } from "./services/dentalPatients";
import { dentalCharts } from "./services/dentalCharts";

declare global {
  interface Window {
    dentalPatients: typeof dentalPatients;
    dentalCharts: typeof dentalCharts;
  }
}

window.dentalPatients = dentalPatients;
window.dentalCharts = dentalCharts;

const rootElement = document.getElementById("react-root");
if (!rootElement) throw new Error("Missing #react-root migration mount point");
flushSync(() => {
  createRoot(rootElement).render(<App />);
});
