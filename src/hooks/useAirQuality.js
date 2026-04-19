import { useState, useEffect, useRef } from "react";

function getRiskLevel(aqi) {
  if (aqi <= 50)  return "safe";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "high";
  return "critical";
}

function getPollenLabel(value) {
  if (value == null) return "—";
  if (value <= 1)  return "Low";
  if (value <= 2)  return "Moderate";
  if (value <= 3)  return "High";
  return "Very High";
}

// Retries a fetch up to `attempts` times with a delay between each
async function fetchWithRetry(url, attempts = 3, delayMs = 800) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
}

export default function useAirQuality(coords) {
  const [aqiData,   setAqiData]   = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);

  // Cache last known weather + pollen so they don't flicker to "—" on re-fetch
  const weatherCache = useRef({ temp: "—", humidity: "—" });
  const pollenCache  = useRef("—");

  useEffect(() => {
    if (!coords) return;

    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);

      const airnowKey   = import.meta.env.VITE_AIRNOW_KEY;
      const tomorrowKey = import.meta.env.VITE_TOMORROW_KEY;
      const { lat, lon } = coords;

      const [airnowRes, weatherRes, pollenRes] = await Promise.allSettled([

        // AirNow — AQI
        fetchWithRetry(
          `https://www.airnowapi.org/aq/observation/latLong/current/` +
          `?format=application/json` +
          `&latitude=${lat}&longitude=${lon}` +
          `&distance=300&API_KEY=${airnowKey}`
        ),

        // Tomorrow.io — temp + humidity
        fetchWithRetry(
          `https://api.tomorrow.io/v4/weather/realtime` +
          `?location=${lat},${lon}` +
          `&fields=temperature,humidity` +
          `&units=imperial` +
          `&apikey=${tomorrowKey}`
        ),

        // Open-Meteo — pollen
        fetchWithRetry(
          `https://air-quality-api.open-meteo.com/v1/air-quality` +
          `?latitude=${lat}&longitude=${lon}` +
          `&current=grass_pollen,birch_pollen,ragweed_pollen`
        ),

      ]);

      // ── AirNow ───────────────────────────────────────────────────────────
      if (airnowRes.status === "rejected" || !airnowRes.value?.length) {
        setError("No AQI data available for this location.");
        setIsLoading(false);
        return;
      }

      const observations = airnowRes.value;
      const worst  = observations.reduce((a, b) => a.AQI > b.AQI ? a : b);
      const pm25   = observations.find(o => o.ParameterName === "PM2.5")?.AQI ?? "—";
      const stations = observations.map((o, i) => ({
        id:   `station-${i}`,
        lat:  o.Latitude,
        lon:  o.Longitude,
        aqi:  o.AQI,
        name: o.ReportingArea,
      }));

      // ── Tomorrow.io — use cache if this call failed ───────────────────
      if (weatherRes.status === "fulfilled") {
        const w = weatherRes.value?.data?.values;
        if (w) {
          weatherCache.current = {
            temp:     w.temperature != null ? `${Math.round(w.temperature)}` : "—",
            humidity: w.humidity    != null ? `${Math.round(w.humidity)}`    : "—",
          };
        }
      }

      // ── Open-Meteo pollen — use cache if this call failed ────────────
      if (pollenRes.status === "fulfilled") {
        const p = pollenRes.value?.current;
        if (p) {
          const max = Math.max(
            p.grass_pollen   ?? 0,
            p.birch_pollen   ?? 0,
            p.ragweed_pollen ?? 0,
          );
          pollenCache.current = getPollenLabel(max);
        }
      }

      setAqiData({
        aqi:      worst.AQI,
        pm25,
        temp:     weatherCache.current.temp,
        humidity: weatherCache.current.humidity,
        pollen:   pollenCache.current,
        stations,
      });

      setIsLoading(false);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 10 * 60 * 1000);
    return () => clearInterval(interval);

  }, [JSON.stringify(coords)]); // eslint-disable-line react-hooks/exhaustive-deps

  const riskLevel = getRiskLevel(aqiData?.aqi ?? 0);
  return { aqiData, riskLevel, isLoading, error };
}// forced change
// forced change
