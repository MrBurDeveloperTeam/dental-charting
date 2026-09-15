import { createRoot } from "react-dom/client";
import { ProfileSettings } from "./components/profileSettings/ProfileSettings";
import "./components/profileSettings/profileSettings.css";

const root = document.getElementById("profile-settings-root");

if (root) {
  createRoot(root).render(<ProfileSettings />);
}
