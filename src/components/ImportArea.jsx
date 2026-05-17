import { useMemo, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import { MapView } from './MapView';
import { parseAreaPackage } from '../lib/areaPackage';
import { GRID_CELL_SIZE_OPTIONS, isValidClosedPolygon, resolveGridCellSizeM } from '../lib/geo';
import { saveArea } from '../lib/storage';

export function ImportArea({ onSaved, onCancel }) {
  const [name, setName] = useState('');
  const [boundary, setBoundary] = useState(null);
  const [gridCellSizeM, setGridCellSizeM] = useState(40);
  const [error, setError] = useState('');
  const [fileLabel, setFileLabel] = useState('');

  const mapCenter = useMemo(() => {
    if (!boundary?.coordinates?.[0]) return [20.5937, 78.9629];
    const ring = boundary.coordinates[0];
    let lat = 0;
    let lng = 0;
    ring.forEach(([x, y]) => {
      lng += x;
      lat += y;
    });
    return [lat / ring.length, lng / ring.length];
  }, [boundary]);

  const fitBoundsGeoJson = useMemo(
    () => (boundary ? { type: 'Feature', geometry: boundary } : null),
    [boundary],
  );

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileLabel(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseAreaPackage(reader.result, file.name);
      if (!parsed || !isValidClosedPolygon(parsed.boundary)) {
        setError('Could not read area file. Use a .census-area.json or GeoJSON polygon.');
        setBoundary(null);
        return;
      }
      setName(parsed.name);
      setBoundary(parsed.boundary);
      setGridCellSizeM(resolveGridCellSizeM(parsed));
      setError('');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this area');
      return;
    }
    if (!boundary || !isValidClosedPolygon(boundary)) {
      setError('Choose a valid area file first');
      return;
    }
    await saveArea({
      id: crypto.randomUUID(),
      name: name.trim(),
      boundary,
      gridCellSizeM,
      createdAt: Date.now(),
    });
    onSaved();
  };

  return (
    <div className="screen import-screen">
      <header className="screen-header">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Back
        </button>
        <h1>Import area</h1>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={!boundary}>
          Save
        </button>
      </header>

      <div className="import-form">
        <label className="import-file-btn">
          Choose area file
          <input
            type="file"
            accept=".json,.geojson,.census-area.json,application/json"
            onChange={handleFile}
            hidden
          />
        </label>
        {fileLabel && <p className="import-filename">{fileLabel}</p>}
        <p className="hint">
          Use a file from the desktop planner (.census-area.json) or GeoJSON with a polygon.
        </p>

        {boundary && (
          <>
            <label className="grid-size-field">
              <span className="grid-size-label">Area name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Area name"
              />
            </label>
            <label className="grid-size-field">
              <span className="grid-size-label">Coverage cell size</span>
              <select
                value={gridCellSizeM}
                onChange={(e) => setGridCellSizeM(Number(e.target.value))}
              >
                {GRID_CELL_SIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.hint}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="map-wrap import-map">
        {boundary ? (
          <MapView
            center={mapCenter}
            zoom={15}
            baseLayer="satellite"
            followMode="none"
            fitBoundsGeoJson={fitBoundsGeoJson}
          >
            <GeoJSON
              data={{ type: 'Feature', geometry: boundary }}
              style={{ color: '#1e40af', weight: 3, fillColor: '#3b82f6', fillOpacity: 0.15 }}
            />
          </MapView>
        ) : (
          <p className="import-map-placeholder">Preview will appear after you choose a file</p>
        )}
      </div>
    </div>
  );
}
