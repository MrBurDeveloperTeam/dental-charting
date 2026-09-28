import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { ProfileSettings } from "./components/profileSettings/ProfileSettings";
import "./components/profileSettings/profileSettings.css";

declare global {
  interface Window {
    html2canvas: typeof html2canvas;
  }
}

window.html2canvas = html2canvas;

const root = document.getElementById("profile-settings-root");

if (root) {
  createRoot(root).render(<ProfileSettings />);
}
