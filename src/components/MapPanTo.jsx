import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/** Pans map to center when target or trigger changes; does not change zoom. */
export function MapPanTo({ center, trigger = 0 }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.panTo(center, { animate: true, duration: 0.4 });
  }, [map, center?.[0], center?.[1], trigger]);

  return null;
}
