import { distance, point } from '@turf/turf';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

function pickShortName(item) {
  const addr = item.address || {};
  const parts = [
    addr.neighbourhood,
    addr.suburb,
    addr.village,
    addr.town,
    addr.city_district,
    addr.city,
    addr.county,
    addr.state_district,
    addr.state,
  ].filter(Boolean);

  if (parts.length > 0) return parts[0];

  const display = item.display_name || '';
  const first = display.split(',')[0]?.trim();
  return first || display;
}

/**
 * @param {string} query
 * @param {{ lat?: number, lng?: number, limit?: number }} options
 * @returns {Promise<Array<{ id: string, displayName: string, shortName: string, lat: number, lng: number, distanceM: number | null }>>}
 */
export async function searchPlaces(query, options = {}) {
  const { lat, lng, limit = 8 } = options;
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: String(limit),
    addressdetails: '1',
  });

  if (lat != null && lng != null) {
    params.set('lat', String(lat));
    params.set('lon', String(lng));
  }

  const res = await fetch(`${NOMINATIM_BASE}?${params}`, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'CensusAreaTracker/1.0',
    },
  });

  if (!res.ok) throw new Error('Place search failed');

  const data = await res.json();
  const userPt =
    lat != null && lng != null ? point([lng, lat]) : null;

  const places = data.map((item) => {
    const placeLat = parseFloat(item.lat);
    const placeLng = parseFloat(item.lon);
    let distanceM = null;

    if (userPt) {
      distanceM = distance(userPt, point([placeLng, placeLat]), { units: 'meters' });
    }

    return {
      id: String(item.place_id),
      displayName: item.display_name,
      shortName: pickShortName(item),
      lat: placeLat,
      lng: placeLng,
      distanceM,
    };
  });

  if (userPt) {
    places.sort((a, b) => {
      if (a.distanceM == null) return 1;
      if (b.distanceM == null) return -1;
      return a.distanceM - b.distanceM;
    });
  }

  return places;
}

export function formatPlaceDistance(meters) {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

/**
 * Parse lat/lng from free text (planner "go to coordinates").
 * Accepts: "28.61, 77.21", "28.61 77.21", "77.21, 28.61" (auto-detects if one value > 90).
 * @returns {{ lat: number, lng: number } | null}
 */
export function parseCoordinates(text) {
  const cleaned = text
    .trim()
    .replace(/[°'"NSEWnsew]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;

  const parts = cleaned.split(/[,;\s]+/).filter(Boolean);
  if (parts.length < 2) return null;

  const a = parseFloat(parts[0]);
  const b = parseFloat(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  let lat;
  let lng;

  const aIsLat = Math.abs(a) <= 90;
  const bIsLat = Math.abs(b) <= 90;
  const aIsLng = Math.abs(a) <= 180;
  const bIsLng = Math.abs(b) <= 180;

  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    lng = a;
    lat = b;
  } else if (Math.abs(b) > 90 && Math.abs(a) <= 90) {
    lat = a;
    lng = b;
  } else if (aIsLat && bIsLng && !bIsLat) {
    lat = a;
    lng = b;
  } else if (bIsLat && aIsLng && !aIsLat) {
    lat = b;
    lng = a;
  } else {
    lat = a;
    lng = b;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}
