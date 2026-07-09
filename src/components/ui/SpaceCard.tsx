import { Heart, MapPin, Wifi } from 'lucide-react';
import type { Space } from '../../lib/supabase';
import { getMatchColor, getBusynessDotColor, getBusynessColor, formatDistance } from '../../lib/utils';

const TYPE_ICONS: Record<string, string> = { cafe: '☕', library: '📚', coworking: '💼', park: '🌿', restaurant: '🍽️' };
const TYPE_COLORS: Record<string, string> = { cafe: 'bg-amber-50', library: 'bg-blue-50', coworking: 'bg-violet-50', park: 'bg-green-50', restaurant: 'bg-red-50' };

interface Props {
  space: Space;
  onPress: () => void;
  isSaved?: boolean;
  onSaveToggle?: () => void;
  compact?: boolean;
}

export default function SpaceCard({ space, onPress, isSaved = false, onSaveToggle, compact = false }: Props) {
  return (
    <button
      onClick={onPress}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden group"
    >
      {/* Photo / color band */}
      <div className={`relative ${compact ? 'h-28' : 'h-36'} overflow-hidden ${!space.photo_url ? TYPE_COLORS[space.type] ?? 'bg-gray-100' : ''}`}>
        {space.photo_url ? (
          <img src={space.photo_url} alt={space.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-60">{TYPE_ICONS[space.type]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

        {/* Match badge */}
        <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-xs font-bold ${getMatchColor(space.match_score)}`}>
          {space.match_score}% match
        </div>

        {/* Save button */}
        {onSaveToggle && (
          <button
            onClick={e => { e.stopPropagation(); onSaveToggle(); }}
            className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
          </button>
        )}

        {/* Busyness chip */}
        <div className={`absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${getBusynessColor(space.busyness)}`}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: getBusynessDotColor(space.busyness) }} />
          {space.busyness.charAt(0).toUpperCase() + space.busyness.slice(1)}
        </div>
      </div>

      {/* Info */}
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-gray-900 font-semibold text-sm leading-tight">{space.name}</h3>
          <span className="text-sm flex-shrink-0">{TYPE_ICONS[space.type]}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{space.address}</span>
          <span className="flex-shrink-0">· {formatDistance(space.distance_miles)}</span>
        </div>
        {!compact && (
          <div className="flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              {space.wifi_reliability === 'strong' ? 'Fast' : space.wifi_reliability === 'moderate' ? 'OK' : 'Slow'} wifi
            </span>
            <span>· Open till {space.open_until}</span>
          </div>
        )}
      </div>
    </button>
  );
}
