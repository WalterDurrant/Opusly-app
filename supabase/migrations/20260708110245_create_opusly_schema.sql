/*
# Create Opusly Schema

1. New Tables
   - `spaces` - Work/study locations with attributes like noise level, wifi, seats, busyness
   - `reviews` - User-submitted reviews for spaces
   - `checkins` - User check-ins to track real-time busyness

2. Security
   - Enable RLS on all tables
   - Allow anon + authenticated access (no sign-in required for this prototype)

3. Seed Data
   - Insert sample spaces to populate the app on first load
*/

CREATE TABLE IF NOT EXISTS spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('cafe', 'library', 'coworking', 'park', 'restaurant')),
  address text NOT NULL,
  distance_miles numeric(4,2) NOT NULL DEFAULT 0.5,
  open_until text NOT NULL,
  noise_level text NOT NULL CHECK (noise_level IN ('silent', 'quiet', 'moderate', 'loud')),
  seat_count int NOT NULL DEFAULT 10,
  seats_free int NOT NULL DEFAULT 5,
  wifi_reliability text NOT NULL CHECK (wifi_reliability IN ('none', 'weak', 'moderate', 'strong')),
  busyness text NOT NULL CHECK (busyness IN ('empty', 'quiet', 'moderate', 'busy', 'full')),
  has_plugs boolean NOT NULL DEFAULT true,
  has_food boolean NOT NULL DEFAULT false,
  allows_laptops boolean NOT NULL DEFAULT true,
  is_accessible boolean NOT NULL DEFAULT true,
  match_score int NOT NULL DEFAULT 75,
  lat numeric(9,6),
  lng numeric(9,6),
  last_updated_ago text NOT NULL DEFAULT '5 min ago',
  checkin_count int NOT NULL DEFAULT 0,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Anonymous',
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  session_goal text,
  duration_hours numeric(3,1),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Spaces policies
DROP POLICY IF EXISTS "anon_select_spaces" ON spaces;
CREATE POLICY "anon_select_spaces" ON spaces FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_spaces" ON spaces;
CREATE POLICY "anon_insert_spaces" ON spaces FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_spaces" ON spaces;
CREATE POLICY "anon_update_spaces" ON spaces FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_spaces" ON spaces;
CREATE POLICY "anon_delete_spaces" ON spaces FOR DELETE TO anon, authenticated USING (true);

-- Reviews policies
DROP POLICY IF EXISTS "anon_select_reviews" ON reviews;
CREATE POLICY "anon_select_reviews" ON reviews FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reviews" ON reviews;
CREATE POLICY "anon_insert_reviews" ON reviews FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_reviews" ON reviews;
CREATE POLICY "anon_update_reviews" ON reviews FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_reviews" ON reviews;
CREATE POLICY "anon_delete_reviews" ON reviews FOR DELETE TO anon, authenticated USING (true);

-- Checkins policies
DROP POLICY IF EXISTS "anon_select_checkins" ON checkins;
CREATE POLICY "anon_select_checkins" ON checkins FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_checkins" ON checkins;
CREATE POLICY "anon_insert_checkins" ON checkins FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_checkins" ON checkins;
CREATE POLICY "anon_update_checkins" ON checkins FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_checkins" ON checkins;
CREATE POLICY "anon_delete_checkins" ON checkins FOR DELETE TO anon, authenticated USING (true);

-- Seed sample spaces
INSERT INTO spaces (name, type, address, distance_miles, open_until, noise_level, seat_count, seats_free, wifi_reliability, busyness, has_plugs, has_food, allows_laptops, is_accessible, match_score, lat, lng, last_updated_ago, checkin_count, photo_url)
VALUES
  ('The Reading Room', 'cafe', '14 High Street', 0.4, '8pm', 'quiet', 24, 6, 'strong', 'moderate', true, true, true, true, 92, 51.509865, -0.118092, '4 min ago', 3, 'https://images.pexels.com/photos/1995842/pexels-photo-1995842.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('North Library', 'library', '2 University Road', 0.9, '9pm', 'silent', 60, 18, 'strong', 'quiet', true, false, true, true, 74, 51.512001, -0.115000, '12 min ago', 5, 'https://images.pexels.com/photos/590493/pexels-photo-590493.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Brew & Co', 'cafe', '88 Market Lane', 1.2, '7pm', 'moderate', 16, 3, 'moderate', 'busy', true, true, true, false, 61, 51.507000, -0.120000, '2 min ago', 8, 'https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('The Hub Coworking', 'coworking', '45 Innovation Square', 1.5, '10pm', 'quiet', 40, 12, 'strong', 'moderate', true, false, true, true, 88, 51.514000, -0.116000, '8 min ago', 4, 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Central City Library', 'library', '1 Civic Centre', 0.6, '8:30pm', 'silent', 80, 22, 'strong', 'quiet', true, false, true, true, 85, 51.511000, -0.117000, '6 min ago', 6, 'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Grounds Coffee House', 'cafe', '33 Bloom Street', 0.7, '6pm', 'quiet', 20, 8, 'strong', 'quiet', true, true, true, true, 79, 51.508000, -0.121000, '15 min ago', 2, 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800')
ON CONFLICT DO NOTHING;

-- Seed sample reviews
INSERT INTO reviews (space_id, author_name, rating, comment, created_at)
SELECT s.id, 'Alex T.', 5, 'Great atmosphere for deep work. The background music is just right and WiFi is super reliable.', now() - interval '2 days'
FROM spaces s WHERE s.name = 'The Reading Room'
ON CONFLICT DO NOTHING;

INSERT INTO reviews (space_id, author_name, rating, comment, created_at)
SELECT s.id, 'Jamie L.', 4, 'Very quiet and spacious. Plenty of power outlets. Gets a bit crowded around 2pm though.', now() - interval '5 days'
FROM spaces s WHERE s.name = 'The Reading Room'
ON CONFLICT DO NOTHING;

INSERT INTO reviews (space_id, author_name, rating, comment, created_at)
SELECT s.id, 'Sam P.', 5, 'Best library for studying. Strict quiet policy is enforced. Plenty of desks.', now() - interval '1 day'
FROM spaces s WHERE s.name = 'North Library'
ON CONFLICT DO NOTHING;
