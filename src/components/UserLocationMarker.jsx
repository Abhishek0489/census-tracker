import { CircleMarker } from 'react-leaflet';

const STYLES = {
  gps: { fillColor: '#2563eb', radius: 8 },
  target: { fillColor: '#f59e0b', radius: 10 },
};

export function UserLocationMarker({ position, variant = 'gps' }) {
  if (!position) return null;

  const style = STYLES[variant] ?? STYLES.gps;

  return (
    <CircleMarker
      center={[position.lat, position.lng]}
      radius={style.radius}
      pathOptions={{
        color: '#fff',
        fillColor: style.fillColor,
        fillOpacity: 1,
        weight: 2,
      }}
    />
  );
}
