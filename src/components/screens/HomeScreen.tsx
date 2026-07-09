import { useEffect, useState, useCallback } from 'react';
import { Search, Bell, SlidersHorizontal, ArrowRight, LocateFixed, Timer } from 'lucide-react';
import type { Space, UserProfile, SessionPrefs } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { computeMatchScore, getGreeting } from '../../lib/utils';
import { getUserLocation, fetchNearbySpaces, overpassToSpace, type Coords } from '../../lib/geo';
import SpaceCard from '../ui/SpaceCard';
import TimeChipSelector from '../ui/TimeChipSelector';
import type { Tab } from '../ui/BottomNav';

const NEEDS = ['Quiet', 'WiFi', 'Plug Sockets', 'Laptop Friendly'];

interface Props {
  onNavigate: (tab: Tab, space?: Space) => void;
  savedIds: Set<string>;
  onSaveToggle: (space: Space) => void;
  onOpenPlanner: () => void;
}

export default function HomeScreen({ onNavigate, savedIds, onSaveToggle, onOpenPlanner }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [needs, setNeeds] = useState<string[]>([]);
  const [duration, setDuration] = useState(2);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    supabase.from('user_profile').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setProfile(data as UserProfile);
    });
  }, []);

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    const result = await getUserLocation();
    let userCoords: Coords = { lat: 51.505, lng: -0.09 }; // London fallback

    if (result.coords) {
      userCoords = result.coords;
      setCoords(result.coords);
    } else {
      setGeoError(result.error);
    }

    // Load from Supabase
    const { data: dbSpaces } = await supabase.from('spaces').select('*');

    // Load from Overpass
    let overpassSpaces: Space[] = [];
    try {
      const nodes = await fetchNearbySpaces(userCoords, 1500);
      overpassSpaces = nodes.slice(0, 20).map(n => overpassToSpace(n, userCoords));
    } catch {
      // Overpass unavailable, use DB only
    }

    const prefs: SessionPrefs = {
      goal: '', noiseLevel: [], needsWifi: needs.includes('WiFi'),
      needsPlugs: needs.includes('Plug Sockets'), needsFood: false,
      maxDistance: 5, durationHours: duration, needs,
    };

    // Merge: Overpass spaces not already in DB (by overpass_id)
    const dbOverpassIds = new Set((dbSpaces ?? []).map((s: Space) => s.overpass_id).filter(Boolean));
    const freshOverpass = overpassSpaces.filter(s => !dbOverpassIds.has(s.overpass_id));

    const allSpaces = [
      ...(dbSpaces ?? []).map((s: Space) => ({ ...s, match_score: computeMatchScore(s, prefs) })),
      ...freshOverpass.map(s => ({ ...s, match_score: computeMatchScore(s, prefs) })),
    ].sort((a: Space, b: Space) => b.match_score - a.match_score);

    setSpaces(allSpaces as Space[]);
    setLoading(false);
  }, [needs, duration]);

  useEffect(() => { loadSpaces(); }, [loadSpaces]);

  const filtered = spaces.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
  });

  function toggleNeed(n: string) {
    setNeeds(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  }

  const prefs: SessionPrefs = {
    goal: '', noiseLevel: [], needsWifi: needs.includes('WiFi'),
    needsPlugs: needs.includes('Plug Sockets'), needsFood: false,
    maxDistance: 5, durationHours: duration, needs,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 pt-14 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white" />
          <div className="absolute -bottom-8 -left-4 w-48 h-48 rounded-full bg-white" />
        </div>
        <div className="relative z-10 flex items-start justify-between mb-3">
          <div>
            <p className="text-white/70 text-sm">Good {getGreeting()}</p>
            <h1 className="text-white font-bold text-2xl">{profile?.name ?? 'there'} 👋</h1>
          </div>
          <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </button>
        </div>
        <p className="text-white/80 text-sm relative z-10">Find your perfect workspace today</p>
      </div>

      {/* Search bar (overlaps header) */}
      <div className="px-5 -mt-12 mb-5 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center gap-3 px-4 py-3">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search cafes, libraries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          <button className="p-1.5 bg-indigo-50 rounded-lg">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
          </button>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* Geo error banner */}
        {geoError && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <span className="text-amber-500 text-lg">📍</span>
            <div className="flex-1">
              <p className="text-amber-800 text-sm font-medium">Location unavailable</p>
              <p className="text-amber-600 text-xs mt-0.5">Showing demo spaces. Enable location for real results.</p>
            </div>
            <button
              onClick={loadSpaces}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold flex-shrink-0 hover:bg-amber-200 transition-colors"
            >
              <LocateFixed className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* What do you need? */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">What do you need?</p>
          <div className="flex flex-wrap gap-2">
            {NEEDS.map(n => (
              <button
                key={n}
                onClick={() => toggleNeed(n)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${needs.includes(n) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* How long? */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">How long do you need?</p>
          <TimeChipSelector value={duration} onChange={setDuration} />
        </div>

        {/* Find spaces CTA */}
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('map')}
            className="flex-1 py-4 bg-indigo-600 text-white font-semibold text-base rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Find Spaces
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenPlanner}
            title="Plan a session: pick a duration and we'll work out when to leave"
            className="px-4 py-4 bg-white border border-indigo-200 text-indigo-600 font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-50 active:scale-95 transition-all flex-shrink-0"
          >
            <Timer className="w-5 h-5" />
          </button>
        </div>

        {/* Nearby spaces */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Nearby Spaces</p>
            <button onClick={() => onNavigate('map')} className="text-indigo-600 text-xs font-semibold flex items-center gap-1">
              See all on map <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.slice(0, 5).map(space => (
                <SpaceCard
                  key={space.id}
                  space={{ ...space, match_score: computeMatchScore(space, prefs) }}
                  onPress={() => onNavigate('home', space)}
                  isSaved={savedIds.has(space.id)}
                  onSaveToggle={() => onSaveToggle(space)}
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No spaces found</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
