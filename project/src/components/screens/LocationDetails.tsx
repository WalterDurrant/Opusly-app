import { useEffect, useState } from 'react';
import { ArrowLeft, Share2, Heart, MapPin, Clock, Navigation, Star, CalendarClock } from 'lucide-react';
import type { Space, Review } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { getSpaceAttributeScores, getBusynessColor, getBusynessDotColor, formatDistance, getMatchColor } from '../../lib/utils';
import { openDirections } from '../../lib/geo';
import MetricRow from '../ui/MetricRow';
import type { Tab } from '../ui/BottomNav';

const TYPE_ICONS: Record<string, string> = { cafe: '☕', library: '📚', coworking: '💼', park: '🌿', restaurant: '🍽️' };
const ATTRS = ['Noise Level', 'WiFi Quality', 'Plug Sockets', 'Seating Availability', 'Laptop Friendly', 'Food Options', 'Closeness', 'Accessibility'];

interface Props {
  space: Space;
  onBack: () => void;
  onNavigate: (tab: Tab, space?: Space) => void;
  isSaved: boolean;
  onSaveToggle: () => void;
}

export default function LocationDetails({ space, onBack, onNavigate, isSaved, onSaveToggle }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [scores] = useState(getSpaceAttributeScores(space));

  useEffect(() => {
    supabase.from('reviews').select('*').eq('space_id', space.id).order('created_at', { ascending: false }).limit(3).then(({ data }) => {
      if (data) setReviews(data as Review[]);
    });
  }, [space.id]);

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : space.rating;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Hero */}
      <div className="relative">
        <div className={`h-56 overflow-hidden ${!space.photo_url ? 'bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center' : ''}`}>
          {space.photo_url ? (
            <img src={space.photo_url} alt={space.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-8xl opacity-60">{TYPE_ICONS[space.type]}</span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>

        {/* Topbar */}
        <div className="absolute top-12 left-0 right-0 flex items-center justify-between px-5">
          <button onClick={onBack} className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex gap-2">
            <button className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Share2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={onSaveToggle} className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Heart className={`w-4 h-4 ${isSaved ? 'text-red-400 fill-red-400' : 'text-white'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content card */}
      <div className="-mt-6 relative z-10">
        <div className="bg-gray-50 rounded-t-3xl px-5 pt-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{TYPE_ICONS[space.type]}</span>
                <span className="text-gray-400 text-xs capitalize">{space.type}</span>
              </div>
              <h1 className="text-gray-900 font-bold text-2xl leading-tight">{space.name}</h1>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-bold flex-shrink-0 mt-1 ${getMatchColor(space.match_score)}`}>
              {space.match_score}% match
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span>{space.address}</span>
            </div>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500 text-sm">{formatDistance(space.distance_miles)}</span>
            <span className="text-gray-300">·</span>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <Clock className="w-3.5 h-3.5" />
              <span>Open till {space.open_until}</span>
            </div>
          </div>

          {/* Rating + busyness row */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${getBusynessColor(space.busyness)}`}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: getBusynessDotColor(space.busyness) }} />
              {space.busyness.charAt(0).toUpperCase() + space.busyness.slice(1)} now
            </div>
            {avgRating > 0 && (
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-gray-700 font-semibold text-sm">{avgRating.toFixed(1)}</span>
                <span className="text-gray-400 text-xs">({reviews.length || space.review_count} reviews)</span>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="bg-white rounded-2xl border border-gray-100 px-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-4 pb-2">How it rates</p>
            {ATTRS.map(attr => (
              <MetricRow key={attr} label={attr} score={scores[attr] ?? 3} />
            ))}
            <div className="pb-2" />
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-4 pb-3">Community reviews</p>
              {reviews.map(r => (
                <div key={r.id} className="pb-4 border-b border-gray-50 last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-gray-800 font-medium text-sm">{r.author_name}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
        <div className="max-w-sm mx-auto flex gap-2">
          {space.lat && space.lng && (
            <button
              onClick={() => openDirections({ lat: space.lat!, lng: space.lng! }, space.name)}
              className="flex items-center gap-2 px-3.5 py-3.5 border border-indigo-200 text-indigo-600 font-semibold text-sm rounded-2xl hover:bg-indigo-50 transition-colors flex-shrink-0"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onPlanSession(space)}
            className="flex items-center gap-2 px-3.5 py-3.5 border border-indigo-200 text-indigo-600 font-semibold text-sm rounded-2xl hover:bg-indigo-50 transition-colors flex-shrink-0"
          >
            <CalendarClock className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('map', space)}
            className="flex-1 py-3.5 bg-indigo-600 text-white font-semibold text-sm rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Start Study Session
          </button>
        </div>
      </div>
    </div>
  );
}
