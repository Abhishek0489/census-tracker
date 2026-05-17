export function HelpModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <h2>How to use</h2>
        <ol>
          <li>
            <strong>Get an area</strong> — Draw on the phone, or import a file from the desktop planner
            (.census-area.json).
          </li>
          <li>
            <strong>Start tracking</strong> — In the field, open the area and tap Start. Walk your streets normally.
          </li>
          <li>
            <strong>Check coverage</strong> — Green cells = visited. Blue line = your path. Return to red/gray gaps.
          </li>
        </ol>
        <p className="disclaimer">This app is a personal helper only — not linked to official census systems.</p>
        <button type="button" className="btn-primary" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
