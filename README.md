# Census Area Tracker

A mobile-friendly web app (PWA) to draw your assigned census boundary and track where you have walked during field duty.

## Quick start

```bash
cd census-tracker
npm install
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`) on your phone. For GPS to work on mobile, deploy with HTTPS (see below).

## How your parent uses it

1. **At home (Wi‑Fi):** Open the app → **Draw new area** → trace the boundary on the map → save with a name.
2. **In the field:** Tap the saved area → **Start tracking** → walk the streets.
3. **On the map:** Green = covered, blue line = path walked, red/gray = gaps to revisit.
4. **End of day:** **Stop session** → check **History** → export GeoJSON/GPX if needed.

**Tip:** Keep the screen on for reliable GPS. Add to Home Screen for an app-like experience.

## Deploy (HTTPS required for phone GPS)

```bash
npm run build
```

Upload the `dist/` folder to Netlify, Vercel, or GitHub Pages. Share the HTTPS link.

## Tech

JavaScript, React, Vite, Leaflet, Turf.js, IndexedDB. All data stays on the device.

## Continue development

See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for full architecture and how to resume in a new Cursor chat.
