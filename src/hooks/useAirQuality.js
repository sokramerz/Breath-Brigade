import { useState, useEffect } from "react";

const airnowKey = import.meta.env.VITE_AIRNOW_KEY;
// Open-Meteo is free with no API key needed

const fetchWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
    }
  }
};

export default function useAirQuality(coords) {
  const [aqiData, setAqiData] = useState(null);
  const [riskLevel, setRiskLevel] = useState("safe");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!coords) return;
    const { lat, lon } = coords;

    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch AirNow + Weather in parallel
        let observations = [];
        let weather = null;
        let pollenData = null;

        try {
          [observations, weather, pollenData] = await Promise.all([
            fetchWithRetry(
              `https://www.airnowapi.org/aq/observation/latLong/current/` +
              `?format=application/json` +
              `&latitude=${lat}&longitude=${lon}` +
              `&distance=250&API_KEY=${airnowKey}`
            ),
            // Open-Meteo current weather — free, no API key
            fetchWithRetry(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
              `&current=temperature_2m,relative_humidity_2m&temperature_unit=fahrenheit&timezone=auto`
            ),
            fetchWithRetry(
              `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=european_aqi,pm2_5&forecast_days=1&timezone=auto`
            ),
          ]);
        } catch (e) {
          console.warn("Parallel fetch failed:", e);
        }

        if (!isMounted) return;

        // Process AirNow stations
        const stations = (observations || []).map((o, i) => ({
          id:   `station-${i}-${o.ReportingArea}`,
          lat:  Number(o.Latitude),
          lon:  Number(o.Longitude),
          aqi:  Number(o.AQI),
          name: o.ReportingArea,
        }));

        if (stations.length === 0 && !weather) {
          setIsLoading(false);
          return;
        }

        // Pull PM2.5 from AirNow (parameter 88101 = PM2.5)
        const pm25Obs = (observations || []).find(o => o.ParameterName === "PM2.5");
        const pm25 = pm25Obs ? Math.round(pm25Obs.AQI) : null;

        // Pull temp + humidity from Open-Meteo current weather
        const current  = weather?.current;
        const temp     = current?.temperature_2m    != null ? Math.round(current.temperature_2m)    : null;
        const humidity = current?.relative_humidity_2m != null ? Math.round(current.relative_humidity_2m) : null;

        // Pull PM2.5 (µg/m³) from Open-Meteo as pollen proxy if no direct pollen source
        const omHourly = pollenData?.hourly;
        const pollenIdx = omHourly?.european_aqi?.[0] ?? null;
        const pollen = pollenIdx !== null ? pollenIdx : null;

        const mainAqi = stations[0]?.aqi ?? 0;

        setAqiData({ stations, aqi: mainAqi, pm25, temp, humidity, pollen });

        // Weather already fetched above in parallel

        if (!isMounted) return;

        // 3. Get personalized risk from backend (with timeout)
        const severity = localStorage.getItem("bf_severity") || "moderate_persistent";
        const triggers = JSON.parse(localStorage.getItem("bf_triggers") || "[]");

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const riskRes = await fetch("http://localhost:8000/risk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              aqi: mainAqi,
              temp: weather?.data?.values?.temperature || 20,
              hum: weather?.data?.values?.humidity || 50,
              thunder: false,
              profile: { severity, triggers }
            }),
          });

          clearTimeout(timeoutId);

          if (riskRes.ok) {
            const riskData = await riskRes.json();
            setRiskLevel(riskData.risk_level.toLowerCase());
            setAqiData(prev => ({ ...prev, personalizedRisk: riskData }));
          } else {
            throw new Error("Backend unreachable");
          }
        } catch (err) {
          console.warn("Backend risk assessment skipped:", err);
          // Fallback logic
          if (mainAqi <= 50) setRiskLevel("safe");
          else if (mainAqi <= 100) setRiskLevel("moderate");
          else if (mainAqi <= 150) setRiskLevel("high");
          else setRiskLevel("critical");
        }

      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();
    return () => { isMounted = false; };
  }, [coords]);

  return { aqiData, riskLevel, isLoading, error };
}
