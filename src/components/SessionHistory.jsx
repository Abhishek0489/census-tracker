import { useEffect, useState } from 'react';
import { getAllAreas, getAllSessions, deleteSession } from '../lib/storage';
import {
  coveragePercent,
  formatDuration,
  trackDistanceMeters,
  sessionToGeoJson,
  sessionToGpx,
  downloadTextFile,
  buildCoverageGrid,
} from '../lib/geo';

export function SessionHistory({ onBack }) {
  const [sessions, setSessions] = useState([]);
  const [areas, setAreas] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, a] = await Promise.all([getAllSessions(), getAllAreas()]);
      const areaMap = {};
      a.forEach((ar) => {
        areaMap[ar.id] = ar;
      });
      setAreas(areaMap);
      setSessions(s.filter((x) => x.status === 'completed'));
      setLoading(false);
    })();
  }, []);

  const getCoverage = (session) => {
    const area = areas[session.areaId];
    if (!area) return 0;
    const cells = buildCoverageGrid(area);
    return coveragePercent(session.visitedCellIds.length, cells.length);
  };

  const handleExport = (session, format) => {
    const area = areas[session.areaId];
    const name = area?.name ?? 'track';
    const safe = name.replace(/\s+/g, '_');
    if (format === 'geojson') {
      downloadTextFile(`${safe}.geojson`, sessionToGeoJson(session, name), 'application/json');
    } else {
      downloadTextFile(`${safe}.gpx`, sessionToGpx(session, name), 'application/gpx+xml');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this session?')) {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="screen history-screen">
      <header className="screen-header">
        <button type="button" className="btn-ghost" onClick={onBack}>
          Back
        </button>
        <h1>Session history</h1>
      </header>

      <div className="screen-body">
      {loading ? (
        <p className="loading">Loading...</p>
      ) : sessions.length === 0 ? (
        <p className="empty">No completed sessions yet.</p>
      ) : (
        <ul className="session-list">
          {sessions.map((s) => {
            const area = areas[s.areaId];
            const duration = (s.endedAt ?? s.startedAt) - s.startedAt;
            return (
              <li key={s.id} className="session-card">
                <strong>{area?.name ?? 'Unknown area'}</strong>
                <p>{new Date(s.startedAt).toLocaleString()}</p>
                <p>
                  {formatDuration(duration)} · {trackDistanceMeters(s.points).toFixed(0)} m · {getCoverage(s)}% covered
                </p>
                <div className="session-actions">
                  <button type="button" className="btn-secondary" onClick={() => handleExport(s, 'geojson')}>
                    GeoJSON
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => handleExport(s, 'gpx')}>
                    GPX
                  </button>
                  <button type="button" className="btn-ghost danger" onClick={() => handleDelete(s.id)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </div>
    </div>
  );
}
