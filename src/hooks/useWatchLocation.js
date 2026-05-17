import { useCallback, useEffect, useState } from 'react';

export function useWatchLocation() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);

  const onPosition = useCallback((pos) => {
    const { latitude, longitude, accuracy } = pos.coords;
    setPosition({
      lat: latitude,
      lng: longitude,
      accuracy,
    });
    setError(null);
  }, []);

  const onError = useCallback((err) => {
    setError(err.message || 'Location permission denied or unavailable');
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser');
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [onPosition, onError]);

  return { position, error };
}
