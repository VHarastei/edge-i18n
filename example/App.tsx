import { useState } from "react";
import { useI18n } from "edge-i18n/react";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { i18n } from "./i18n";

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
          onMouseEnter={() => i18n.loadNamespace("profile")}
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
      {page === "home" && <Home />}
      {page === "profile" && <Profile />}
    </div>
  );
}
