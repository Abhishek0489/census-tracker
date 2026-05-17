import { deleteArea, getAllAreas } from '../lib/storage';
import { resolveGridCellSizeM } from '../lib/geo';
import { useEffect, useState } from 'react';

export function AreaList({ onSelectArea, onNewArea, onImportArea, onEditArea }) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setAreas(await getAllAreas());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (confirm('Delete this area and its saved boundary?')) {
      await deleteArea(id);
      load();
    }
  };

  return (
    <div className="screen areas-screen">
      <header className="screen-header">
        <h1>Census Tracker</h1>
      </header>

      <p className="tagline">Draw your assigned area, then track where you have walked.</p>

      <div className="areas-cta-row">
        <button type="button" className="btn-large btn-primary areas-cta" onClick={onNewArea}>
          + Draw new area
        </button>
        <button type="button" className="btn-large btn-secondary areas-cta" onClick={onImportArea}>
          Import area
        </button>
      </div>

      <div className="screen-body">
      {loading ? (
        <p className="loading">Loading areas...</p>
      ) : areas.length === 0 ? (
        <p className="empty">No saved areas yet. Draw your first boundary from the paper map.</p>
      ) : (
        <ul className="area-list">
          {areas.map((area) => (
            <li key={area.id}>
              <button type="button" className="area-card" onClick={() => onSelectArea(area)}>
                <strong>{area.name}</strong>
                <span>
                  {resolveGridCellSizeM(area)} m cells · {new Date(area.createdAt).toLocaleDateString()}
                </span>
              </button>
              <div className="area-actions">
                <button type="button" className="btn-ghost" onClick={() => onEditArea(area)}>
                  Edit
                </button>
                <button type="button" className="btn-ghost danger" onClick={(e) => handleDelete(area.id, e)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
