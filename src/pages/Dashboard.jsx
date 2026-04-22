import { useState } from "react";
import useAirQuality from "../hooks/useAirQuality";
import useLocation from "../hooks/useLocation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import styles from "./Dashboard.module.css";

// ─ Mock data — replace with GET /api/forecast ─

const MOCK_HOURLY = [
  { hour: "00:00", aqi: 34 }, { hour: "02:00", aqi: 29 },
  { hour: "04:00", aqi: 38 }, { hour: "06:00", aqi: 55 },
  { hour: "08:00", aqi: 82 }, { hour: "10:00", aqi: 91 },
  { hour: "12:00", aqi: 87 }, { hour: "14:00", aqi: 73 },
  { hour: "16:00", aqi: 104 },{ hour: "18:00", aqi: 118 },
  { hour: "20:00", aqi: 96 }, { hour: "22:00", aqi: 61 },
];

const MOCK_WEEKLY = [
  { day: "Mon", riskLevel: "safe",     aqi: 42, high: 58 },
  { day: "Tue", riskLevel: "moderate", aqi: 87, high: 102 },
  { day: "Wed", riskLevel: "high",     aqi: 118, high: 130 },
  { day: "Thu", riskLevel: "moderate", aqi: 76, high: 88 },
  { day: "Fri", riskLevel: "safe",     aqi: 45, high: 60 },
  { day: "Sat", riskLevel: "safe",     aqi: 38, high: 50 },
  { day: "Sun", riskLevel: "moderate", aqi: 95, high: 110 },
];

const MOCK_ALERTS = [
  { id: 1, timestamp: "Today, 6:14 PM",   riskLevel: "high",     message: "AQI reached 118 — avoid outdoor exercise." },
  { id: 2, timestamp: "Today, 8:02 AM",   riskLevel: "moderate", message: "Morning AQI elevated. Keep inhaler nearby." },
  { id: 3, timestamp: "Yesterday, 3:45 PM", riskLevel: "critical", message: "AQI exceeded 160. Stay indoors." },
  { id: 4, timestamp: "Mon, 11:00 AM",    riskLevel: "moderate", message: "Pollen levels high. Triggers may be active." },
];

// ─ Helpers ─

function getRiskColor(level) {
  return {
    safe:     "var(--risk-safe)",
    moderate: "var(--risk-moderate)",
    high:     "var(--risk-high)",
    critical: "var(--risk-critical)",
  }[level] ?? "var(--text-muted)";
}

function getAqiRiskLevel(aqi) {
  if (aqi <= 50)  return "safe";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "high";
  return "critical";
}

// ─ Sub-components ─

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const aqi = payload[0].value;
  const level = getAqiRiskLevel(aqi);
  return (
    <div className={styles.chartTooltip}>
      <span className={styles.tooltipHour}>{label}</span>
      <span className={styles.tooltipAqi} style={{ color: getRiskColor(level) }}>
        AQI {aqi}
      </span>
    </div>
  );
}

function ForecastCard({ day, aqi, high, riskLevel }) {
  return (
    <div className={`${styles.forecastCard} glass-panel`}>
      <span className={styles.forecastDay}>{day}</span>
      <div
        className={styles.forecastDot}
        style={{ background: getRiskColor(riskLevel) }}
      />
      <span
        className={`${styles.forecastAqi} risk-badge risk-${riskLevel}`}
      >
        {aqi}
      </span>
      <span className={styles.forecastHigh}>↑ {high}</span>
    </div>
  );
}

function AlertRow({ timestamp, riskLevel, message }) {
  return (
    <div className={styles.alertRow}>
      <div
        className={styles.alertAccent}
        style={{ background: getRiskColor(riskLevel) }}
      />
      <div className={styles.alertBody}>
        <p className={styles.alertMessage}>{message}</p>
        <span className={styles.alertTime}>{timestamp}</span>
      </div>
      <span className={`risk-badge risk-${riskLevel}`}>{riskLevel}</span>
    </div>
  );
}

// ─ Page ─

export default function Dashboard() {
  const { coords } = useLocation();
  const { aqiData } = useAirQuality(coords);
  
  const locationName = aqiData?.stations?.[0]?.name || "Local Area";
  
  const hourly = MOCK_HOURLY;
  const weekly = MOCK_WEEKLY;
  const alerts = MOCK_ALERTS;

  const [alertFilter, setAlertFilter] = useState("all");

  const filteredAlerts = alertFilter === "all"
    ? alerts
    : alerts.filter((a) => a.riskLevel === alertFilter);

  return (
    <div className={`${styles.page} animate-fade-up`}>
      <header className={styles.header}>
        <h1 className={styles.title}>BreatheFresh Dashboard</h1>
        <p className={styles.subtitle}>Forecast and trends for <span className={styles.location}>{locationName}</span></p>
      </header>

      {/* ── Section: 24h AQI Trend ── */}
      <section className={`${styles.card} glass-panel`}>
        <h2 className={styles.cardTitle}>24h Air Quality Trend</h2>
        {/* TODO: fetch real hourly data from GET /api/forecast */}
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={hourly} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="hour"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 160]}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Threshold reference lines */}
            <ReferenceLine y={50}  stroke="var(--risk-safe)"     strokeDasharray="4 4" strokeOpacity={0.4} />
            <ReferenceLine y={100} stroke="var(--risk-moderate)" strokeDasharray="4 4" strokeOpacity={0.4} />
            <ReferenceLine y={150} stroke="var(--risk-high)"     strokeDasharray="4 4" strokeOpacity={0.4} />
            <Line
              type="monotone"
              dataKey="aqi"
              stroke="var(--accent-teal)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "var(--accent-teal)", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* ── Section: Weekly Forecast ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7-Day Forecast</h2>
        {/* TODO: fetch from GET /api/forecast weekly endpoint */}
        <div className={styles.forecastRow}>
          {weekly.map((day) => (
            <ForecastCard key={day.day} {...day} />
          ))}
        </div>
      </section>

      {/* ── Section: Alert History ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Alert History</h2>
          <div className={styles.filterPills}>
            {["all", "critical", "high", "moderate"].map((f) => (
              <button
                key={f}
                className={`${styles.filterPill} ${alertFilter === f ? styles.filterPillActive : ""}`}
                onClick={() => setAlertFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {/* TODO: fetch from GET /api/alerts or add to /api/forecast response */}
        <div className={styles.alertList}>
          {filteredAlerts.length === 0 ? (
            <p className={styles.emptyState}>No {alertFilter} alerts on record.</p>
          ) : (
            filteredAlerts.map((a) => <AlertRow key={a.id} {...a} />)
          )}
        </div>
      </section>

    </div>
  );
}
