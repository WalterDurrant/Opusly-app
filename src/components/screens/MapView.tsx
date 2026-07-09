import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, X, Navigation, ChevronRight, LocateFixed } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Space } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { getBusynessDotColor, getBusynessColor, formatDistance } from '../../lib/utils';
import { getUserLocation, fetchNearbySpaces, overpassToSpace, openDirections, haversineDistance, type Coords } from '../../lib/geo';
import type { Tab } from '../ui/BottomNav';

interface Props {
  onNavigate: (tab: Tab, space?: Space) => void;
  savedIds: Set<string>;
  onSaveToggle: (space: Space) => void;
}

const TYPE_ICONS: Record<string, string> = { cafe: '☕', library: '📚', coworking: '💼', park: '🌿', restaurant: '🍽️' };

const BUSYNESS_COLORS: Record<string, string> = {
  empty: '#22c55e', quiet: '#22c55e', moderate: '#f59e0b', busy: '#f97316', full: '#ef4444',
};

function makeBusynessIcon(busyness: string) {
  const c = BUSYNESS_COLORS[busyness] ?? '#6b7280';
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${c};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;"></div>`,
    iconSize: [16, 16] as [number, number],
    iconAnchor: [8, 8] as [number, number],
  });
}

function makeUserIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#6366f1;border:3px solid white;box-shadow:0 0 0 6px rgba(99,102,241,0.2);"></div>`,
    iconSize: [18, 18] as [number, number],
    iconAnchor: [9, 9] as [number, number],
  });
}

export default function MapView({ onNavigate, onSaveToggle }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof L.map> | null>(null);
  const markersRef = useRef<ReturnType<typeof L.marker>[]>([]);
  const userMarkerRef = useRef<ReturnType<typeof L.marker> | null>(null);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selected, setSelected] = useState<Space | null>(null);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);

  const defaultCenter: Coords = { lat: 51.505, lng: -0.09 };

  // Initialise Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(
      [defaultCenter.lat, defaultCenter.lng], 15
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Load spaces + location
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getUserLocation();
    let coords = defaultCenter;

    if (result.coords) {
      coords = result.coords;
      setUserCoords(result.coords);
    } else {
      setGeoError(result.error);
    }

    // Fly map to user location
    if (mapRef.current && result.coords) {
      mapRef.current.flyTo([result.coords.lat, result.coords.lng], 15, { animate: true, duration: 1.2 });
    }

    const { data: dbSpaces } = await supabase.from('spaces').select('*');

    let overpassSpaces: Space[] = [];
    try {
      const nodes = await fetchNearbySpaces(coords, 2000);
      overpassSpaces = nodes.slice(0, 25).map(n => overpassToSpace(n, coords));
    } catch { /* use DB only */ }

    const dbOverpassIds = new Set((dbSpaces ?? []).map((s: Space) => s.overpass_id).filter(Boolean));
    const freshOverpass = overpassSpaces.filter(s => !dbOverpassIds.has(s.overpass_id));

    const positioned = (dbSpaces ?? []).map((s: Space, i: number) => {
      if (!s.lat || !s.lng) {
        const angle = (i / 6) * 2 * Math.PI;
        const lat = coords.lat + Math.sin(angle) * 0.008;
        const lng = coords.lng + Math.cos(angle) * 0.008;
        return { ...s, lat, lng, distance_miles: Math.round(haversineDistance(coords, { lat, lng }) * 10) / 10 };
      }
      return { ...s, distance_miles: Math.round(haversineDistance(coords, { lat: s.lat!, lng: s.lng! }) * 10) / 10 };
    });

    const allSpaces: Space[] = [
      ...positioned.map((s: Space) => ({ ...s, match_score: 80 })),
      ...freshOverpass.map(s => ({ ...s, match_score: 75 })),
    ];

    setSpaces(allSpaces);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Add/update markers whenever spaces or search changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // User location marker
    if (userMarkerRef.current) userMarkerRef.current.remove();
    if (userCoords) {
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: makeUserIcon() }).addTo(map);
    }

    const q = search.toLowerCase();
    const filtered = spaces.filter(s => {
      if (!s.lat || !s.lng) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q);
    });

    filtered.forEach(space => {
      const marker = L.marker([space.lat!, space.lng!], { icon: makeBusynessIcon(space.busyness) })
        .addTo(map)
        .on('click', () => setSelected(space));
      markersRef.current.push(marker);
    });
  }, [spaces, search, userCoords]);

  const filteredCount = spaces.filter(s => {
    if (!s.lat || !s.lng) return false;
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q);
  }).length;

  return (
    <div className="relative w-full" style={{ height: '100dvh' }}>
      {/* Map container */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 text-sm font-medium">Finding nearby spaces...</p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="absolute top-14 left-4 right-4 z-20">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center gap-3 px-4 py-3">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search spaces..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')}><X className="w-4 h-4 text-gray-400" /></button>
          )}
        </div>
        {geoError && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-xs text-amber-700">📍 Showing demo location — enable location services for real results</span>
            <button
              onClick={load}
              className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold flex-shrink-0 hover:bg-amber-200 transition-colors"
            >
              <LocateFixed className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-28 right-4 z-20 bg-white rounded-xl shadow-md border border-gray-100 px-3 py-2.5 space-y-1.5">
        {[['#22c55e', 'Quiet'], ['#f59e0b', 'Moderate'], ['#ef4444', 'Busy']].map(([color, label]) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Space count */}
      <div className="absolute top-28 left-4 z-20 bg-white rounded-xl shadow-md border border-gray-100 px-3 py-2">
        <p className="text-xs font-semibold text-gray-700">{filteredCount} spaces</p>
      </div>

      {/* Selected space card */}
      {selected && (
        <div className="absolute bottom-24 left-4 right-4 z-20 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex gap-3 p-4">
              <div className={`w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center ${!selected.photo_url ? 'bg-indigo-50' : ''}`}>
                {selected.photo_url
                  ? <img src={selected.photo_url} alt={selected.name} className="w-full h-full object-cover" />
                  : <span className="text-4xl">{TYPE_ICONS[selected.type]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <h3 className="text-gray-900 font-bold text-sm leading-tight truncate">{selected.name}</h3>
                  <button onClick={() => setSelected(null)} className="flex-shrink-0 p-0.5">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <p className="text-gray-400 text-xs mb-2">{selected.address} · {formatDistance(selected.distance_miles)}</p>
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold mb-3 ${getBusynessColor(selected.busyness)}`}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: getBusynessDotColor(selected.busyness) }} />
                  {selected.busyness.charAt(0).toUpperCase() + selected.busyness.slice(1)} now
                </div>
                <div className="flex gap-2">
                  {selected.lat && selected.lng && (
                    <button
                      onClick={() => openDirections({ lat: selected.lat!, lng: selected.lng! }, selected.name)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Directions
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate('map', selected)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
