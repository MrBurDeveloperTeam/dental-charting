import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import App from "./App";

const rootElement = document.getElementById("react-root");
if (!rootElement) throw new Error("Missing #react-root migration mount point");
flushSync(() => {
  createRoot(rootElement).render(<App />);
});
