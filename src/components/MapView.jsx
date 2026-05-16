import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const TILE_LAYERS = {
  streets: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; <a href="https://www.esri.com/">Esri</a>',
  },
  satelliteLabels: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Labels &copy; <a href="https://www.esri.com/">Esri</a>',
  },
};

function BaseTileLayers({ baseLayer }) {
  if (baseLayer === 'satellite') {
    return (
      <>
        <TileLayer
          attribution={TILE_LAYERS.satellite.attribution}
          url={TILE_LAYERS.satellite.url}
        />
        <TileLayer
          attribution={TILE_LAYERS.satelliteLabels.attribution}
          url={TILE_LAYERS.satelliteLabels.url}
          zIndex={1000}
          opacity={1}
        />
      </>
    );
  }

  return (
    <TileLayer
      attribution={TILE_LAYERS.streets.attribution}
      url={TILE_LAYERS.streets.url}
    />
  );
}

function MapFollow({ followMode, followCenter, initialCenter, initialZoom, fitBoundsGeoJson }) {
  const map = useMap();
  const didInitial = useRef(false);
  const lastPan = useRef(null);

  useEffect(() => {
    if (didInitial.current) return;
    didInitial.current = true;

    if (fitBoundsGeoJson) {
      const layer = L.geoJSON(fitBoundsGeoJson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
        return;
      }
    }

    if (initialCenter) {
      map.setView(initialCenter, initialZoom ?? 16);
    }
  }, [map, fitBoundsGeoJson, initialCenter, initialZoom]);

  useEffect(() => {
    if (followMode !== 'pan' || !followCenter) return;

    const key = `${followCenter[0].toFixed(5)},${followCenter[1].toFixed(5)}`;
    if (lastPan.current === key) return;
    lastPan.current = key;

    map.panTo(followCenter, { animate: true, duration: 0.4 });
  }, [map, followMode, followCenter]);

  return null;
}

export function MapView({
  center,
  zoom = 16,
  children,
  className,
  baseLayer = 'streets',
  zoomControl = true,
  followMode = 'none',
  followCenter = null,
  fitBoundsGeoJson = null,
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className ?? 'map-container'}
      zoomControl={zoomControl}
      scrollWheelZoom
    >
      <BaseTileLayers baseLayer={baseLayer} />
      <MapFollow
        followMode={followMode}
        followCenter={followCenter}
        initialCenter={center}
        initialZoom={zoom}
        fitBoundsGeoJson={fitBoundsGeoJson}
      />
      {children}
    </MapContainer>
  );
}
