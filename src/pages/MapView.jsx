import { useState, useEffect, useRef } from "react";
import RiskOverlay from "../components/RiskOverlay";
import LocationSearch from "../components/LocationSearch";
import AQILegend from "../components/AQILegend";
import MapMarker from "../components/MapMarker";
import useAirQuality from "../hooks/useAirQuality";
import useLocation from "../hooks/useLocation";
import styles from "./MapView.module.css";

// TODO: Install and import your map library:
//   Option A (will most likely use this): import mapboxgl from 'mapbox-gl'
//   Option B: import { MapContainer, TileLayer } from 'react-leaflet'
//   Option C: import { APIProvider, Map } from '@vis.gl/react-google-maps'
//   Set VITE_MAP_TOKEN in .env

export default function MapView() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const { coords, locationError, requestLocation } = useLocation();
  const { aqiData, riskLevel, isLoading, error: aqiError } = useAirQuality(coords);

  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // TODO: Initialize map

  // TODO: Fly to new coords when user searches or locates themselves
  // mapRef.current?.flyTo({ center: [coords.lon, coords.lat], zoom: 13 });

  // TODO: Add AQI heatmap layer from aqiData GeoJSON once map is loaded

  return (
    <div className={styles.mapPage}>

      {/* Map canvas — replace placeholder div once map lib is wired */}
      <div ref={mapContainerRef} className={styles.mapCanvas} aria-label="Air quality map">
        <div className={styles.mapPlaceholder}>
          🗺 Map canvas — wire up Mapbox / Leaflet here
        </div>
      </div>

      {/* Floating search bar */}
      <div className={styles.searchBar}>
        <LocationSearch
          onSelectLocation={(loc) => {
            // TODO: update coords and fly map to loc.lat, loc.lon
            console.log("Location selected:", loc);
          }}
        />
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

      {/* Map markers — TODO: populate aqiData.stations from API */}
      {mapLoaded && aqiData?.stations?.map((station) => (
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
