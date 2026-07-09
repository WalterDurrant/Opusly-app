import { useEffect, useState } from 'react';
import { Heart, MapPin } from 'lucide-react';
import type { Space } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { getMatchColor, getBusynessColor, getBusynessDotColor, formatDistance, timeAgo } from '../../lib/utils';
import type { Tab } from '../ui/BottomNav';

type SavedTab = 'All' | 'Favorites' | 'Visited';
const TYPE_ICONS: Record<string, string> = { cafe: '☕', library: '📚', coworking: '💼', park: '🌿', restaurant: '🍽️' };
const TYPE_COLORS: Record<string, string> = { cafe: 'bg-amber-50', library: 'bg-blue-50', coworking: 'bg-violet-50', park: 'bg-green-50', restaurant: 'bg-red-50' };

interface Props {
  onNavigate: (tab: Tab, space?: Space) => void;
  savedIds: Set<string>;
  onSaveToggle: (space: Space) => void;
}

interface SavedRow { id: string; space_id: string; created_at: string; spaces: Space; }
interface CheckinRow { id: string; space_id: string; created_at: string; spaces: Space; }

export default function SavedSpaces({ onNavigate, savedIds, onSaveToggle }: Props) {
  const [tab, setTab] = useState<SavedTab>('All');
  const [saved, setSaved] = useState<Space[]>([]);
  const [visited, setVisited] = useState<{ space: Space; when: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('saved_spaces').select('*, spaces(*)').order('created_at', { ascending: false }),
      supabase.from('checkins').select('*, spaces(*)').order('created_at', { ascending: false }).limit(20),
    ]).then(([savedRes, checkinRes]) => {
      if (savedRes.data) setSaved((savedRes.data as SavedRow[]).filter(r => r.spaces).map(r => r.spaces));
      if (checkinRes.data) setVisited((checkinRes.data as CheckinRow[]).filter(r => r.spaces).map(r => ({ space: r.spaces, when: r.created_at })));
      setLoading(false);
    });
  }, [savedIds]);

  const displayed = tab === 'Visited' ? null : saved;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-0">
        <h1 className="text-xl font-bold text-gray-900 pb-4">Saved</h1>
        <div className="flex border-b border-gray-100">
          {(['All', 'Favorites', 'Visited'] as SavedTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${tab === t ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {t}
              {tab === t && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        )}

        {/* Visited tab */}
        {!loading && tab === 'Visited' && (
          <div className="space-y-3">
            {visited.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="text-gray-600 font-semibold mb-1">No visits yet</p>
                <p className="text-gray-400 text-sm">Check in to spaces to track your history</p>
              </div>
            )}
            {visited.map(({ space, when }, idx) => (
              <button key={idx} onClick={() => onNavigate('saved', space)} className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[space.type] ?? 'bg-gray-100'}`}>
                  <span className="text-2xl">{TYPE_ICONS[space.type]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 font-semibold text-sm truncate">{space.name}</h3>
                  <p className="text-gray-400 text-xs">{space.address}</p>
                  <p className="text-gray-300 text-xs mt-0.5">{timeAgo(when)}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* All / Favorites tabs */}
        {!loading && tab !== 'Visited' && (
          <div className="space-y-3">
            {(displayed ?? []).length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">♡</p>
                <p className="text-gray-600 font-semibold mb-1">No saved spaces yet</p>
                <p className="text-gray-400 text-sm">Tap the heart icon on any space to save it</p>
                <button onClick={() => onNavigate('map')} className="mt-4 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-colors">
                  Explore the map
                </button>
              </div>
            )}
            {(displayed ?? []).map(space => (
              <button key={space.id} onClick={() => onNavigate('saved', space)} className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex group hover:shadow-md transition-all">
                {/* Image */}
                <div className={`w-28 h-28 flex-shrink-0 overflow-hidden flex items-center justify-center ${!space.photo_url ? TYPE_COLORS[space.type] ?? 'bg-gray-100' : ''}`}>
                  {space.photo_url ? (
                    <img src={space.photo_url} alt={space.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <span className="text-4xl opacity-50">{TYPE_ICONS[space.type]}</span>
                  )}
                </div>
                <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-gray-900 font-semibold text-sm leading-tight">{space.name}</h3>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${getMatchColor(space.match_score)}`}>
                        {space.match_score}%
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      <span className="truncate">{space.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${getBusynessColor(space.busyness)}`}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getBusynessDotColor(space.busyness) }} />
                      {space.busyness.charAt(0).toUpperCase() + space.busyness.slice(1)}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onSaveToggle(space); }}
                      className="p-1"
                    >
                      <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                    </button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
