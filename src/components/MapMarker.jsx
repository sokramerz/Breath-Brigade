import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

const RISK_COLORS = {
  safe:     "#00e5c3",
  moderate: "#f5c518",
  high:     "#ff7b2e",
  critical: "#e53535",
};

function getRiskLevel(aqi) {
  if (aqi <= 50)  return "safe";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "high";
  return "critical";
}

export default function MapMarker({ map, station, isSelected, onClick }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !station) return;

    const level = getRiskLevel(station.aqi);
    const color = RISK_COLORS[level];

    const el = document.createElement("div");
    el.style.cssText = `
      width: ${isSelected ? "18px" : "12px"};
      height: ${isSelected ? "18px" : "12px"};
      border-radius: 50%;
      background: ${color};
      border: 2px solid ${isSelected ? "#fff" : "transparent"};
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 0 8px ${color}88;
    `;

    markerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([station.lon, station.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(`
          <div style="font-family:monospace;font-size:12px;color:#e8f0fe;background:#111d2e;padding:8px 12px;border-radius:8px;">
            <strong style="color:${color}">AQI ${station.aqi}</strong><br/>
            <span style="color:#8ca4c0">${station.name ?? "Station"}</span>
          </div>
        `)
      )
      .addTo(map);

    el.addEventListener("click", () => {
      onClick?.();
      markerRef.current.togglePopup();
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [map, station, isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}