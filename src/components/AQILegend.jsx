import styles from "./AQILegend.module.css";

const LEVELS = [
  { label: "Good",     range: "0–50",   color: "var(--risk-safe)" },
  { label: "Moderate", range: "51–100", color: "var(--risk-moderate)" },
  { label: "High",     range: "101–150",color: "var(--risk-high)" },
  { label: "Critical", range: "151+",   color: "var(--risk-critical)" },
];

export default function AQILegend() {
  return (
    <div className={`${styles.legend} glass-panel`}>
      {LEVELS.map((l) => (
        <div key={l.label} className={styles.row}>
          <span className={styles.dot} style={{ background: l.color }} />
          <span className={styles.label}>{l.label}</span>
          <span className={styles.range}>{l.range}</span>
        </div>
      ))}
    </div>
  );
}