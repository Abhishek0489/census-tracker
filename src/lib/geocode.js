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
