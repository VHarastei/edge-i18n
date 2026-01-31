import { Suspense, useState } from "react";
import { useI18n } from "edge-i18n/react";
import { TranslationBoundary } from "edge-i18n/react";
import { I18nCore } from "edge-i18n";
import { Home } from "./pages/Home.js";
import { Profile } from "./pages/Profile.js";

import "./i18n.js";

type Page = "home" | "profile";

export function App() {
  const [page, setPage] = useState<Page>("home");
  const { t } = useI18n("common");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <nav
        style={{
          display: "flex",
          gap: "1rem",
          padding: "1rem 2rem",
          borderBottom: "1px solid #eee",
          background: "#fafafa",
        }}
      >
        <button
          type="button"
          onClick={() => setPage("home")}
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
            border: "none",
            background: page === "home" ? "#0066cc" : "transparent",
            color: page === "home" ? "white" : "inherit",
            borderRadius: "4px",
          }}
        >
          {t("nav.home")}
        </button>
        <button
          type="button"
          onClick={() => setPage("profile")}
          onMouseEnter={() => I18nCore.getInstance().loadNamespace("profile")}
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
            border: "none",
            background: page === "profile" ? "#0066cc" : "transparent",
            color: page === "profile" ? "white" : "inherit",
            borderRadius: "4px",
          }}
        >
          {t("nav.profile")}
        </button>
      </nav>
      {page === "home" && (
        <Suspense fallback={<div style={{ padding: "2rem" }}>Loading HOME</div>}>
          <Home />
        </Suspense>
      )}
      {page === "profile" && (
        <TranslationBoundary
          fallback={<div style={{ padding: "2rem" }}>Loading PROFILE</div>}
        >
          <Profile />
        </TranslationBoundary>
      )}
    </div>
  );
}
