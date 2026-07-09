import type { Space, SessionPrefs, BusynessLevel, NoiseLevel } from './supabase';

export function computeMatchScore(space: Space, prefs: SessionPrefs): number {
  let score = 100;
  if (prefs.noiseLevel.length > 0 && !prefs.noiseLevel.includes(space.noise_level as NoiseLevel)) score -= 25;
  if (prefs.needsWifi && (space.wifi_reliability === 'none' || space.wifi_reliability === 'weak')) score -= 20;
  if (prefs.needsPlugs && !space.has_plugs) score -= 15;
  if (prefs.needsFood && !space.has_food) score -= 10;
  if (space.distance_miles > prefs.maxDistance) score -= Math.min(20, (space.distance_miles - prefs.maxDistance) * 10);
  if (space.busyness === 'full') score -= 30;
  else if (space.busyness === 'busy') score -= 10;
  // needs chips
  if (prefs.needs.includes('Quiet') && (space.noise_level === 'loud' || space.noise_level === 'moderate')) score -= 15;
  if (prefs.needs.includes('WiFi') && space.wifi_reliability !== 'strong') score -= 10;
  if (prefs.needs.includes('Plug Sockets') && !space.has_plugs) score -= 10;
  if (prefs.needs.includes('Laptop Friendly') && !space.allows_laptops) score -= 10;
  return Math.max(0, Math.round(score));
}

export function simulateBusyness(identifier: string, date?: Date): BusynessLevel {
  const now = date ?? new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;
  const isPeak = isWeekend ? (hour >= 10 && hour <= 14) : ((hour >= 9 && hour <= 11) || (hour >= 13 && hour <= 15));
  const isShoulder = isWeekend ? ((hour >= 8 && hour <= 10) || (hour >= 14 && hour <= 18))
    : ((hour >= 8 && hour <= 9) || (hour >= 11 && hour <= 13) || (hour >= 15 && hour <= 18));
  const h = hashString(identifier);
  const variance = h % 3;
  let base = isPeak ? 3 : isShoulder ? 2 : 1;
  base = Math.max(0, Math.min(4, base + variance - 1));
  return (['empty', 'quiet', 'moderate', 'busy', 'full'] as BusynessLevel[])[base];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getBusynessColor(b: string): string {
  switch (b) {
    case 'empty': case 'quiet': return 'text-emerald-600 bg-emerald-50';
    case 'moderate': return 'text-amber-600 bg-amber-50';
    case 'busy': return 'text-orange-600 bg-orange-50';
    case 'full': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

export function getBusynessDotColor(b: string): string {
  switch (b) {
    case 'empty': case 'quiet': return '#22c55e';
    case 'moderate': return '#f59e0b';
    case 'busy': return '#f97316';
    case 'full': return '#ef4444';
    default: return '#9ca3af';
  }
}

export function getNoiseLevelLabel(l: string): string {
  switch (l) { case 'silent': return 'Silent'; case 'quiet': return 'Quiet'; case 'moderate': return 'Moderate'; case 'loud': return 'Lively'; default: return l; }
}

export function getMatchColor(s: number): string {
  if (s >= 85) return 'bg-emerald-100 text-emerald-700';
  if (s >= 65) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-600';
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) return 'Very close';
  if (miles < 1) return `${Math.round(miles * 10) / 10} mi`;
  return `${miles.toFixed(1)} mi`;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function getAvatarColor(name: string): string {
  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function getSpaceAttributeScores(space: Space): Record<string, number> {
  const noiseMap: Record<string, number> = { silent: 5, quiet: 4, moderate: 3, loud: 1 };
  const wifiMap: Record<string, number> = { strong: 5, moderate: 3, weak: 2, none: 1 };
  const busynessMap: Record<string, number> = { empty: 5, quiet: 4, moderate: 3, busy: 2, full: 1 };
  return {
    'Noise Level': noiseMap[space.noise_level] ?? 3,
    'WiFi Quality': wifiMap[space.wifi_reliability] ?? 3,
    'Plug Sockets': space.has_plugs ? 4 : 1,
    'Seating Availability': busynessMap[space.busyness] ?? 3,
    'Laptop Friendly': space.allows_laptops ? 5 : 1,
    'Food Options': space.has_food ? 4 : 2,
    'Closeness': space.distance_miles <= 0.5 ? 5 : space.distance_miles <= 1 ? 4 : space.distance_miles <= 2 ? 3 : 2,
    'Accessibility': space.is_accessible ? 5 : 2,
  };
}
