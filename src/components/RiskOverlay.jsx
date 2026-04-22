import styles from "./RiskOverlay.module.css";

const RISK_CONFIG = {
  safe:     { label: "Safe",     color: "#00e5c3", advice: "Air quality is good. Enjoy your time outside!" },
  moderate: { label: "Moderate", color: "#f5c518", advice: "Unusually sensitive people should consider limiting prolonged outdoor exertion." },
  high:     { label: "High",     color: "#ff7b2e", advice: "Reduce prolonged outdoor exertion. Keep your rescue inhaler handy." },
  critical: { label: "Critical", color: "#e53535", advice: "Avoid all outdoor activity. Stay indoors with windows closed." },
};

export default function RiskOverlay({ riskLevel, aqiData, isLoading, error, statusMessage, onLocateMe }) {
  const config = RISK_CONFIG[riskLevel] ?? RISK_CONFIG.safe;

  if (isLoading) {
    return (
      <div className={`${styles.card} glass-panel`}>
        <div className={styles.skeleton} />
        <div className={`${styles.skeleton} ${styles.skeletonShort}`} />
      </div>
    );
  }

  if (statusMessage) {
    return (
      <div className={`${styles.card} glass-panel`}>
        <p className={styles.statusMsg}>{statusMessage.text}</p>
        {statusMessage.type !== "error" && (
          <button className={styles.locateBtn} onClick={onLocateMe}>
            Enable Location
          </button>
        )}
      </div>
    );
  }

  if (error) {
  return (
    <div className={`${styles.card} glass-panel`}>
      <p className={styles.statusMsg}>
  {error?.message || "Unable to load air quality data."}
</p>

      <p className={styles.subMsg}>
        Check your connection or try another location.
      </p>

      <div className={styles.errorActions}>
        <button className={styles.locateBtn} onClick={onLocateMe}>
          Retry
        </button>

        <button
          className={styles.secondaryBtn}
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

  return (
    <div className={`${styles.card} glass-panel`} style={{ "--risk-color": config.color }}>

      {/* Pulse dot + risk label */}
      <div className={styles.header}>
        <span className={styles.pulseDot} />
        <span className={styles.riskLabel} style={{ color: config.color }}>
          {config.label}
        </span>
        <button className={styles.locateMeBtn} onClick={onLocateMe} title="Re-center on my location">
          ◎
        </button>
      </div>

      {/* Big AQI number */}
      <div className={styles.aqiNumber} style={{ color: config.color }}>
        {aqiData?.aqi ?? "—"}
      </div>
      <div className={styles.aqiUnit}>AQI</div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{aqiData?.pm25 ?? "—"}</span>
          <span className={styles.statKey}>PM2.5</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{aqiData?.temp ?? "—"}°</span>
          <span className={styles.statKey}>Temp</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{aqiData?.humidity ?? "—"}%</span>
          <span className={styles.statKey}>Humidity</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{aqiData?.pollen ?? "—"}</span>
          <span className={styles.statKey}>Pollen</span>
        </div>
      </div>

      {/* Advice */}
      <p className={styles.advice}>{config.advice}</p>

    </div>
  );
}