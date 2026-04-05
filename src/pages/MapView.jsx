import { useState, useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import RiskOverlay from "../components/RiskOverlay";
import LocationSearch from "../components/LocationSearch";
import AQILegend from "../components/AQILegend";
import MapMarker from "../components/MapMarker";
import useAirQuality from "../hooks/useAirQuality";
import useLocation from "../hooks/useLocation";
import styles from "./MapView.module.css";

mapboxgl.accessToken = import.meta.env.VITE_MAP_TOKEN;

const AQI_HEATMAP_LAYER = {
  id: "aqi-heatmap",
  type: "heatmap",
  source: "aqi-stations",
  paint: {
    "heatmap-weight":    ["interpolate", ["linear"], ["get", "aqi"], 0, 0, 300, 1],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 13, 3],
    "heatmap-radius":    ["interpolate", ["linear"], ["zoom"], 0, 20, 13, 60],
    "heatmap-opacity": 0.6,
    "heatmap-color": [
      "interpolate", ["linear"], ["heatmap-density"],
      0,   "rgba(0,229,195,0)",
      0.2, "rgba(0,229,195,0.6)",
      0.4, "rgba(245,197,24,0.7)",
      0.7, "rgba(255,123,46,0.8)",
      1,   "rgba(229,53,53,0.9)",
    ],
  },
};

function stationsToGeoJSON(stations = []) {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: { aqi: s.aqi, id: s.id },
    })),
  };
}

// ─── Null-state messages shown in RiskOverlay when data isn't ready ───────────
function resolveStatusMessage(coords, locationError, isLoading) {
  if (locationError)  return { type: "error",   text: "Location access denied. Search for your city above to see local air quality." };
  if (!coords)        return { type: "prompt",  text: "Enable location or search above to see the air quality risk near you." };
  if (isLoading)      return { type: "loading", text: null }; // RiskOverlay handles its own skeleton
  return null;
}

export default function MapView() {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);

  const { coords, locationError, requestLocation } = useLocation();
  const { aqiData, riskLevel, isLoading, error: aqiError } = useAirQuality(coords);

  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapLoaded,      setMapLoaded]      = useState(false);
  const [zoom,           setZoom]           = useState(11);

  const statusMessage = resolveStatusMessage(coords, locationError, isLoading);

  // ── 1. Initialize map ────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-74.006, 40.7128],
      zoom: 11,
      attributionControl: false,
    });

    mapRef.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    // Nav control tucked above the legend — no compass needed for AQI context
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    mapRef.current.on("load", () => {
      mapRef.current.addSource("aqi-stations", {
        type: "geojson",
        data: stationsToGeoJSON([]),
      });
      mapRef.current.addLayer(AQI_HEATMAP_LAYER);
      setMapLoaded(true);
    });

    // Track zoom so we can conditionally render markers
    mapRef.current.on("zoom", () => {
      setZoom(Math.round(mapRef.current.getZoom()));
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // ── 2. Fly to GPS coords ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !coords) return;
    flyTo(coords.lat, coords.lon);
  }, [coords]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Update heatmap data ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const source = mapRef.current.getSource("aqi-stations");
    source?.setData(stationsToGeoJSON(aqiData?.stations ?? []));
  }, [aqiData, mapLoaded]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const flyTo = useCallback((lat, lon, zoom = 13) => {
    mapRef.current?.flyTo({ center: [lon, lat], zoom, speed: 1.4, curve: 1.2, essential: true });
  }, []);

  const handleSelectLocation = useCallback(
    (loc) => flyTo(loc.lat, loc.lon),
    [flyTo]
  );

  const handleRecenter = useCallback(() => {
    if (coords) flyTo(coords.lat, coords.lon);
    else requestLocation();
  }, [coords, flyTo, requestLocation]);

  // Only render individual station markers at zoom ≥ 12 (Gemini's suggestion)
  // — below that the heatmap alone provides sufficient spatial context
  const showMarkers = mapLoaded && zoom >= 12;

  return (
    <div className={styles.mapPage}>

      {/* Full-screen map canvas */}
      <div ref={mapContainerRef} className={styles.mapCanvas} aria-label="Air quality map" />

      {/* Floating search bar */}
      <div className={styles.searchBar}>
        <LocationSearch onSelectLocation={handleSelectLocation} />
      </div>

      {/* Risk card — danger pulse applied at the panel level when critical */}
      <div className={`${styles.riskPanel} ${riskLevel === "critical" ? styles.dangerPulse : ""}`}>
        <RiskOverlay
          riskLevel={riskLevel}
          aqiData={aqiData}
          isLoading={isLoading}
          error={aqiError}
          statusMessage={statusMessage}
          onLocateMe={requestLocation}
        />
      </div>

      {/* AQI legend */}
      <div className={styles.legend}>
        <AQILegend />
      </div>

      {/* Re-center FAB */}
      <button
        className={styles.recenterFab}
        onClick={handleRecenter}
        aria-label={coords ? "Re-center on my location" : "Enable location"}
        title={coords ? "Re-center" : "Enable location"}
      >
        {coords ? "◎" : "⊕"}
      </button>

      {/* Per-station markers — only above zoom 12 */}
      {showMarkers &&
        aqiData?.stations?.map((station) => (
          <MapMarker
            key={station.id}
            map={mapRef.current}
            station={station}
            isSelected={selectedMarker?.id === station.id}
            onClick={() => setSelectedMarker(station)}
          />
        ))}

    </div>
  );
}
