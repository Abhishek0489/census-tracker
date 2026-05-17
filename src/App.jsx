import { useState, useEffect } from 'react';
import { AreaList } from './components/AreaList';
import { BoundarySetup } from './components/BoundarySetup';
import { TrackScreen } from './components/TrackScreen';
import { SessionHistory } from './components/SessionHistory';
import { HelpModal } from './components/HelpModal';
import { ImportArea } from './components/ImportArea';
import { fixLeafletIcons } from './lib/leafletIcons';
import './App.css';

const DEFAULT_CENTER = [20.5937, 78.9629];

export default function App() {
  const [screen, setScreen] = useState('areas');
  const [selectedArea, setSelectedArea] = useState(null);
  const [editArea, setEditArea] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fixLeafletIcons();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
  }, []);

  const nav = (
    <nav className="bottom-nav">
      <button
        type="button"
        className={
          screen === 'areas' || screen === 'setup' || screen === 'track' || screen === 'import'
            ? 'active'
            : ''
        }
        onClick={() => {
          setScreen('areas');
          setEditArea(null);
        }}
      >
        Areas
      </button>
      <button
        type="button"
        className={screen === 'history' ? 'active' : ''}
        onClick={() => setScreen('history')}
      >
        History
      </button>
      <button type="button" onClick={() => setShowHelp(true)}>
        Help
      </button>
    </nav>
  );

  return (
    <div className="app">
      {screen === 'areas' && (
        <div className="app-shell">
          <AreaList
            onSelectArea={(area) => {
              setSelectedArea(area);
              setScreen('track');
            }}
            onNewArea={() => {
              setEditArea(null);
              setScreen('setup');
            }}
            onImportArea={() => setScreen('import')}
            onEditArea={(area) => {
              setEditArea(area);
              setScreen('setup');
            }}
          />
          {nav}
        </div>
      )}

      {screen === 'import' && (
        <ImportArea onCancel={() => setScreen('areas')} onSaved={() => setScreen('areas')} />
      )}

      {screen === 'setup' && (
        <BoundarySetup
          center={mapCenter}
          editArea={editArea}
          onCancel={() => setScreen('areas')}
          onSaved={() => setScreen('areas')}
        />
      )}

      {screen === 'track' && selectedArea && (
        <TrackScreen
          area={selectedArea}
          onBack={() => setScreen('areas')}
          onSessionEnd={() => setScreen('history')}
        />
      )}

      {screen === 'history' && (
        <div className="app-shell">
          <SessionHistory onBack={() => setScreen('areas')} />
          {nav}
        </div>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
