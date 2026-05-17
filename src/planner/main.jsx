import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PlannerApp } from './PlannerApp.jsx';
import { fixLeafletIcons } from '../lib/leafletIcons';
import './planner.css';

fixLeafletIcons();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PlannerApp />
  </StrictMode>,
);
