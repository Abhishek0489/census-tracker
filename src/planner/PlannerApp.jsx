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
import { GRID_CELL_SIZE_OPTIONS, isValidClosedPolygon } from '../lib/geo';
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

  const userMovedMapRef = useRef(false);
  const didCenterOnGpsRef = useRef(false);
  const { position, error: locationError } = useWatchLocation();

  const draw = usePolygonDraw({
    onCreated: (poly) => {
      setBoundary(poly);
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
  };

  const handleMyLocation = () => {
    if (!position) return;
    const center = [position.lat, position.lng];
    setPanCenter(center);
    setPanTrigger((t) => t + 1);
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
            onStart={draw.handleStart}
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
            <li>Search a place, use <strong>My location</strong>, or pan the map</li>
            <li>
              <strong>Start drawing boundary</strong>, click each corner, then{' '}
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
