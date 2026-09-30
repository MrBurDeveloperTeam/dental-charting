import { createRoot } from "react-dom/client";
import { chartToBlob } from "./services/chartImage";
import { ProfileSettings } from "./components/profileSettings/ProfileSettings";
import "./components/profileSettings/profileSettings.css";

declare global {
  interface Window {
    chartToBlob: typeof chartToBlob;
  }
}

window.chartToBlob = chartToBlob;

const root = document.getElementById("profile-settings-root");

if (root) {
  createRoot(root).render(<ProfileSettings />);
}
