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

/**
 * The main screen. Renders the full-screen map canvas, floating search bar,
 * risk card, and legend. Orchestrates the map library instance and connects
 * the AQI + location hooks.
 */

// AQI value → interpolated heatmap color (mirrors design token scale)
const AQI_HEATMAP_LAYER = {
  id: "aqi-heatmap",
  type: "heatmap",
  source: "aqi-stations",
  paint: {
    "heatmap-weight": ["interpolate", ["linear"], ["get", "aqi"], 0, 0, 300, 1],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 13, 3],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 20, 13, 60],
    "heatmap-opacity": 0.6,
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,   "rgba(0,229,195,0)",   // transparent at zero density
      0.2, "rgba(0,229,195,0.6)", // safe — teal
      0.4, "rgba(245,197,24,0.7)", // moderate — yellow
      0.7, "rgba(255,123,46,0.8)", // high — orange
      1,   "rgba(229,53,53,0.9)",  // critical — red
    ],
  },
};

/**
 * Converts aqiData.stations array into a GeoJSON FeatureCollection
 * suitable for the Mapbox heatmap source.
 */
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

export default function MapView() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const { coords, locationError, requestLocation } = useLocation();
  const { aqiData, riskLevel, isLoading, error: aqiError } = useAirQuality(coords);

  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // ─ 1. Initialize map once on mount ─
  useEffect(() => {
    if (mapRef.current) return; // already initialized

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-74.006, 40.7128], // default: NYC
      zoom: 11,
      attributionControl: false,
    });

    mapRef.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-left"
    );
    mapRef.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    mapRef.current.on("load", () => {
      // Add empty GeoJSON source — updated later when aqiData arrives
      mapRef.current.addSource("aqi-stations", {
        type: "geojson",
        data: stationsToGeoJSON([]),
      });
      mapRef.current.addLayer(AQI_HEATMAP_LAYER);
      setMapLoaded(true);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // ─ 2. Fly to user's GPS location when coords arrive ─
  useEffect(() => {
    if (!mapRef.current || !coords) return;
    flyTo(coords.lat, coords.lon);
  }, [coords]);

  // ─ 3. Update heatmap source whenever fresh AQI data arrives ─
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const source = mapRef.current.getSource("aqi-stations");
    if (source) {
      source.setData(stationsToGeoJSON(aqiData?.stations ?? []));
    }
  }, [aqiData, mapLoaded]);

  // ─ Helpers ─
  const flyTo = useCallback((lat, lon, zoom = 13) => {
    mapRef.current?.flyTo({
      center: [lon, lat],
      zoom,
      speed: 1.4,
      curve: 1.2,
      essential: true,
    });
  }, []);

  const handleSelectLocation = useCallback(
    (loc) => {
      flyTo(loc.lat, loc.lon);
    },
    [flyTo]
  );

  return (
    <div className={styles.mapPage}>
      {/* Full-screen map canvas */}
      <div
        ref={mapContainerRef}
        className={styles.mapCanvas}
        aria-label="Air quality map"
      />

      {/* Floating search bar */}
      <div className={styles.searchBar}>
        <LocationSearch onSelectLocation={handleSelectLocation} />
      </div>

      {/* Risk card */}
      <div className={styles.riskPanel}>
        <RiskOverlay
          riskLevel={riskLevel}
          aqiData={aqiData}
          isLoading={isLoading}
          error={aqiError}
          onLocateMe={requestLocation}
        />
      </div>

      {/* AQI legend */}
      <div className={styles.legend}>
        <AQILegend />
      </div>

      {/* Per-station map markers — rendered once map is ready */}
      {mapLoaded &&
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

