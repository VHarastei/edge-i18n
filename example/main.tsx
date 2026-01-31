import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { TranslationBoundary } from "edge-i18n/react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TranslationBoundary fallback={<div style={{ padding: "2rem" }}>Loading...</div>}>
      <App />
    </TranslationBoundary>
  </StrictMode>,
);
