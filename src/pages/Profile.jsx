import { useState } from "react";
import styles from "./Profile.module.css";

const SEVERITY_OPTIONS = [
  {
    value: "mild_persistent",
    label: "Mild",
    description: "Occasional symptoms, rarely limits activity",
  },
  {
    value: "moderate_persistent",
    label: "Moderate",
    description: "Daily symptoms, some activity limitation",
  },
  {
    value: "severe_persistent",
    label: "Severe",
    description: "Continuous symptoms, severely limited activity",
  },
];

const TRIGGERS = [
  { id: "Pollen or Outdoor Mold",    label: "Pollen",             icon: "🌿" },
  { id: "Outdoor Pollution OR Wildfire Smoke",     label: "Smoke & Wildfire",   icon: "🔥" },
  { id: "Cold Air",  label: "Cold Air",           icon: "🌬️" },
  { id: "Heat or High Humidity",  label: "Heat & Humidity",    icon: "☀️" },
  { id: "Indoor Mold or Dampness",      label: "Mold & Mildew",      icon: "🍄" },
  { id: "Physical Exercise",  label: "Exercise",           icon: "🏃" },
];

const THRESHOLD_OPTIONS = [
  { value: "moderate", label: "Moderate",  description: "Alert me at AQI > 50"  },
  { value: "high",     label: "High",      description: "Alert me at AQI > 100" },
  { value: "critical", label: "Critical",  description: "Alert me at AQI > 150" },
];

// ==== Page =====

export default function Profile() {
  const [severity, setSeverity] = useState(() => localStorage.getItem("bf_severity") || "moderate_persistent");
  const [triggers, setTriggers] = useState(() => {
    const saved = localStorage.getItem("bf_triggers");
    return saved ? JSON.parse(saved) : ["Pollen or Outdoor Mold"];
  });
  const [threshold, setThreshold] = useState(() => localStorage.getItem("bf_threshold") || "high");
  const [pushEnabled, setPushEnabled] = useState(() => {
    const saved = localStorage.getItem("bf_push");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [saved, setSaved] = useState(false);

  function toggleTrigger(id) {
    setTriggers((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function handleSave() {
    localStorage.setItem("bf_severity", severity);
    localStorage.setItem("bf_triggers", JSON.stringify(triggers));
    localStorage.setItem("bf_threshold", threshold);
    localStorage.setItem("bf_push", JSON.stringify(pushEnabled));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Health Profile</h1>
        <p className={styles.subtitle}>Personalize your respiratory risk model for more accurate insights.</p>
      </header>

      {/* ── Section: Asthma Severity ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Asthma Severity</h2>
        <div className={styles.severityGroup}>
          {SEVERITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.severityCard} glass-panel ${
                severity === opt.value ? styles.severityCardActive : ""
              }`}
              onClick={() => setSeverity(opt.value)}
            >
              <div className={styles.severityIndicator} data-level={opt.value} />
              <div className={styles.severityInfo}>
                <span className={styles.severityLabel}>{opt.label}</span>
                <span className={styles.severityDesc}>{opt.description}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Section: Known Triggers ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Known Triggers</h2>
        <div className={styles.triggerGrid}>
          {TRIGGERS.map((t) => {
            const active = triggers.includes(t.id);
            return (
              <button
                key={t.id}
                className={`${styles.triggerChip} glass-panel ${
                  active ? styles.triggerChipActive : ""
                }`}
                onClick={() => toggleTrigger(t.id)}
              >
                <span className={styles.triggerIcon}>{t.icon}</span>
                <span className={styles.triggerLabel}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section: Notification Preferences ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Alert Preferences</h2>

        <div className={`${styles.toggleRow} glass-panel`}>
          <div className={styles.severityInfo}>
            <span className={styles.toggleLabel}>Push Notifications</span>
            <span className={styles.toggleDesc}>Critical risk alerts & weekly forecasts</span>
          </div>
          <button
            className={`${styles.toggle} ${pushEnabled ? styles.toggleOn : ""}`}
            onClick={() => setPushEnabled((p) => !p)}
            role="switch"
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>

        {pushEnabled && (
          <div className={styles.thresholdGroup}>
            {THRESHOLD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.thresholdRow} glass-panel ${
                  threshold === opt.value ? styles.thresholdRowActive : ""
                }`}
                onClick={() => setThreshold(opt.value)}
              >
                <span className={styles.thresholdLabel}>{opt.label} Level</span>
                {threshold === opt.value && <span className={styles.thresholdCheck}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </section>

      <button
        className={`${styles.saveBtn} ${saved ? styles.saveBtnSuccess : ""}`}
        onClick={handleSave}
      >
        {saved ? "Profile Saved" : "Apply Changes"}
      </button>
    </div>
  );
}
