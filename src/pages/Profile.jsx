import { useState } from "react";
import styles from "./Profile.module.css";

const SEVERITY_OPTIONS = [
  {
    value: "mild",
    label: "Mild",
    description: "Occasional symptoms, rarely limits activity",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Daily symptoms, some activity limitation",
  },
  {
    value: "severe",
    label: "Severe",
    description: "Continuous symptoms, severely limited activity",
  },
];

const TRIGGERS = [
  { id: "dust",      label: "Dust & Dust Mites", icon: "🌫️" },
  { id: "pollen",    label: "Pollen",             icon: "🌿" },
  { id: "cold_air",  label: "Cold Air",           icon: "🌬️" },
  { id: "smoke",     label: "Smoke & Wildfire",   icon: "🔥" },
  { id: "pets",      label: "Pet Dander",         icon: "🐾" },
  { id: "mold",      label: "Mold & Mildew",      icon: "🍄" },
  { id: "exercise",  label: "Exercise",           icon: "🏃" },
  { id: "pollution", label: "Traffic Pollution",  icon: "🚗" },
];

const THRESHOLD_OPTIONS = [
  { value: "moderate", label: "Moderate",  description: "Alert me at AQI > 50"  },
  { value: "high",     label: "High",      description: "Alert me at AQI > 100" },
  { value: "critical", label: "Critical",  description: "Alert me at AQI > 150" },
];

// ==== Page =====

export default function Profile() {
  // TODO: load initial state from GET /api/user/profile on mount
  const [severity,   setSeverity]   = useState("moderate");
  const [triggers,   setTriggers]   = useState(["dust", "pollen"]);
  const [threshold,  setThreshold]  = useState("high");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  function toggleTrigger(id) {
    setTriggers((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function handleSave() {
    // TODO: PUT /api/user/profile with { severity, triggers, notificationThreshold: threshold }
    console.log("Saving profile:", { severity, triggers, threshold, pushEnabled });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={styles.page}>

      {/* ─ Section: Asthma Severity ─ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Asthma Severity</h2>
        <p className={styles.sectionHint}>
          Your severity level tunes the risk scoring engine.
        </p>
        <div className={styles.severityGroup}>
          {SEVERITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.severityCard} glass-panel ${
                severity === opt.value ? styles.severityCardActive : ""
              }`}
              onClick={() => setSeverity(opt.value)}
              aria-pressed={severity === opt.value}
            >
              <div
                className={styles.severityIndicator}
                data-level={opt.value}
              />
              <span className={styles.severityLabel}>{opt.label}</span>
              <span className={styles.severityDesc}>{opt.description}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ─ Section: Known Triggers ─ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Known Triggers</h2>
        <p className={styles.sectionHint}>
          Selected triggers are factored into your personalized advice.
        </p>
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
                aria-pressed={active}
              >
                <span className={styles.triggerIcon}>{t.icon}</span>
                <span className={styles.triggerLabel}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─ Section: Notification Preferences ─ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>

        {/* Push toggle */}
        <div className={`${styles.toggleRow} glass-panel`}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>Push Alerts</span>
            <span className={styles.toggleDesc}>
              Notify me when air quality changes
            </span>
          </div>
          <button
            className={`${styles.toggle} ${pushEnabled ? styles.toggleOn : ""}`}
            onClick={() => setPushEnabled((p) => !p)}
            aria-checked={pushEnabled}
            role="switch"
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>

        {/* Threshold selector — only shown when push is enabled */}
        {pushEnabled && (
          <div className={styles.thresholdGroup}>
            <p className={styles.sectionHint}>Alert threshold</p>
            {THRESHOLD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.thresholdRow} glass-panel ${
                  threshold === opt.value ? styles.thresholdRowActive : ""
                }`}
                onClick={() => setThreshold(opt.value)}
                aria-pressed={threshold === opt.value}
              >
                <div
                  className={styles.thresholdDot}
                  data-level={opt.value}
                />
                <div className={styles.thresholdInfo}>
                  <span className={styles.thresholdLabel}>{opt.label}</span>
                  <span className={styles.thresholdDesc}>{opt.description}</span>
                </div>
                {threshold === opt.value && (
                  <span className={styles.thresholdCheck}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ─ Save button ─ */}
      <button
        className={`${styles.saveBtn} ${saved ? styles.saveBtnSuccess : ""}`}
        onClick={handleSave}
      >
        {saved ? "Saved ✓" : "Save Profile"}
      </button>

    </div>
  );
}
