import { useState, useCallback } from "react";

export default function useLocation() {
  const [coords, setCoords]               = useState(null);
  const [locationError, setLocationError] = useState(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setLocationError(null);
      },
      (err) => {
        setLocationError(err.message);
      }
    );
  }, []);

  return { coords, locationError, requestLocation };
}