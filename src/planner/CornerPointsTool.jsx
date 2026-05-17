import { Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';

const NUMBERED_ICON = (n) =>
  L.divIcon({
    className: 'corner-point-marker',
    html: `<span class="corner-point-marker__label">${n}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

export function CornerPointsMapLayers({ points, areaClosed = false }) {
  if (!points?.length) return null;

  const path = points.map((p) => [p.lat, p.lng]);
  const showPreviewLines = !areaClosed;

  return (
    <>
      {showPreviewLines && path.length > 1 && (
        <Polyline
          positions={path}
          pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '8 6' }}
        />
      )}
      {showPreviewLines && path.length >= 3 && (
        <Polyline
          positions={[path[path.length - 1], path[0]]}
          pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '8 6' }}
        />
      )}
      {points.map((p, i) => (
        <Marker
          key={`corner-${i}-${p.lat}-${p.lng}`}
          position={[p.lat, p.lng]}
          icon={NUMBERED_ICON(i + 1)}
          interactive={false}
        />
      ))}
    </>
  );
}

export function CornerPointsList({
  points,
  onRemove,
  onMoveUp,
  onMoveDown,
}) {
  if (!points.length) {
    return <p className="planner-corner-empty">No corner points yet — paste coords and tap Add point.</p>;
  }

  return (
    <ol className="planner-corner-list">
      {points.map((p, i) => (
        <li key={`${i}-${p.lat}-${p.lng}`} className="planner-corner-item">
          <span className="planner-corner-num">{i + 1}</span>
          <span className="planner-corner-coords">
            {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
          </span>
          <span className="planner-corner-actions">
            <button
              type="button"
              className="planner-corner-btn"
              title="Move up"
              disabled={i === 0}
              onClick={() => onMoveUp(i)}
            >
              ↑
            </button>
            <button
              type="button"
              className="planner-corner-btn"
              title="Move down"
              disabled={i === points.length - 1}
              onClick={() => onMoveDown(i)}
            >
              ↓
            </button>
            <button
              type="button"
              className="planner-corner-btn planner-corner-btn-remove"
              title="Remove point"
              onClick={() => onRemove(i)}
            >
              ×
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
