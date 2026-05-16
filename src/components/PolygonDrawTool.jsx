import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleMarker, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { buildPolygonFromVertices, verticesFromPolygon } from '../lib/geo';

function MapClickCapture({ drawing, onMapClick }) {
  const map = useMap();

  useEffect(() => {
    if (drawing) {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }
    return () => map.doubleClickZoom.enable();
  }, [map, drawing]);

  useMapEvents({
    click(e) {
      if (!drawing) return;
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitToBoundary({ boundary }) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (!boundary || didFit.current) return;
    const ring = boundary.coordinates[0];
    if (!ring?.length) return;
    const bounds = ring.map(([lng, lat]) => [lat, lng]);
    map.fitBounds(bounds, { padding: [40, 40] });
    didFit.current = true;
  }, [map, boundary]);

  return null;
}

export function PolygonDrawMapLayers({
  drawing,
  vertices,
  closedBoundary,
  onMapClick,
  fitBoundary,
}) {
  const openPath = vertices.map(([lat, lng]) => [lat, lng]);
  const closedRing =
    closedBoundary?.coordinates?.[0]?.map(([lng, lat]) => [lat, lng]) ?? null;

  return (
    <>
      {fitBoundary && <FitToBoundary boundary={fitBoundary} />}
      <MapClickCapture drawing={drawing} onMapClick={onMapClick} />
      {drawing && openPath.length > 1 && (
        <Polyline positions={openPath} pathOptions={{ color: '#1e40af', weight: 3, dashArray: '6 4' }} />
      )}
      {vertices.map(([lat, lng], i) => (
        <CircleMarker
          key={`v-${i}-${lat}-${lng}`}
          center={[lat, lng]}
          radius={6}
          pathOptions={{
            color: '#fff',
            fillColor: i === 0 ? '#f59e0b' : '#2563eb',
            fillOpacity: 1,
            weight: 2,
          }}
        />
      ))}
      {!drawing && closedRing && closedRing.length >= 3 && (
        <Polygon
          positions={closedRing}
          pathOptions={{ color: '#1e40af', weight: 3, fillColor: '#3b82f6', fillOpacity: 0.15 }}
        />
      )}
    </>
  );
}

export function PolygonDrawToolbar({
  drawing,
  vertices,
  onStart,
  onCancel,
  onUndo,
  onClose,
}) {
  return (
    <div className="draw-toolbar">
      {!drawing ? (
        <button type="button" className="btn-secondary" onClick={onStart}>
          Start drawing boundary
        </button>
      ) : (
        <>
          <span className="point-count">Points: {vertices.length}</span>
          <button type="button" className="btn-ghost" onClick={onUndo} disabled={vertices.length === 0}>
            Undo last
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            disabled={vertices.length < 3}
          >
            Close polygon
          </button>
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

export function usePolygonDraw({ onCreated, onClosed, existingBoundary }) {
  const [drawing, setDrawing] = useState(false);
  const [vertices, setVertices] = useState([]);
  const onCreatedRef = useRef(onCreated);
  const onClosedRef = useRef(onClosed);

  onCreatedRef.current = onCreated;
  onClosedRef.current = onClosed;

  useEffect(() => {
    if (existingBoundary) {
      setVertices(verticesFromPolygon(existingBoundary));
    }
  }, [existingBoundary]);

  const handleMapClick = useCallback((lat, lng) => {
    setVertices((prev) => [...prev, [lat, lng]]);
  }, []);

  const handleStart = useCallback(() => {
    setVertices([]);
    setDrawing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setDrawing(false);
    if (existingBoundary) {
      setVertices(verticesFromPolygon(existingBoundary));
    } else {
      setVertices([]);
    }
  }, [existingBoundary]);

  const handleUndo = useCallback(() => {
    setVertices((prev) => prev.slice(0, -1));
  }, []);

  const handleClose = useCallback(() => {
    const poly = buildPolygonFromVertices(vertices);
    if (!poly) return;
    onCreatedRef.current(poly);
    onClosedRef.current?.();
    setDrawing(false);
  }, [vertices]);

  return {
    drawing,
    vertices,
    handleMapClick,
    handleStart,
    handleCancel,
    handleUndo,
    handleClose,
  };
}
