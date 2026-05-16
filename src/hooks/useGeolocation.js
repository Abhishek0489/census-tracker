import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_ACCURACY_THRESHOLD_M } from '../lib/geo';

export function useGeolocation(accuracyThresholdM = DEFAULT_ACCURACY_THRESHOLD_M) {
  const [state, setState] = useState({
    position: null,
    error: null,
    tracking: false,
    paused: false,
  });
  const watchIdRef = useRef(null);

  const onPosition = useCallback((pos) => {
    const { latitude, longitude, accuracy } = pos.coords;
    setState((s) => ({
      ...s,
      position: {
        lat: latitude,
        lng: longitude,
        timestamp: pos.timestamp,
        accuracy,
      },
      error: null,
    }));
  }, []);

  const onError = useCallback((err) => {
    setState((s) => ({
      ...s,
      error: err.message || 'Location permission denied or unavailable',
    }));
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocation is not supported on this device' }));
      return;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000,
    });
    setState((s) => ({ ...s, tracking: true, paused: false, error: null }));
  }, [onPosition, onError]);

  const pauseWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((s) => ({ ...s, tracking: false, paused: true }));
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((s) => ({ ...s, tracking: false, paused: false }));
  }, []);

  const acceptPoint = useCallback(
    (p) => p != null && p.accuracy <= accuracyThresholdM,
    [accuracyThresholdM],
  );

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startWatching,
    pauseWatching,
    stopWatching,
    acceptPoint,
  };
}
