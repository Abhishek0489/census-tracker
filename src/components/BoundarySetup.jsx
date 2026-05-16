import { useState } from 'react';
import { MapView } from './MapView';
import {
  PolygonDrawMapLayers,
  PolygonDrawToolbar,
  usePolygonDraw,
} from './PolygonDrawTool';
import { DEFAULT_GRID_CELL_SIZE_M, isValidClosedPolygon, parseGeoJsonPolygon } from '../lib/geo';
import { saveArea } from '../lib/storage';

export function BoundarySetup({ center, onSaved, onCancel, editArea }) {
  const [name, setName] = useState(editArea?.name ?? '');
  const [boundary, setBoundary] = useState(editArea?.boundary ?? null);
  const [error, setError] = useState('');
  const [closedMsg, setClosedMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState(center);
  const [mapStyle, setMapStyle] = useState('satellite');
  const [searchJumpId, setSearchJumpId] = useState(0);

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
      gridCellSizeM: editArea?.gridCellSizeM ?? DEFAULT_GRID_CELL_SIZE_M,
    };
    await saveArea(area);
    onSaved(area);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const poly = parseGeoJsonPolygon(reader.result);
      if (poly) {
        setBoundary(poly);
        setError('');
        setClosedMsg('Boundary loaded from file');
      } else {
        setError('Could not parse GeoJSON polygon from file');
      }
    };
    reader.readAsText(file);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const data = await res.json();
      if (data[0]) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setSearchJumpId((id) => id + 1);
        setError('');
      } else {
        setError('Place not found');
      }
    } catch {
      setError('Search failed — check internet connection');
    }
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

      <div className="setup-form">
        <input
          type="text"
          placeholder="Area name (e.g. Ward 12 Block A)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
        <div className="search-row">
          <input
            type="text"
            placeholder="Search place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={handleSearch}>
            Go
          </button>
        </div>
        <label className="import-label">
          Import GeoJSON
          <input type="file" accept=".json,.geojson" onChange={handleImport} hidden />
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
        <ol className="draw-steps">
          <li>
            Tap <strong>Start drawing boundary</strong>, then tap each corner on the map
          </li>
          <li>Add as many points as you need — there is no 3-point limit</li>
          <li>
            When done, tap <strong>Close polygon</strong> (needs at least 3 corners)
          </li>
        </ol>
      </div>

      <div className={`map-wrap ${draw.drawing ? 'draw-mode-active' : ''}`}>
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
    </div>
  );
}
