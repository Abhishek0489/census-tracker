import {
  area,
  booleanPointInPolygon,
  distance,
  length,
  lineString,
  point,
  squareGrid,
  bbox,
} from '@turf/turf';

export const DEFAULT_ACCURACY_THRESHOLD_M = 30;
export const DEFAULT_GRID_CELL_SIZE_M = 40;

/** Presets for area setup — smaller = finer coverage, more map cells */
export const GRID_CELL_SIZE_OPTIONS = [
  { value: 25, label: '25 m', hint: 'Narrow lanes' },
  { value: 40, label: '40 m', hint: 'Default' },
  { value: 60, label: '60 m', hint: 'Blocks' },
  { value: 80, label: '80 m', hint: 'Large area' },
];

export function resolveGridCellSizeM(areaOrSize) {
  if (typeof areaOrSize === 'number') {
    return areaOrSize > 0 ? areaOrSize : DEFAULT_GRID_CELL_SIZE_M;
  }
  const m = areaOrSize?.gridCellSizeM;
  return typeof m === 'number' && m > 0 ? m : DEFAULT_GRID_CELL_SIZE_M;
}

export function pointInBoundary(lat, lng, boundary) {
  return booleanPointInPolygon(point([lng, lat]), boundary);
}

function cellCenter(coords) {
  let sumLng = 0;
  let sumLat = 0;
  let n = 0;
  const ring = coords[0] ?? [];
  ring.forEach(([lng, lat]) => {
    sumLng += lng;
    sumLat += lat;
    n += 1;
  });
  return [sumLng / (n || 1), sumLat / (n || 1)];
}

export function cellIdFromPosition([lng, lat]) {
  return `${lng.toFixed(5)}_${lat.toFixed(5)}`;
}

export function buildCoverageGrid(areaData) {
  const poly = areaData.boundary;
  const box = bbox(poly);
  const cellKm = resolveGridCellSizeM(areaData) / 1000;
  const grid = squareGrid(box, cellKm, { units: 'kilometers', mask: poly });
  const cells = [];

  grid.features.forEach((cell) => {
    if (cell.geometry.type !== 'Polygon') return;
    const center = cellCenter(cell.geometry.coordinates);
    cells.push({ id: cellIdFromPosition(center), polygon: cell.geometry });
  });

  if (cells.length === 0) {
    const center = cellCenter(poly.coordinates);
    return [{ id: cellIdFromPosition(center), polygon: poly }];
  }
  return cells;
}

export function markVisitedCells(cells, trackPoints, alreadyVisited, accuracyThresholdM) {
  const newlyVisited = [];
  const visited = new Set(alreadyVisited);

  for (const tp of trackPoints) {
    if (tp.accuracy > accuracyThresholdM) continue;
    const pt = point([tp.lng, tp.lat]);

    for (const cell of cells) {
      if (visited.has(cell.id)) continue;
      if (booleanPointInPolygon(pt, cell.polygon)) {
        visited.add(cell.id);
        newlyVisited.push(cell.id);
        continue;
      }
      const center = cellCenter(cell.polygon.coordinates);
      const distM = distance(pt, point(center), { units: 'meters' });
      if (distM <= 15) {
        visited.add(cell.id);
        newlyVisited.push(cell.id);
      }
    }
  }

  return newlyVisited;
}

export function coveragePercent(visitedCount, totalCells) {
  if (totalCells === 0) return 0;
  return Math.round((visitedCount / totalCells) * 100);
}

export function trackDistanceMeters(points) {
  if (points.length < 2) return 0;
  const coords = points.map((p) => [p.lng, p.lat]);
  return length(lineString(coords), { units: 'meters' });
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function parseGeoJsonPolygon(text) {
  try {
    const data = JSON.parse(text);
    if (data.type === 'Feature' && data.geometry?.type === 'Polygon') {
      return data.geometry;
    }
    if (data.type === 'Polygon' && data.coordinates) {
      return data;
    }
    if (data.type === 'FeatureCollection' && data.features) {
      const poly = data.features.find((f) => f.geometry?.type === 'Polygon');
      if (poly) return poly.geometry;
    }
  } catch {
    return null;
  }
  return null;
}

export function sessionToGeoJson(session, areaName) {
  const feature = {
    type: 'Feature',
    properties: { name: areaName },
    geometry: {
      type: 'LineString',
      coordinates: session.points.map((p) => [p.lng, p.lat]),
    },
  };
  return JSON.stringify({ type: 'FeatureCollection', features: [feature] }, null, 2);
}

export function sessionToGpx(session, areaName) {
  const pts = session.points
    .map(
      (p) =>
        `      <trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.timestamp).toISOString()}</time></trkpt>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Census Area Tracker">
  <metadata><name>${areaName}</name></metadata>
  <trk><name>${areaName}</name><trkseg>
${pts}
  </trkseg></trk>
</gpx>`;
}

export function findCellAtPoint(cells, lat, lng) {
  const pt = point([lng, lat]);
  for (const cell of cells) {
    if (booleanPointInPolygon(pt, cell.polygon)) {
      return cell;
    }
  }
  return null;
}

/** @param {Array<[number, number]>} latLngs - [lat, lng] pairs */
export function buildPolygonFromVertices(latLngs) {
  if (!latLngs || latLngs.length < 3) return null;
  const ring = latLngs.map(([lat, lng]) => [lng, lat]);
  const first = ring[0];
  ring.push([first[0], first[1]]);
  return { type: 'Polygon', coordinates: [ring] };
}

export function verticesFromPolygon(boundary) {
  if (!boundary?.coordinates?.[0]) return [];
  const ring = boundary.coordinates[0];
  if (ring.length < 3) return [];

  const verts = ring.map(([lng, lat]) => [lat, lng]);
  if (verts.length > 1) {
    const first = verts[0];
    const last = verts[verts.length - 1];
    const tol = 1e-6;
    if (
      Math.abs(first[0] - last[0]) < tol &&
      Math.abs(first[1] - last[1]) < tol
    ) {
      return verts.slice(0, -1);
    }
  }
  return verts;
}

export function isValidClosedPolygon(boundary) {
  if (!boundary?.coordinates?.[0]) return false;
  const ring = boundary.coordinates[0];
  if (ring.length < 4) return false;
  const first = ring[0];
  const last = ring[ring.length - 1];
  const tol = 1e-6;
  const closed =
    Math.abs(first[0] - last[0]) < tol && Math.abs(first[1] - last[1]) < tol;
  if (!closed) return false;
  return ring.length >= 4;
}

export function downloadTextFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
