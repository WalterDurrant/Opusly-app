/*
# Extend Opusly Schema

1. Modified Tables
   - `spaces`: add google_place_id, rating, review_count, overpass_id columns
   - `reviews`: add attribute_scores jsonb column for per-attribute star ratings

2. New Tables
   - `feed_posts`: community posts with busyness tags and likes
   - `saved_spaces`: bookmarked spaces (unique per space_id)
   - `user_profile`: singleton row (id=1) storing user preferences

3. Security
   - RLS enabled on all new tables
   - anon + authenticated can read/write (no auth required)

4. Seed Data
   - One user_profile row inserted
   - Three sample feed_posts inserted
*/

-- Extend spaces table
ALTER TABLE spaces
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS review_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overpass_id text;

-- Extend reviews table with per-attribute scores
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS attribute_scores jsonb DEFAULT '{}';

-- New: feed_posts
CREATE TABLE IF NOT EXISTS feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL DEFAULT 'Anonymous',
  author_avatar text,
  content text NOT NULL,
  space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  busyness_tag text CHECK (busyness_tag IN ('empty','quiet','moderate','busy','full')),
  likes_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- New: saved_spaces
CREATE TABLE IF NOT EXISTS saved_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(space_id)
);

-- New: user_profile (singleton)
CREATE TABLE IF NOT EXISTS user_profile (
  id int PRIMARY KEY DEFAULT 1,
  name text NOT NULL DEFAULT 'Alex',
  email text NOT NULL DEFAULT 'alex@example.com',
  study_preferences text[] DEFAULT '{}',
  workspace_needs text[] DEFAULT '{}',
  food_preferences text[] DEFAULT '{}',
  accessibility_requirements text[] DEFAULT '{}',
  typical_session_length text DEFAULT '2 hours',
  preferred_travel_time text DEFAULT '15 minutes'
);

-- RLS
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_feed" ON feed_posts;
CREATE POLICY "anon_select_feed" ON feed_posts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_feed" ON feed_posts;
CREATE POLICY "anon_insert_feed" ON feed_posts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_feed" ON feed_posts;
CREATE POLICY "anon_update_feed" ON feed_posts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_feed" ON feed_posts;
CREATE POLICY "anon_delete_feed" ON feed_posts FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_saved" ON saved_spaces;
CREATE POLICY "anon_select_saved" ON saved_spaces FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_saved" ON saved_spaces;
CREATE POLICY "anon_insert_saved" ON saved_spaces FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_saved" ON saved_spaces;
CREATE POLICY "anon_delete_saved" ON saved_spaces FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_profile" ON user_profile;
CREATE POLICY "anon_select_profile" ON user_profile FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_update_profile" ON user_profile;
CREATE POLICY "anon_update_profile" ON user_profile FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_insert_profile" ON user_profile;
CREATE POLICY "anon_insert_profile" ON user_profile FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Seed profile singleton
INSERT INTO user_profile (id, name, email) VALUES (1, 'Alex', 'alex@example.com') ON CONFLICT (id) DO NOTHING;

-- Seed feed posts
INSERT INTO feed_posts (author_name, author_avatar, content, busyness_tag, likes_count, comments_count)
VALUES
  ('Jamie R.', 'JR', 'Central Library is surprisingly quiet today — grabbed a whole table to myself 📚', 'quiet', 14, 3),
  ('Priya K.', 'PK', 'Costa on High St filling up fast, might want to get there early if you need a seat ☕', 'busy', 8, 1),
  ('Marcus T.', 'MT', 'Cowork Hub has fast wifi today, finally got my deploys done in under 5 mins 💻', 'moderate', 22, 5),
  ('Sofia L.', 'SL', 'Found a perfect corner table at The Reading Room — dead quiet and the coffee is great ☕', 'quiet', 31, 7)
ON CONFLICT DO NOTHING;
