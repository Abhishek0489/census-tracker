import { CircleMarker } from 'react-leaflet';

export function UserLocationMarker({ position }) {
  if (!position) return null;

  return (
    <CircleMarker
      center={[position.lat, position.lng]}
      radius={8}
      pathOptions={{
        color: '#fff',
        fillColor: '#2563eb',
        fillOpacity: 1,
        weight: 2,
      }}
    />
  );
}
