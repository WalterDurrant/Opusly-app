import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SpaceType = 'cafe' | 'library' | 'coworking' | 'park' | 'restaurant';
export type NoiseLevel = 'silent' | 'quiet' | 'moderate' | 'loud';
export type WifiReliability = 'none' | 'weak' | 'moderate' | 'strong';
export type BusynessLevel = 'empty' | 'quiet' | 'moderate' | 'busy' | 'full';

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  address: string;
  distance_miles: number;
  open_until: string;
  noise_level: NoiseLevel;
  seat_count: number;
  seats_free: number;
  wifi_reliability: WifiReliability;
  busyness: BusynessLevel;
  has_plugs: boolean;
  has_food: boolean;
  allows_laptops: boolean;
  is_accessible: boolean;
  match_score: number;
  lat: number | null;
  lng: number | null;
  last_updated_ago: string;
  checkin_count: number;
  photo_url: string | null;
  google_place_id: string | null;
  rating: number;
  review_count: number;
  overpass_id: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  space_id: string;
  author_name: string;
  rating: number;
  comment: string;
  attribute_scores: Record<string, number>;
  created_at: string;
}

export interface Checkin {
  id: string;
  space_id: string;
  session_goal: string | null;
  duration_hours: number | null;
  created_at: string;
}

export interface FeedPost {
  id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  space_id: string | null;
  busyness_tag: BusynessLevel | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  space?: Space;
}

export interface SavedSpace {
  id: string;
  space_id: string;
  created_at: string;
  space?: Space;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  study_preferences: string[];
  workspace_needs: string[];
  food_preferences: string[];
  accessibility_requirements: string[];
  typical_session_length: string;
  preferred_travel_time: string;
  next_commitment_title: string | null;
  next_commitment_time: string | null;
}

export interface SessionPrefs {
  goal: string;
  noiseLevel: NoiseLevel[];
  needsWifi: boolean;
  needsPlugs: boolean;
  needsFood: boolean;
  maxDistance: number;
  durationHours: number;
  needs: string[];
}
