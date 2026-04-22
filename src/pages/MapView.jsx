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
    "heatmap-weight": [
      "interpolate", ["linear"], ["get", "aqi"],
      0,   0,
      50,  0.5,
      100, 0.8,
      150, 1.0,
      300, 1.0,
    ],
    "heatmap-intensity": [
      "interpolate", ["linear"], ["zoom"],
      0,  3,
      5,  6,
      10, 10,
      15, 16,
    ],
    "heatmap-radius": [
      "interpolate", ["linear"], ["zoom"],
      0,  80,
      5,  100,
      10, 140,
      15, 180,
    ],
    "heatmap-opacity": 0.95,
    "heatmap-color": [
      "interpolate", ["linear"], ["heatmap-density"],
      0,    "rgba(0,0,0,0)",
      0.05, "rgba(0,255,210,0.5)",
      0.2,  "rgba(0,255,195,0.9)",
      0.4,  "rgba(255,210,0,1.0)",
      0.6,  "rgba(255,100,20,1.0)",
      0.8,  "rgba(230,40,40,1.0)",
      1.0,  "rgba(255,0,100,1.0)",
    ],
  },
};

// Interpolates extra points between real stations to create a denser heatmap
function interpolateStations(stations = []) {
  if (stations.length === 0) return [];

  const interpolated = [...stations];

  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      const a = stations[i];
      const b = stations[j];

      // Add 4 interpolated points between every pair of real stations
      for (let t = 0.2; t < 1; t += 0.2) {
        interpolated.push({
          id:  `interp-${i}-${j}-${t}`,
          lat: a.lat + (b.lat - a.lat) * t,
          lon: a.lon + (b.lon - a.lon) * t,
          aqi: Math.round(a.aqi + (b.aqi - a.aqi) * t),
        });
      }
    }
  }

  return interpolated;
}

function resolveStatusMessage(coords, locationError, isLoading) {
  if (locationError) return { type: "error",   text: "Location access denied. Search for your city above to see local air quality." };
  if (!coords)       return { type: "prompt",  text: "Enable location or search above to see the air quality risk near you." };
  if (isLoading)     return { type: "loading", text: null };
  return null;
}

export default function MapView() {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const [showWelcome, setShowWelcome] = useState(true);

  const { coords, locationError, requestLocation } = useLocation();
  const [searchCoords, setSearchCoords] = useState(null);

  const activeCoords = searchCoords ?? coords;

  const { aqiData, riskLevel, isLoading, error: aqiError } = useAirQuality(activeCoords);

  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapLoaded,      setMapLoaded]      = useState(false);
  const [zoom,           setZoom]           = useState(11);

  const statusMessage = resolveStatusMessage(activeCoords, locationError, isLoading);

  // Add timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // Auto-request GPS on mount
  useEffect(() => {
    requestLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;

    const init = () => {
      const container = mapContainerRef.current;
      if (!container) return;

      container.style.width  = "100%";
      container.style.height = "100vh";

      mapRef.current = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-74.006, 40.7128],
        zoom: 11,
        attributionControl: false,
      });

      mapRef.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
      mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

      mapRef.current.on("load", () => {
  if (!mapRef.current.getSource("aqi-stations")) {
    mapRef.current.addSource("aqi-stations", {
      type: "geojson",
      data: stationsToGeoJSON([]),
    });
    mapRef.current.addLayer(AQI_HEATMAP_LAYER);
  }
  setMapLoaded(true);
});

// Re-fetch AQI for wherever the map is centered after panning/zooming
mapRef.current.on("moveend", () => {
  const center = mapRef.current.getCenter();
  setSearchCoords({ lat: center.lat, lon: center.lng });
});

mapRef.current.on("zoom", () => {
  setZoom(Math.round(mapRef.current.getZoom()));
});
    };

    requestAnimationFrame(init);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly to GPS coords when they arrive
  useEffect(() => {
    if (!mapRef.current || !coords) return;
    flyTo(coords.lat, coords.lon);
  }, [coords]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update heatmap when AQI data changes
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const source = mapRef.current.getSource("aqi-stations");
    source?.setData(stationsToGeoJSON(aqiData?.stations ?? []));
  }, [aqiData, mapLoaded]);

  const flyTo = useCallback((lat, lon, zoom = 13) => {
    mapRef.current?.flyTo({ center: [lon, lat], zoom, speed: 1.4, curve: 1.2, essential: true });
  }, []);

  const handleSelectLocation = useCallback((loc) => {
    flyTo(loc.lat, loc.lon);
    setSearchCoords({ lat: loc.lat, lon: loc.lon });
  }, [flyTo]);

  const handleRecenter = useCallback(() => {
    if (coords) {
      flyTo(coords.lat, coords.lon);
      setSearchCoords(null);
    } else {
      requestLocation();
    }
  }, [coords, flyTo, requestLocation]);

  const showMarkers = mapLoaded && zoom >= 12;

  return (
    <div className={styles.mapPage}>
    {showWelcome && (
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeTitle}>
          Welcome to BREATHEfresh
        </div>
        <div className={styles.welcomeSubtitle}>
          Track local air quality and risk in real time
        </div>
      </div>
    )}
      <div ref={mapContainerRef} className={styles.mapCanvas} aria-label="Air quality map" />
      {/* Ambient atmosphere — breathing glow that reacts to risk level */}
<div

  className={styles.atmosphere}
  style={{ "--risk-color": {
    safe:     "rgba(0,229,195,0.06)",
    moderate: "rgba(245,197,24,0.07)",
    high:     "rgba(255,123,46,0.09)",
    critical: "rgba(229,53,53,0.12)",
  }[riskLevel] ?? "rgba(0,229,195,0.06)" }}
/>
      <div className={styles.searchBar}>
        <LocationSearch onSelectLocation={handleSelectLocation} />
      </div>

      <div className={`${styles.riskPanel} ${riskLevel === "critical" ? styles.dangerPulse : ""}`}>
        <RiskOverlay
          riskLevel={riskLevel}
          aqiData={aqiData}
          isLoading={isLoading}
          error={aqiError}
          statusMessage={statusMessage}
          onLocateMe={handleRecenter}
        />
      </div>

      <div className={styles.legend}>
        <AQILegend />
      </div>

      <button
        className={styles.recenterFab}
        onClick={handleRecenter}
        aria-label={coords ? "Re-center on my location" : "Enable location"}
      >
        {coords ? "◎" : "⊕"}
      </button>

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