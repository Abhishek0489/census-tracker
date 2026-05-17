import { useState } from 'react';
import { MapView } from './MapView';
import {
  PolygonDrawMapLayers,
  PolygonDrawToolbar,
  usePolygonDraw,
} from './PolygonDrawTool';
import { PlaceAutocomplete } from './PlaceAutocomplete';
import { parseAreaPackage } from '../lib/areaPackage';
import {
  GRID_CELL_SIZE_OPTIONS,
  isValidClosedPolygon,
  resolveGridCellSizeM,
} from '../lib/geo';
import { saveArea } from '../lib/storage';

export function BoundarySetup({ center, onSaved, onCancel, editArea }) {
  const [name, setName] = useState(editArea?.name ?? '');
  const [boundary, setBoundary] = useState(editArea?.boundary ?? null);
  const [error, setError] = useState('');
  const [closedMsg, setClosedMsg] = useState('');
  const [mapCenter, setMapCenter] = useState(center);
  const [mapStyle, setMapStyle] = useState('satellite');
  const [searchJumpId, setSearchJumpId] = useState(0);
  const [gridCellSizeM, setGridCellSizeM] = useState(
    () => resolveGridCellSizeM(editArea),
  );

  const draw = usePolygonDraw({
    onCreated: (poly) => {
      setBoundary(poly);
      setClosedMsg('Boundary closed — you can save or tap Start to redraw');
    },
    onClosed: () => {
      setClosedMsg('Boundary closed — you can save or tap Start to redraw');
    },
    existingBoundary: boundary,
  });

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this area');
      return;
    }
    if (!boundary) {
      setError('Draw the boundary on the map first');
      return;
    }
    if (!isValidClosedPolygon(boundary)) {
      setError('Need at least 3 corners — use Close polygon when done');
      return;
    }
    const area = {
      id: editArea?.id ?? crypto.randomUUID(),
      name: name.trim(),
      boundary,
      createdAt: editArea?.createdAt ?? Date.now(),
      gridCellSizeM,
    };
    await saveArea(area);
    onSaved(area);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseAreaPackage(reader.result, file.name);
      if (parsed?.boundary) {
        setBoundary(parsed.boundary);
        if (parsed.name) setName(parsed.name);
        if (parsed.gridCellSizeM) setGridCellSizeM(resolveGridCellSizeM(parsed));
        setError('');
        setClosedMsg('Boundary loaded from file');
      } else {
        setError('Could not parse area file');
      }
    };
    reader.readAsText(file);
  };

  const handlePlaceSelect = (place) => {
    setMapCenter([place.lat, place.lng]);
    setSearchJumpId((id) => id + 1);
    setError('');
  };

  return (
    <div className="screen setup-screen">
      <header className="screen-header">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Back
        </button>
        <h1>{editArea ? 'Edit area' : 'Draw area'}</h1>
        <button type="button" className="btn-primary" onClick={handleSave}>
          Save
        </button>
      </header>

      <div className={`map-wrap setup-map ${draw.drawing ? 'draw-mode-active' : ''}`}>
        <MapView
          key={`map-${searchJumpId}`}
          center={mapCenter}
          zoom={16}
          baseLayer={mapStyle}
          followMode="none"
        >
          <PolygonDrawMapLayers
            drawing={draw.drawing}
            vertices={draw.vertices}
            closedBoundary={boundary}
            onMapClick={draw.handleMapClick}
            fitBoundary={editArea?.boundary ?? boundary}
          />
        </MapView>
      </div>

      <div className="setup-form">
        <PlaceAutocomplete
          value={name}
          onChange={setName}
          userLocation={center}
          onPlaceSelect={handlePlaceSelect}
          placeholder="Area name or place (e.g. Ward 12, Karol Bagh)"
        />
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
        {editArea &&
          resolveGridCellSizeM(editArea) !== gridCellSizeM && (
            <p className="hint grid-size-warning">
              Changing cell size uses a new grid on the next track session. Past session marks may not line up.
            </p>
          )}
        <p className="hint setup-hint-desktop">Smaller cells = finer gaps map; very large areas may feel slower.</p>
        <div className="map-style-toggle">
          <button
            type="button"
            className={mapStyle === 'satellite' ? 'active' : ''}
            onClick={() => setMapStyle('satellite')}
          >
            Satellite
          </button>
          <button
            type="button"
            className={mapStyle === 'streets' ? 'active' : ''}
            onClick={() => setMapStyle('streets')}
          >
            Street
          </button>
        </div>
        <label className="import-label">
          Import area file
          <input
            type="file"
            accept=".json,.geojson,.census-area.json,application/json"
            onChange={handleImport}
            hidden
          />
        </label>
        <PolygonDrawToolbar
          drawing={draw.drawing}
          vertices={draw.vertices}
          onStart={draw.handleStart}
          onCancel={draw.handleCancel}
          onUndo={draw.handleUndo}
          onClose={draw.handleClose}
        />
        {error && <p className="error-text">{error}</p>}
        {closedMsg && <p className="success-text">{closedMsg}</p>}
        <details className="draw-tips">
          <summary>Drawing tips</summary>
          <ol className="draw-steps">
            <li>
              Type a place name and <strong>pick from suggestions</strong> (nearest shown first) to move the map
            </li>
            <li>
              Tap <strong>Start drawing boundary</strong>, then tap each corner on the map above
            </li>
            <li>Add as many points as you need — there is no 3-point limit</li>
            <li>
              When done, tap <strong>Close polygon</strong> (needs at least 3 corners)
            </li>
          </ol>
        </details>
      </div>
    </div>
  );
}
