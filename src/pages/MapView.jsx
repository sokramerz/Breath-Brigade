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

// ── Heatmap layer: weighted by AQI so colors accurately reflect air quality ──
const AQI_HEATMAP_LAYER = {
  id: "aqi-heatmap",
  type: "heatmap",
  source: "aqi-stations",
  maxzoom: 13,
  paint: {
    "heatmap-weight": [
      "interpolate", ["linear"], ["get", "aqi"],
      0,   0,
      50,  0.08,
      100, 0.3,
      150, 0.65,
      200, 1.0,
      300, 2.0,
    ],
    "heatmap-intensity": [
      "interpolate", ["linear"], ["zoom"],
      0, 1.5,
      9, 2.5,
    ],
    "heatmap-radius": [
      "interpolate", ["linear"], ["zoom"],
      0,  60,
      5,  90,
      9,  130,
    ],
    "heatmap-opacity": 0.85,
    "heatmap-color": [
      "interpolate", ["linear"], ["heatmap-density"],
      0,    "rgba(0,0,0,0)",
      0.05, "rgba(0,229,195,0.4)",
      0.15, "rgba(0,229,195,1.0)",
      0.45, "rgba(255,213,0,1.0)",
      0.75, "rgba(255,100,20,1.0)",
      1.0,  "rgba(220,38,38,1.0)",
    ],
  },
};

// ── Circle dots at street level ──
const AQI_CIRCLE_LAYER = {
  id: "aqi-circles",
  type: "circle",
  source: "aqi-stations",
  minzoom: 10,
  paint: {
    "circle-radius": [
      "interpolate", ["linear"], ["zoom"],
      10, 8,
      13, 14,
      16, 20,
    ],
    "circle-color": [
      "interpolate", ["linear"], ["get", "aqi"],
      0,   "#00e5c3",
      50,  "#00e5c3",
      51,  "#ffd500",
      100, "#ffd500",
      101, "#ff6414",
      150, "#ff6414",
      151, "#dc2626",
    ],
    "circle-stroke-color": "rgba(0,0,0,0.5)",
    "circle-stroke-width": 1.5,
    "circle-opacity": [
      "interpolate", ["linear"], ["zoom"],
      10, 0,
      12, 1,
    ],
  },
};

// ── Convert station array to valid GeoJSON ──
function stationsToGeoJSON(stations) {
  return {
    type: "FeatureCollection",
    features: (stations || [])
      .filter(s => s && !isNaN(Number(s.lat)) && !isNaN(Number(s.lon)))
      .map(s => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [Number(s.lon), Number(s.lat)],
        },
        properties: {
          aqi:  Number(s.aqi),
          name: s.name || "",
        },
      })),
  };
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

  const { coords, locationError, requestLocation } = useLocation();
  const [searchCoords, setSearchCoords] = useState(null);

  const activeCoords = searchCoords ?? coords;

  const { aqiData, riskLevel, isLoading, error: aqiError } = useAirQuality(activeCoords);

  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapLoaded,      setMapLoaded]      = useState(false);
  const [zoom,           setZoom]           = useState(11);

  const statusMessage = resolveStatusMessage(activeCoords, locationError, isLoading);

  useEffect(() => {
    requestLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize map once
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
        pitch: 45,
        bearing: -17.6,
        attributionControl: false,
        antialias: true,
      });

      mapRef.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
      mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

      mapRef.current.on("load", () => {
        // 3D Terrain
        mapRef.current.addSource("mapbox-dem", {
          type: "raster-dem",
          url:  "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
        mapRef.current.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

        // 3D Buildings
        const layers       = mapRef.current.getStyle().layers;
        const labelLayerId = layers.find(
          l => l.type === "symbol" && l.layout["text-field"]
        )?.id;

        mapRef.current.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#2a3b4d",
              "fill-extrusion-height": [
                "interpolate", ["linear"], ["zoom"],
                15, 0, 15.05, ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate", ["linear"], ["zoom"],
                15, 0, 15.05, ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.8,
            },
          },
          labelLayerId
        );

        // AQI source + layers — empty to start, filled when data arrives
        mapRef.current.addSource("aqi-stations", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        mapRef.current.addLayer(AQI_HEATMAP_LAYER);
        mapRef.current.addLayer(AQI_CIRCLE_LAYER);

        setMapLoaded(true);
      });

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

  // Fly to GPS location when it arrives
  useEffect(() => {
    if (!mapRef.current || !coords) return;
    flyTo(coords.lat, coords.lon);
  }, [coords]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push AQI data into the map source whenever it updates
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const source = mapRef.current.getSource("aqi-stations");
    if (source) {
      source.setData(stationsToGeoJSON(aqiData?.stations ?? []));
    }
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
      <div ref={mapContainerRef} className={styles.mapCanvas} aria-label="Air quality map" />

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
        aqiData?.stations?.map(station => (
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