import { useEffect, useRef, useState } from 'react';
import { MapView } from '../components/MapView';
import { MapPanTo } from '../components/MapPanTo';
import { UserLocationMarker } from '../components/UserLocationMarker';
import {
  PolygonDrawMapLayers,
  PolygonDrawToolbar,
  usePolygonDraw,
} from '../components/PolygonDrawTool';
import { PlaceAutocomplete } from '../components/PlaceAutocomplete';
import { useWatchLocation } from '../hooks/useWatchLocation';
import { parseCoordinates } from '../lib/geocode';
import {
  buildPolygonFromVertices,
  GRID_CELL_SIZE_OPTIONS,
  isValidClosedPolygon,
  verticesFromPolygon,
} from '../lib/geo';
import { CornerPointsList, CornerPointsMapLayers } from './CornerPointsTool';
import { exportAreaGeoJson, exportAreaPackage } from '../lib/areaPackage';
import { downloadTextFile } from '../lib/geo';

const DEFAULT_CENTER = [20.5937, 78.9629];

export function PlannerApp() {
  const [name, setName] = useState('');
  const [boundary, setBoundary] = useState(null);
  const [error, setError] = useState('');
  const [closedMsg, setClosedMsg] = useState('');
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapStyle, setMapStyle] = useState('satellite');
  const [searchJumpId, setSearchJumpId] = useState(0);
  const [gridCellSizeM, setGridCellSizeM] = useState(40);
  const [panCenter, setPanCenter] = useState(null);
  const [panTrigger, setPanTrigger] = useState(0);
  const [coordInput, setCoordInput] = useState('');
  const [coordMsg, setCoordMsg] = useState('');
  const [coordTarget, setCoordTarget] = useState(null);
  const [cornerPoints, setCornerPoints] = useState([]);
  const [cornerPreviewClosed, setCornerPreviewClosed] = useState(false);

  const userMovedMapRef = useRef(false);
  const didCenterOnGpsRef = useRef(false);
  const { position, error: locationError } = useWatchLocation();

  const syncCornerPointsFromBoundary = (poly) => {
    const verts = verticesFromPolygon(poly);
    setCornerPoints(verts.map(([lat, lng]) => ({ lat, lng })));
    setCornerPreviewClosed(true);
  };

  const draw = usePolygonDraw({
    onCreated: (poly) => {
      setBoundary(poly);
      syncCornerPointsFromBoundary(poly);
      setClosedMsg('Boundary closed — ready to download');
    },
    onClosed: () => {
      setClosedMsg('Boundary closed — ready to download');
    },
    existingBoundary: boundary,
  });

  useEffect(() => {
    if (!position || userMovedMapRef.current || didCenterOnGpsRef.current) return;
    didCenterOnGpsRef.current = true;
    setMapCenter([position.lat, position.lng]);
  }, [position]);

  const canExport = name.trim() && boundary && isValidClosedPolygon(boundary);

  const userLocationForSearch = position
    ? [position.lat, position.lng]
    : mapCenter;

  const handleDownloadArea = () => {
    if (!canExport) {
      setError('Enter a name and close the polygon first');
      return;
    }
    const { json, filename } = exportAreaPackage({
      name: name.trim(),
      boundary,
      gridCellSizeM,
    });
    downloadTextFile(filename, json, 'application/json');
    setError('');
    setClosedMsg(`Downloaded ${filename}`);
  };

  const handleDownloadGeoJson = () => {
    if (!canExport) {
      setError('Enter a name and close the polygon first');
      return;
    }
    const { json, filename } = exportAreaGeoJson({
      name: name.trim(),
      boundary,
      gridCellSizeM,
    });
    downloadTextFile(filename, json, 'application/json');
    setError('');
    setClosedMsg(`Downloaded ${filename}`);
  };

  const handlePlaceSelect = (place) => {
    userMovedMapRef.current = true;
    setMapCenter([place.lat, place.lng]);
    setSearchJumpId((id) => id + 1);
    setError('');
    setCoordMsg('');
  };

  const panMapTo = (lat, lng) => {
    userMovedMapRef.current = true;
    const center = [lat, lng];
    setMapCenter(center);
    setPanCenter(center);
    setPanTrigger((t) => t + 1);
  };

  const handleMyLocation = () => {
    if (!position) return;
    panMapTo(position.lat, position.lng);
    setCoordMsg('');
  };

  const handleGoToCoordinates = () => {
    const parsed = parseCoordinates(coordInput);
    if (!parsed) {
      setCoordMsg('Invalid coordinates — use latitude, longitude (e.g. 28.61, 77.21)');
      return;
    }
    panMapTo(parsed.lat, parsed.lng);
    setCoordTarget({ lat: parsed.lat, lng: parsed.lng });
    setCoordMsg(`Orange dot marks ${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`);
    setError('');
  };

  const handleAddCornerPoint = () => {
    const parsed = parseCoordinates(coordInput);
    if (!parsed) {
      setCoordMsg('Invalid coordinates — use latitude, longitude (e.g. 28.61, 77.21)');
      return;
    }
    draw.handleCancel();
    setCornerPreviewClosed(false);
    const pointNum = cornerPoints.length + 1;
    setCornerPoints((prev) => [...prev, { lat: parsed.lat, lng: parsed.lng }]);
    setCoordMsg(`Point ${pointNum} added — ${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`);
    panMapTo(parsed.lat, parsed.lng);
    setCoordTarget(null);
    setCoordInput('');
    setError('');
    setClosedMsg('');
  };

  const handleRemoveCornerPoint = (index) => {
    setCornerPoints((prev) => prev.filter((_, i) => i !== index));
    setCornerPreviewClosed(false);
    setBoundary(null);
    setClosedMsg('');
  };

  const moveCornerPoint = (index, delta) => {
    setCornerPoints((prev) => {
      const next = [...prev];
      const j = index + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    setCornerPreviewClosed(false);
    setBoundary(null);
    setClosedMsg('');
  };

  const handleClearCornerPoints = () => {
    setCornerPoints([]);
    setCornerPreviewClosed(false);
    setBoundary(null);
    setClosedMsg('');
    setCoordMsg('');
  };

  const handleCreateAreaFromPoints = () => {
    if (cornerPoints.length < 3) {
      setError('Add at least 3 corner points');
      return;
    }
    const poly = buildPolygonFromVertices(
      cornerPoints.map((p) => [p.lat, p.lng]),
    );
    if (!poly || !isValidClosedPolygon(poly)) {
      setError('Could not build a valid polygon from these points');
      return;
    }
    draw.handleCancel();
    setBoundary(poly);
    setCornerPreviewClosed(true);
    setClosedMsg('Area created from points — ready to download');
    setError('');
  };

  const canCreateFromPoints = cornerPoints.length >= 3;

  const handleStartDraw = () => {
    setCornerPoints([]);
    setCornerPreviewClosed(false);
    setBoundary(null);
    setClosedMsg('');
    draw.handleStart();
  };

  const fitBoundsGeoJson = boundary
    ? { type: 'Feature', geometry: boundary }
    : null;

  return (
    <div className="planner-app">
      <header className="planner-header">
        <div>
          <h1>Census Area Planner</h1>
          <p className="planner-subtitle">
            Draw boundaries on a large screen, then send the file to the field app.
          </p>
        </div>
        <a className="planner-link-mobile" href={import.meta.env.BASE_URL}>
          Open mobile tracker →
        </a>
      </header>

      <div className="planner-layout">
        <aside className="planner-sidebar">
          <PlaceAutocomplete
            value={name}
            onChange={setName}
            userLocation={userLocationForSearch}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Area name or place (e.g. Ward 12, Karol Bagh)"
          />

          <div className="planner-location-row">
            {locationError ? (
              <p className="planner-location-status planner-location-error">
                Location unavailable — allow location in your browser (HTTPS or localhost).
              </p>
            ) : position ? (
              <p className="planner-location-status">
                Blue dot on map = your location
                {position.accuracy != null && (
                  <span className="planner-location-accuracy">
                    {' '}
                    (~{Math.round(position.accuracy)} m)
                  </span>
                )}
              </p>
            ) : (
              <p className="planner-location-status">Locating you…</p>
            )}
            <button
              type="button"
              className="planner-btn-location"
              onClick={handleMyLocation}
              disabled={!position}
            >
              My location
            </button>
          </div>

          <div className="planner-coords">
            <label className="planner-field">
              <span>Paste corner coordinates</span>
              <input
                type="text"
                value={coordInput}
                onChange={(e) => setCoordInput(e.target.value)}
                placeholder="latitude, longitude (e.g. 28.61, 77.21)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCornerPoint();
                }}
              />
            </label>
            <div className="planner-coords-actions">
              <button type="button" className="planner-btn-location" onClick={handleGoToCoordinates}>
                Go
              </button>
              <button type="button" className="planner-btn-add-point" onClick={handleAddCornerPoint}>
                Add point
              </button>
            </div>
            {coordTarget && !coordMsg.startsWith('Invalid') && (
              <p className="planner-coord-hint">Orange dot on map = preview (Go only)</p>
            )}
            {coordMsg && (
              <p
                className={
                  coordMsg.startsWith('Invalid')
                    ? 'planner-coord-msg planner-coord-error'
                    : 'planner-coord-msg'
                }
              >
                {coordMsg}
              </p>
            )}
          </div>

          <div className="planner-corner-section">
            <div className="planner-corner-header">
              <span className="planner-corner-title">Corner points ({cornerPoints.length})</span>
              {cornerPoints.length > 0 && (
                <button type="button" className="planner-corner-clear" onClick={handleClearCornerPoints}>
                  Clear all
                </button>
              )}
            </div>
            <CornerPointsList
              points={cornerPoints}
              onRemove={handleRemoveCornerPoint}
              onMoveUp={(i) => moveCornerPoint(i, -1)}
              onMoveDown={(i) => moveCornerPoint(i, 1)}
            />
            <button
              type="button"
              className="planner-btn-primary"
              onClick={handleCreateAreaFromPoints}
              disabled={!canCreateFromPoints}
            >
              Create area from points
            </button>
            {cornerPoints.length > 0 && cornerPoints.length < 3 && (
              <p className="planner-corner-hint">Add at least 3 points to close the boundary.</p>
            )}
          </div>

          <label className="planner-field">
            <span>Coverage cell size</span>
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

          <PolygonDrawToolbar
            drawing={draw.drawing}
            vertices={draw.vertices}
            onStart={handleStartDraw}
            onCancel={draw.handleCancel}
            onUndo={draw.handleUndo}
            onClose={draw.handleClose}
          />

          <div className="planner-export">
            <button
              type="button"
              className="planner-btn-primary"
              onClick={handleDownloadArea}
              disabled={!canExport}
            >
              Download area file
            </button>
            <button
              type="button"
              className="planner-btn-secondary"
              onClick={handleDownloadGeoJson}
              disabled={!canExport}
            >
              Download GeoJSON
            </button>
          </div>

          {error && <p className="planner-error">{error}</p>}
          {closedMsg && <p className="planner-success">{closedMsg}</p>}

          <ol className="planner-steps">
            <li>Allow location when prompted so the blue dot shows where you are</li>
            <li>
              Search a place, paste coords from Google Maps and tap <strong>Add point</strong>, or
              use <strong>My location</strong>
            </li>
            <li>
              Add 3+ corners → <strong>Create area from points</strong>, or draw on the map and{' '}
              <strong>Close polygon</strong>
            </li>
            <li>Enter a name and download the area file</li>
            <li>
              Send the file to the phone → mobile app → <strong>Import area</strong>
            </li>
          </ol>
        </aside>

        <main className={`planner-map ${draw.drawing ? 'draw-mode-active' : ''}`}>
          <MapView
            key={`map-${searchJumpId}`}
            center={mapCenter}
            zoom={16}
            baseLayer={mapStyle}
            followMode="none"
            fitBoundsGeoJson={fitBoundsGeoJson}
          >
            <MapPanTo center={panCenter} trigger={panTrigger} />
            <UserLocationMarker position={position} />
            <UserLocationMarker position={coordTarget} variant="target" />
            <CornerPointsMapLayers
              points={cornerPoints}
              areaClosed={Boolean(boundary && cornerPreviewClosed)}
            />
            <PolygonDrawMapLayers
              drawing={draw.drawing}
              vertices={draw.vertices}
              closedBoundary={boundary}
              onMapClick={draw.handleMapClick}
              fitBoundary={boundary}
            />
          </MapView>
        </main>
      </div>
    </div>
  );
}
