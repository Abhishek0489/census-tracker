import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, GeoJSON, Polyline, useMapEvents } from 'react-leaflet';
import { MapView } from './MapView';
import { CoverageLayer } from './CoverageLayer';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  buildCoverageGrid,
  coveragePercent,
  findCellAtPoint,
  formatDistance,
  formatDuration,
  markVisitedCells,
  pointInBoundary,
  resolveGridCellSizeM,
  trackDistanceMeters,
} from '../lib/geo';
import { getActiveSession, saveSession } from '../lib/storage';

function MapTapHandler({ enabled, cells, onCellFound }) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      const cell = findCellAtPoint(cells, e.latlng.lat, e.latlng.lng);
      if (cell) onCellFound(cell.id);
    },
  });
  return null;
}

export function TrackScreen({ area, onBack, onSessionEnd }) {
  const center = useMemo(() => {
    const ring = area.boundary.coordinates[0];
    let lat = 0;
    let lng = 0;
    ring.forEach(([x, y]) => {
      lng += x;
      lat += y;
    });
    return [lat / ring.length, lng / ring.length];
  }, [area]);

  const [session, setSession] = useState(null);
  const [cells, setCells] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [markMode, setMarkMode] = useState(false);
  const [markToast, setMarkToast] = useState('');
  const [manualMarkStack, setManualMarkStack] = useState([]);
  const [mapStyle, setMapStyle] = useState('satellite');
  const sessionRef = useRef(null);
  const geo = useGeolocation();

  const fitBoundsGeoJson = useMemo(
    () => ({ type: 'Feature', geometry: area.boundary }),
    [area.boundary],
  );

  useEffect(() => {
    setCells(buildCoverageGrid(area));
  }, [area]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let active = await getActiveSession();
      if (active && active.areaId !== area.id) active = null;
      if (!active) {
        active = {
          id: crypto.randomUUID(),
          areaId: area.id,
          startedAt: Date.now(),
          points: [],
          visitedCellIds: [],
          status: 'paused',
        };
      }
      if (!cancelled) {
        setSession(active);
        sessionRef.current = active;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [area.id]);

  useEffect(() => {
    if (!geo.tracking || !session) return;
    const t = setInterval(() => setElapsed(Date.now() - session.startedAt), 1000);
    return () => clearInterval(t);
  }, [geo.tracking, session]);

  const persistSession = useCallback(async (s) => {
    sessionRef.current = s;
    setSession(s);
    await saveSession(s);
  }, []);

  useEffect(() => {
    if (!geo.position || !session || !geo.tracking) return;
    if (!geo.acceptPoint(geo.position)) return;

    const last = session.points[session.points.length - 1];
    if (last && last.timestamp === geo.position.timestamp) return;

    const newPoints = [...session.points, geo.position];
    const newVisited = markVisitedCells(
      cells,
      [geo.position],
      new Set(session.visitedCellIds),
      30,
    );
    const updated = {
      ...session,
      points: newPoints,
      visitedCellIds: [...new Set([...session.visitedCellIds, ...newVisited])],
      status: 'active',
    };
    persistSession(updated);
  }, [geo.position, geo.tracking, session, cells, geo, persistSession]);

  const markCell = useCallback(
    async (cellId, alreadyVisited) => {
      if (!sessionRef.current) return;
      if (alreadyVisited) {
        setMarkToast('Already marked');
        setTimeout(() => setMarkToast(''), 1500);
        return;
      }
      const updated = {
        ...sessionRef.current,
        visitedCellIds: [...new Set([...sessionRef.current.visitedCellIds, cellId])],
      };
      await persistSession(updated);
      setManualMarkStack((prev) => [...prev, cellId]);
      setMarkToast('Cell marked');
      setTimeout(() => setMarkToast(''), 1500);
    },
    [persistSession],
  );

  const handleUndoMark = async () => {
    if (!sessionRef.current || manualMarkStack.length === 0) return;
    const lastId = manualMarkStack[manualMarkStack.length - 1];
    const updated = {
      ...sessionRef.current,
      visitedCellIds: sessionRef.current.visitedCellIds.filter((id) => id !== lastId),
    };
    await persistSession(updated);
    setManualMarkStack((prev) => prev.slice(0, -1));
    setMarkToast('Undone');
    setTimeout(() => setMarkToast(''), 1500);
  };

  const inside =
    geo.position && pointInBoundary(geo.position.lat, geo.position.lng, area.boundary);

  const handleStart = () => {
    geo.startWatching();
    if (session) persistSession({ ...session, status: 'active' });
  };

  const handlePause = async () => {
    geo.pauseWatching();
    if (sessionRef.current) {
      await persistSession({ ...sessionRef.current, status: 'paused' });
    }
  };

  const handleStop = async () => {
    geo.stopWatching();
    setMarkMode(false);
    if (sessionRef.current) {
      const ended = {
        ...sessionRef.current,
        status: 'completed',
        endedAt: Date.now(),
      };
      await persistSession(ended);
      onSessionEnd(ended);
    }
  };

  const pct = coveragePercent(session?.visitedCellIds?.length ?? 0, cells.length);
  const dist = trackDistanceMeters(session?.points ?? []);
  const pathPositions = (session?.points ?? []).map((p) => [p.lat, p.lng]);

  const followCenter =
    geo.tracking && geo.position ? [geo.position.lat, geo.position.lng] : null;

  if (!session) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="screen track-screen">
      <header className="screen-header">
        <button type="button" className="btn-ghost" onClick={onBack}>
          Back
        </button>
        <h1>{area.name}</h1>
        <span className="coverage-badge">{pct}%</span>
      </header>

      <div className="stats-bar">
        <span>{formatDistance(dist)}</span>
        <span>{formatDuration(elapsed || Date.now() - session.startedAt)}</span>
        <span className="cell-size-stat">{resolveGridCellSizeM(area)} m cells</span>
        <span className={inside ? 'inside' : 'outside'}>
          {geo.position ? (inside ? 'Inside area' : 'Outside area') : 'Waiting for GPS...'}
        </span>
      </div>

      {markMode && (
        <div className="mark-mode-banner">
          Tap red/gray cells you have covered
          {markToast && <span className="mark-toast"> — {markToast}</span>}
        </div>
      )}

      <div className={`map-wrap ${markMode ? 'mark-mode-active' : ''}`}>
        <div className="map-style-toggle map-style-toggle--overlay">
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
        <MapView
          center={center}
          zoom={15}
          baseLayer={mapStyle}
          zoomControl
          followMode={geo.tracking ? 'pan' : 'none'}
          followCenter={followCenter}
          fitBoundsGeoJson={fitBoundsGeoJson}
        >
          <GeoJSON
            data={{ type: 'Feature', geometry: area.boundary }}
            style={{ color: '#1e40af', weight: 3, fillOpacity: 0.05 }}
          />
          <CoverageLayer
            cells={cells}
            visitedIds={session.visitedCellIds}
            interactive={markMode}
            onCellClick={markCell}
          />
          <MapTapHandler enabled={markMode} cells={cells} onCellFound={(id) => markCell(id, session.visitedCellIds.includes(id))} />
          {pathPositions.length > 1 && (
            <Polyline positions={pathPositions} pathOptions={{ color: '#2563eb', weight: 4 }} />
          )}
          {geo.position && (
            <CircleMarker
              center={[geo.position.lat, geo.position.lng]}
              radius={8}
              pathOptions={{
                color: '#fff',
                fillColor: inside ? '#22c55e' : '#ef4444',
                fillOpacity: 1,
                weight: 2,
              }}
            />
          )}
        </MapView>
      </div>

      <div className="track-footer">
        <div className="track-controls">
        <button
          type="button"
          className={`btn-secondary mark-toggle ${markMode ? 'active' : ''}`}
          onClick={() => setMarkMode((m) => !m)}
        >
          {markMode ? 'Done marking' : 'Mark cells manually'}
        </button>
        {markMode && manualMarkStack.length > 0 && (
          <button type="button" className="btn-ghost" onClick={handleUndoMark}>
            Undo last mark
          </button>
        )}
        {!geo.tracking && !geo.paused && (
          <button type="button" className="btn-large btn-start" onClick={handleStart}>
            Start tracking
          </button>
        )}
        {geo.tracking && (
          <button type="button" className="btn-large btn-pause" onClick={handlePause}>
            Pause
          </button>
        )}
        {geo.paused && (
          <button type="button" className="btn-large btn-start" onClick={handleStart}>
            Resume
          </button>
        )}
        {(geo.tracking || geo.paused || session.points.length > 0) && (
          <button type="button" className="btn-large btn-stop" onClick={handleStop}>
            Stop session
          </button>
        )}
        </div>
        <p className="track-hints">
          Keep screen on for GPS · Pinch map to zoom · Coverage is approximate
        </p>
        {geo.error && <p className="error-text track-error">{geo.error}</p>}
      </div>
    </div>
  );
}
