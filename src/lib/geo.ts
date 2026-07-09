import type { Space, SpaceType, WifiReliability } from './supabase';
import { simulateBusyness } from './utils';

export interface Coords { lat: number; lng: number; }
export type GeoResult = { coords: Coords; error: null } | { coords: null; error: string };

export interface OverpassNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export function getUserLocation(): Promise<GeoResult> {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({ coords: null, error: 'Geolocation not supported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, error: null }),
      err => resolve({ coords: null, error: err.message }),
      { timeout: 10000, enableHighAccuracy: false }
    );
  });
}

export function haversineDistance(a: Coords, b: Coords): number {
  const R = 3958.8;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

export async function fetchNearbySpaces(coords: Coords, radiusMeters = 1500): Promise<OverpassNode[]> {
  const { lat, lng } = coords;
  const query = `[out:json][timeout:20];(node["amenity"="cafe"](around:${radiusMeters},${lat},${lng});node["amenity"="library"](around:${radiusMeters},${lat},${lng});node["amenity"="coworking_space"](around:${radiusMeters},${lat},${lng});node["office"="coworking"](around:${radiusMeters},${lat},${lng}););out body;`;
  const resp = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) throw new Error(`Overpass error: ${resp.status}`);
  const json = await resp.json();
  return (json.elements as OverpassNode[]).filter((n: OverpassNode) => n.tags?.name);
}

export function overpassToSpace(node: OverpassNode, userCoords: Coords): Space {
  const coords = { lat: node.lat, lng: node.lon };
  const dist = haversineDistance(userCoords, coords);
  const amenity = node.tags.amenity || node.tags.office || 'cafe';
  const typeMap: Record<string, SpaceType> = { cafe: 'cafe', library: 'library', coworking_space: 'coworking', coworking: 'coworking', restaurant: 'restaurant' };
  const spaceType: SpaceType = typeMap[amenity] ?? 'cafe';
  const busyness = simulateBusyness(String(node.id));
  const wifiMap: Record<string, WifiReliability> = { wlan: 'strong', yes: 'moderate', no: 'none' };
  const wifi: WifiReliability = wifiMap[node.tags.internet_access ?? ''] ?? (spaceType === 'coworking' ? 'strong' : 'moderate');
  const addrParts = [node.tags['addr:housenumber'], node.tags['addr:street']].filter(Boolean);
  const address = addrParts.length > 0 ? addrParts.join(' ') : 'Near you';

  return {
    id: `osm-${node.id}`,
    name: node.tags.name ?? 'Unnamed',
    type: spaceType,
    address,
    distance_miles: Math.round(dist * 10) / 10,
    open_until: parseOpeningHours(node.tags.opening_hours),
    noise_level: spaceType === 'library' ? 'silent' : spaceType === 'coworking' ? 'quiet' : 'moderate',
    seat_count: 20,
    seats_free: busyness === 'full' ? 0 : busyness === 'busy' ? 3 : 10,
    wifi_reliability: wifi,
    busyness,
    has_plugs: spaceType === 'coworking' || node.tags['socket:type2'] !== undefined,
    has_food: spaceType === 'cafe' || spaceType === 'restaurant',
    allows_laptops: spaceType !== 'park',
    is_accessible: node.tags.wheelchair === 'yes' || node.tags.wheelchair === 'limited',
    match_score: 75,
    lat: node.lat,
    lng: node.lon,
    last_updated_ago: 'live',
    checkin_count: 0,
    photo_url: null,
    google_place_id: null,
    rating: 4.0,
    review_count: 0,
    overpass_id: String(node.id),
    created_at: new Date().toISOString(),
  };
}

function parseOpeningHours(oh?: string): string {
  if (!oh) return '9pm';
  if (oh.includes('24/7')) return '24h';
  const match = oh.match(/(\d{1,2}):(\d{2})\s*$/) ?? oh.match(/[-–](\d{1,2}):(\d{2})/);
  if (match) {
    const h = parseInt(match[1]);
    return h >= 12 ? `${h > 12 ? h - 12 : h}pm` : `${h}am`;
  }
  return '9pm';
}

export function openDirections(dest: Coords, name: string): void {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${dest.lat},${dest.lng}&dirflg=w`, '_blank');
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&destination_place_id=${encodeURIComponent(name)}&travelmode=walking`, '_blank');
  }
}

/**
 * Real walking travel time in minutes, via OSRM's free public routing API
 * (no key required — project-osrm.org). Falls back to a straight-line
 * estimate (3mph walking pace) if the routing service is unreachable.
 */
export async function fetchWalkingTravelMinutes(from: Coords, to: Coords): Promise<{ minutes: number; estimated: boolean }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/walking/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (resp.ok) {
      const data = await resp.json();
      const seconds = data?.routes?.[0]?.duration;
      if (typeof seconds === 'number' && seconds > 0) {
        return { minutes: Math.max(1, Math.round(seconds / 60)), estimated: false };
      }
    }
  } catch {
    // fall through to straight-line estimate below
  }
  const miles = haversineDistance(from, to);
  const minutes = Math.max(1, Math.round((miles / 3) * 60)); // ~3mph walking pace
  return { minutes, estimated: true };
}
