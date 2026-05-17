import { DEFAULT_GRID_CELL_SIZE_M, parseGeoJsonPolygon, resolveGridCellSizeM } from './geo';

export const AREA_PACKAGE_FORMAT = 'census-tracker-area';
export const AREA_PACKAGE_VERSION = 1;

function slugifyFilename(name) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'area';
}

export function exportAreaPackage({ name, boundary, gridCellSizeM }) {
  const payload = {
    format: AREA_PACKAGE_FORMAT,
    version: AREA_PACKAGE_VERSION,
    name: name.trim(),
    gridCellSizeM: resolveGridCellSizeM({ gridCellSizeM }),
    boundary,
    exportedAt: Date.now(),
  };
  const json = JSON.stringify(payload, null, 2);
  const filename = `${slugifyFilename(name)}.census-area.json`;
  return { json, filename };
}

export function exportAreaGeoJson({ name, boundary, gridCellSizeM }) {
  const feature = {
    type: 'Feature',
    properties: {
      name: name.trim(),
      gridCellSizeM: resolveGridCellSizeM({ gridCellSizeM }),
    },
    geometry: boundary,
  };
  const json = JSON.stringify(feature, null, 2);
  const filename = `${slugifyFilename(name)}.geojson`;
  return { json, filename };
}

function nameFromFilename(filename) {
  if (!filename) return '';
  return filename
    .replace(/\.(census-area\.)?json$/i, '')
    .replace(/\.geojson$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

function parseCensusTrackerArea(data) {
  if (data.format !== AREA_PACKAGE_FORMAT) return null;
  if (!data.boundary || data.boundary.type !== 'Polygon') return null;
  return {
    name: typeof data.name === 'string' ? data.name.trim() : '',
    boundary: data.boundary,
    gridCellSizeM: resolveGridCellSizeM(data),
  };
}

function parseGeoJsonWithMeta(data, fallbackName) {
  let boundary = null;
  let name = fallbackName;
  let gridCellSizeM = DEFAULT_GRID_CELL_SIZE_M;

  if (data.type === 'Feature' && data.geometry?.type === 'Polygon') {
    boundary = data.geometry;
    if (data.properties?.name) name = String(data.properties.name).trim();
    if (data.properties?.gridCellSizeM != null) {
      gridCellSizeM = resolveGridCellSizeM(data.properties);
    }
  } else if (data.type === 'Polygon') {
    boundary = data;
  } else if (data.type === 'FeatureCollection' && data.features) {
    const feature = data.features.find((f) => f.geometry?.type === 'Polygon');
    if (feature) {
      boundary = feature.geometry;
      if (feature.properties?.name) name = String(feature.properties.name).trim();
      if (feature.properties?.gridCellSizeM != null) {
        gridCellSizeM = resolveGridCellSizeM(feature.properties);
      }
    }
  }

  if (!boundary) return null;
  return {
    name: name || fallbackName || 'Imported area',
    boundary,
    gridCellSizeM,
  };
}

/**
 * @param {string} text - file contents
 * @param {string} [filename] - optional original filename for default name
 * @returns {{ name: string, boundary: object, gridCellSizeM: number } | null}
 */
export function parseAreaPackage(text, filename = '') {
  const fallbackName = nameFromFilename(filename);

  try {
    const data = JSON.parse(text);

    if (data.format === AREA_PACKAGE_FORMAT) {
      const parsed = parseCensusTrackerArea(data);
      if (parsed) {
        return {
          ...parsed,
          name: parsed.name || fallbackName || 'Imported area',
        };
      }
    }

    const fromGeo = parseGeoJsonWithMeta(data, fallbackName);
    if (fromGeo) return fromGeo;
  } catch {
    return null;
  }

  const poly = parseGeoJsonPolygon(text);
  if (poly) {
    return {
      name: fallbackName || 'Imported area',
      boundary: poly,
      gridCellSizeM: DEFAULT_GRID_CELL_SIZE_M,
    };
  }

  return null;
}
