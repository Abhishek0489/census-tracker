import { Polygon } from 'react-leaflet';
import L from 'leaflet';

export function CoverageLayer({ cells, visitedIds, interactive = false, onCellClick }) {
  const visited = new Set(visitedIds);

  return (
    <>
      {cells.map((cell) => {
        const ring = cell.polygon.coordinates[0].map(([lng, lat]) => [lat, lng]);
        const isVisited = visited.has(cell.id);
        return (
          <Polygon
            key={cell.id}
            positions={ring}
            pathOptions={{
              color: isVisited ? '#16a34a' : '#dc2626',
              fillColor: isVisited ? '#22c55e' : '#f87171',
              fillOpacity: isVisited ? 0.45 : interactive ? 0.35 : 0.25,
              weight: interactive && !isVisited ? 2 : 1,
            }}
            eventHandlers={
              interactive && onCellClick
                ? {
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
                      onCellClick(cell.id, isVisited);
                    },
                  }
                : undefined
            }
          />
        );
      })}
    </>
  );
}
