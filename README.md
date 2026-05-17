# Census Area Tracker

A mobile-friendly web app (PWA) to draw your assigned census boundary and track where you have walked during field duty.

## Quick start

```bash
cd census-tracker
npm install
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`) on your phone. For GPS to work on mobile, deploy with HTTPS (see below).

**Desktop planner:** `http://localhost:5173/planner.html` — draw boundaries on a large screen and download an area file to send to the phone. Allow location permission so the blue dot shows your position on the map.

## How your parent uses it

### Option A — Import from desktop planner (recommended for precise boundaries)

1. **On a computer:** Open `/planner.html` → draw the boundary → **Download area file**.
2. **Send the file** to the phone (WhatsApp, email, etc.).
3. **On the phone:** Open the app → **Import area** → choose the file → **Save**.
4. **In the field:** Tap the area → **Start tracking** → walk the streets.

### Option B — Draw on the phone

1. **At home (Wi‑Fi):** Open the app → **Draw new area** → trace the boundary on the map → save with a name.
2. **In the field:** Tap the saved area → **Start tracking** → walk the streets.
3. **On the map:** Green = covered, blue line = path walked, red/gray = gaps to revisit.
4. **End of day:** **Stop session** → check **History** → export GeoJSON/GPX if needed.

(Field steps 2–4 apply after either option A or B.)

**Tip:** Keep the screen on for reliable GPS. Add to Home Screen for an app-like experience.

## Deploy (HTTPS required for phone GPS)

GPS and “Add to Home Screen” need a **public HTTPS URL**. Pick one option below.

### Option A — Vercel (recommended, easiest)

1. Push code to GitHub (already at `https://github.com/Abhishek0489/census-tracker`).
2. Go to [vercel.com](https://vercel.com) → **Sign up** with GitHub.
3. **Add New Project** → Import `census-tracker` repo.
4. Leave defaults (Framework: Vite, Build: `npm run build`, Output: `dist`) — or use included `vercel.json`.
5. Click **Deploy**. You get a URL like `https://census-tracker-xxx.vercel.app`.
6. Open that URL on your parent’s phone → **Add to Home Screen**.

### Option B — Netlify

1. Go to [netlify.com](https://netlify.com) → Sign up with GitHub.
2. **Add new site** → **Import from Git** → select `census-tracker`.
3. Build command: `npm run build`, Publish directory: `dist` (see `netlify.toml`).
4. Deploy and share the `*.netlify.app` link.

### Option C — GitHub Pages

1. On GitHub: repo **Settings** → **Pages** → Source: **GitHub Actions**.
2. Push to `main` — workflow `.github/workflows/deploy-pages.yml` builds and deploys.
3. Site URL: `https://abhishek0489.github.io/census-tracker/`

### Manual build (any static host)

```bash
npm run build
```

Upload the `dist/` folder to any host that serves HTTPS.

## Tech

JavaScript, React, Vite, Leaflet, Turf.js, IndexedDB. All data stays on the device.

## Continue development

See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for full architecture and how to resume in a new Cursor chat.
