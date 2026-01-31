import { useI18n } from "edge-i18n/react";

export function Profile() {
  const { t } = useI18n("profile");

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{t("title")}</h1>
      <form
        onSubmit={(e) => e.preventDefault()}
        style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}
      >
        <label>
          {t("name")}
          <input
            type="text"
            placeholder="John Doe"
            style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          {t("email")}
          <input
            type="email"
            placeholder="john@example.com"
            style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          {t("bio")}
          <textarea
            rows={3}
            style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        <h2>{t("settings.title")}</h2>
        <p>{t("settings.theme")}: Light</p>
        <p>{t("settings.notifications")}: On</p>
        <button
          type="submit"
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
            borderRadius: "4px",
            border: "1px solid #0066cc",
            background: "#0066cc",
            color: "white",
            alignSelf: "flex-start",
          }}
        >
          {t("save")}
        </button>
      </form>
    </div>
  );
}
