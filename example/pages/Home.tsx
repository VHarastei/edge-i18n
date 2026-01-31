import { useI18n } from "edge-i18n/react";

export function Home() {
  const { t, locale, setLocale } = useI18n("common");

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{t("welcome", { appName: "Edge i18n" })}</h1>
      <p>{t("greeting", { name: "World" })}</p>
      <p>
        {t("terms", {
          components: {
            link: (
              <a
                href="/terms"
                style={{ color: "#0066cc", textDecoration: "underline" }}
              />
            ),
          },
        })}
      </p>
      <div style={{ marginTop: "1rem" }}>
        <button
          type="button"
          onClick={() => setLocale(locale === "en" ? "cs" : "en")}
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
            borderRadius: "4px",
            border: "1px solid #ccc",
            background: "#f5f5f5",
          }}
        >
          {t("switchLang", { lang: locale === "en" ? "Cestina" : "English" })}
        </button>
      </div>
    </div>
  );
}
