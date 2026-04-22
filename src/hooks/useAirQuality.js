import { useState, useEffect } from "react";

const airnowKey = import.meta.env.VITE_AIRNOW_KEY;

// Safe fetcher — never throws, returns null on failure, logs details
const safeFetch = async (url) => {
  try {
    const res = await fetch(url);
    if (res.ok) return res.json();
    const body = await res.text().catch(() => "");
    console.warn(`[BreatheFresh] Fetch ${res.status} for ${url}:`, body.slice(0, 200));
    return null;
  } catch (e) {
    console.warn(`[BreatheFresh] Fetch failed for ${url}:`, e.message);
    return null;
  }
};

export default function useAirQuality(coords) {
  const [aqiData, setAqiData]    = useState(null);
  const [riskLevel, setRiskLevel] = useState("safe");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (!coords) return;
    const { lat, lon } = coords;
    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      // ── 1. AirNow — primary AQI + stations ──
      const airnowUrl =
        `https://www.airnowapi.org/aq/observation/latLong/current/` +
        `?format=application/json` +
        `&latitude=${lat}&longitude=${lon}` +
        `&distance=250&API_KEY=${airnowKey}`;
      
      console.log("[BreatheFresh] Fetching AirNow:", airnowUrl);
      const observations = await safeFetch(airnowUrl) ?? [];
      console.log("observations:", observations);
      console.log("[BreatheFresh] AirNow returned", observations.length, "observations");

      if (!isMounted) return;

      const stations = observations
        .filter(o => o.Latitude && o.Longitude && o.AQI != null)
        .map((o, i) => ({
          id:   `station-${i}-${o.ReportingArea}`,
          lat:  Number(o.Latitude),
          lon:  Number(o.Longitude),
          aqi:  Number(o.AQI),
          name: o.ReportingArea,
        }));

      console.log("stations:", stations);
      console.log("first station name:", stations[0]?.name);

      const pm25Obs = observations.find(o => o.ParameterName === "PM2.5");
      const pm25    = pm25Obs ? Math.round(Number(pm25Obs.AQI)) : null;
      const mainAqi = stations[0]?.aqi ?? 0;
      const city = stations[0]?.name || null;

      // Push stations to state immediately — heatmap renders now
      if (isMounted) setAqiData({ stations, aqi: mainAqi, pm25 });
      console.log("city being set:", city);

      // ── 2. Open-Meteo weather + air quality in parallel (secondary) ──
      const [weather, pollenData] = await Promise.all([
        safeFetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,relative_humidity_2m&temperature_unit=fahrenheit&timezone=auto`
        ),
        safeFetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
          `&hourly=european_aqi,pm2_5&forecast_days=1&timezone=auto`
        ),
      ]);

      if (!isMounted) return;

      const temp     = weather?.current?.temperature_2m     != null ? Math.round(weather.current.temperature_2m)     : null;
      const humidity = weather?.current?.relative_humidity_2m != null ? Math.round(weather.current.relative_humidity_2m) : null;
      const pollen   = pollenData?.hourly?.european_aqi?.[0] ?? null;

      // Update state with full environmental picture
      if (isMounted) setAqiData(prev => ({ ...prev, temp, humidity, pollen }));

      // ── 3. Backend personalized risk (optional — 3s timeout) ──
      const severity = localStorage.getItem("bf_severity") || "moderate_persistent";
      const triggers = JSON.parse(localStorage.getItem("bf_triggers") || "[]");

      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);

        const riskRes = await fetch("http://localhost:8000/risk", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          signal:  controller.signal,
          body: JSON.stringify({
            aqi:     mainAqi,
            temp:    temp    ?? 20,
            hum:     humidity ?? 50,
            thunder: false,
            profile: { severity, triggers },
          }),
        });
        clearTimeout(tid);

        if (riskRes.ok) {
          const riskData = await riskRes.json();
          if (isMounted) {
            setRiskLevel(riskData.risk_level.toLowerCase());
            setAqiData(prev => ({ ...prev, personalizedRisk: riskData }));
          }
        } else {
          throw new Error("non-ok");
        }
      } catch {
        // Local fallback — always works
        if (isMounted) {
          if      (mainAqi <= 50)  setRiskLevel("safe");
          else if (mainAqi <= 100) setRiskLevel("moderate");
          else if (mainAqi <= 150) setRiskLevel("high");
          else                     setRiskLevel("critical");
        }
      }

      if (isMounted) setIsLoading(false);
    }

    fetchData();
    return () => { isMounted = false; };
  }, [coords]);

  return { aqiData, riskLevel, isLoading, error };
}
