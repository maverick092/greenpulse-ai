-- ============ profiles additions ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS reputation integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- ============ levels ============
CREATE TABLE IF NOT EXISTS public.user_levels (
  level integer PRIMARY KEY,
  title text NOT NULL,
  min_points integer NOT NULL
);
GRANT SELECT ON public.user_levels TO authenticated;
GRANT ALL ON public.user_levels TO service_role;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "levels readable" ON public.user_levels FOR SELECT TO authenticated USING (true);

INSERT INTO public.user_levels (level, title, min_points) VALUES
  (1, 'Campus Observer', 0),
  (2, 'Campus Scout', 100),
  (3, 'Eco Warrior', 250),
  (4, 'Campus Guardian', 500),
  (5, 'Sustainability Champion', 1000),
  (6, 'Campus Hero', 2000),
  (7, 'Impact Leader', 3500),
  (8, 'Campus Legend', 5000)
ON CONFLICT (level) DO NOTHING;

-- ============ point rules ============
CREATE TABLE IF NOT EXISTS public.point_rules (
  action text PRIMARY KEY,
  points integer NOT NULL,
  label text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.point_rules TO authenticated;
GRANT ALL ON public.point_rules TO service_role;
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "point rules readable" ON public.point_rules FOR SELECT TO authenticated USING (true);

INSERT INTO public.point_rules (action, points, label) VALUES
  ('report_submitted', 50, 'Valid report'),
  ('report_verified', 100, 'Report verified'),
  ('report_resolved', 150, 'Issue resolved'),
  ('duplicate_confirmed', 25, 'Confirmed existing issue'),
  ('resolution_verified', 30, 'Resolution verification'),
  ('daily_login', 10, 'Daily login'),
  ('article_read', 20, 'Learning article completed'),
  ('streak_reward', 25, 'Streak reward'),
  ('badge_unlocked', 50, 'Badge unlocked'),
  ('report_rejected', -50, 'Rejected report')
ON CONFLICT (action) DO NOTHING;

-- ============ points transactions ============
CREATE TABLE IF NOT EXISTS public.points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  points integer NOT NULL,
  label text NOT NULL DEFAULT '',
  dedupe_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS points_tx_dedupe_key ON public.points_transactions (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS points_tx_user_created ON public.points_transactions (user_id, created_at DESC);
GRANT SELECT ON public.points_transactions TO authenticated;
GRANT ALL ON public.points_transactions TO service_role;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own points history" ON public.points_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ friend requests ============
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_requests_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friend_requests_status_check CHECK (status IN ('pending','accepted','rejected')),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_requests TO authenticated;
GRANT ALL ON public.friend_requests TO service_role;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own requests" ON public.friend_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "send requests" ON public.friend_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');
CREATE POLICY "respond to requests" ON public.friend_requests FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id) WITH CHECK (auth.uid() = addressee_id);
CREATE POLICY "cancel own requests" ON public.friend_requests FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER friend_requests_updated BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ friends ============
CREATE TABLE IF NOT EXISTS public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friends_no_self CHECK (user_id <> friend_id),
  UNIQUE (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS friends_user_idx ON public.friends (user_id);
GRANT SELECT, DELETE ON public.friends TO authenticated;
GRANT ALL ON public.friends TO service_role;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own friends" ON public.friends FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "remove own friends" ON public.friends FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============ secure helpers ============
CREATE OR REPLACE FUNCTION public.level_for_points(_points integer)
RETURNS integer LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(MAX(level), 1) FROM public.user_levels WHERE min_points <= GREATEST(_points, 0);
$$;

CREATE OR REPLACE FUNCTION public.award_points(_action text, _dedupe_key text DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (awarded integer, total integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _rule public.point_rules;
  _pts integer := 0;
  _total integer := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _rule FROM public.point_rules WHERE action = _action;
  IF _rule.action IS NULL THEN RAISE EXCEPTION 'Unknown action %', _action; END IF;

  BEGIN
    INSERT INTO public.points_transactions (user_id, action, points, label, dedupe_key, metadata)
    VALUES (_uid, _action, _rule.points, _rule.label, _dedupe_key, COALESCE(_metadata, '{}'::jsonb));
    _pts := _rule.points;
  EXCEPTION WHEN unique_violation THEN
    _pts := 0;
  END;

  UPDATE public.profiles
     SET green_points = GREATEST(green_points + _pts, 0),
         last_active_at = now()
   WHERE id = _uid
   RETURNING green_points INTO _total;

  RETURN QUERY SELECT _pts, COALESCE(_total, 0);
END; $$;
REVOKE ALL ON FUNCTION public.award_points(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_points(text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_friend_request(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _req public.friend_requests;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _req FROM public.friend_requests WHERE id = _request_id;
  IF _req.id IS NULL OR _req.addressee_id <> _uid THEN RAISE EXCEPTION 'Request not found'; END IF;

  UPDATE public.friend_requests SET status = 'accepted' WHERE id = _request_id;
  INSERT INTO public.friends (user_id, friend_id) VALUES (_req.requester_id, _req.addressee_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.friends (user_id, friend_id) VALUES (_req.addressee_id, _req.requester_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_req.requester_id, 'Friend request accepted',
            (SELECT COALESCE(full_name, 'A student') FROM public.profiles WHERE id = _uid) || ' is now your friend.', 'friend');
END; $$;
REVOKE ALL ON FUNCTION public.accept_friend_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_friend(_other_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.friends
   WHERE (user_id = _uid AND friend_id = _other_id) OR (user_id = _other_id AND friend_id = _uid);
  DELETE FROM public.friend_requests
   WHERE (requester_id = _uid AND addressee_id = _other_id) OR (requester_id = _other_id AND addressee_id = _uid);
END; $$;
REVOKE ALL ON FUNCTION public.remove_friend(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mutual_friends_count(_other_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int
  FROM public.friends a
  JOIN public.friends b ON a.friend_id = b.friend_id
  WHERE a.user_id = auth.uid() AND b.user_id = _other_id;
$$;
REVOKE ALL ON FUNCTION public.mutual_friends_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mutual_friends_count(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_leaderboard(_college text DEFAULT NULL, _since timestamptz DEFAULT NULL, _limit integer DEFAULT 100)
RETURNS TABLE (
  user_id uuid, full_name text, username text, college text, avatar_url text,
  green_points integer, period_points integer, badge_count integer,
  reports_count integer, reputation integer, level integer, rank integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT p.id, p.full_name, p.username, p.college, p.avatar_url, p.green_points, p.reputation,
      COALESCE((SELECT SUM(t.points)::int FROM public.points_transactions t
                 WHERE t.user_id = p.id AND (_since IS NULL OR t.created_at >= _since)), 0) AS period_pts,
      (SELECT COUNT(*)::int FROM public.user_badges b WHERE b.user_id = p.id) AS badges,
      (SELECT COUNT(*)::int FROM public.reports r WHERE r.user_id = p.id) AS reports
    FROM public.profiles p
    WHERE _college IS NULL OR lower(p.college) = lower(_college)
  )
  SELECT id, full_name, username, college, avatar_url, green_points,
    CASE WHEN _since IS NULL THEN green_points ELSE period_pts END,
    badges, reports, reputation, public.level_for_points(green_points),
    ROW_NUMBER() OVER (
      ORDER BY (CASE WHEN _since IS NULL THEN green_points ELSE period_pts END) DESC,
               reputation DESC, badges DESC, full_name ASC
    )::int
  FROM base
  ORDER BY 12
  LIMIT GREATEST(_limit, 1);
$$;
REVOKE ALL ON FUNCTION public.get_leaderboard(text, timestamptz, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, timestamptz, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.profiles; _out jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _p FROM public.profiles WHERE id = _user_id;
  IF _p.id IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'id', _p.id,
    'full_name', _p.full_name,
    'username', _p.username,
    'college', _p.college,
    'avatar_url', _p.avatar_url,
    'green_points', _p.green_points,
    'reputation', _p.reputation,
    'streak_days', _p.streak_days,
    'best_streak', _p.best_streak,
    'last_active_at', _p.last_active_at,
    'level', public.level_for_points(_p.green_points),
    'joined_at', _p.created_at,
    'reports_count', (SELECT COUNT(*)::int FROM public.reports r WHERE r.user_id = _p.id),
    'resolved_count', (SELECT COUNT(*)::int FROM public.reports r WHERE r.user_id = _p.id AND r.status = 'resolved'),
    'water_saved', (SELECT COALESCE(SUM(r.water_saved_litres), 0) FROM public.reports r WHERE r.user_id = _p.id),
    'co2_saved', (SELECT COALESCE(SUM(r.co2_saved_kg), 0) FROM public.reports r WHERE r.user_id = _p.id),
    'energy_saved', (SELECT COALESCE(SUM(r.energy_saved_kwh), 0) FROM public.reports r WHERE r.user_id = _p.id),
    'friend_count', (SELECT COUNT(*)::int FROM public.friends f WHERE f.user_id = _p.id),
    'mutual_friends', public.mutual_friends_count(_p.id),
    'rank', (SELECT COUNT(*)::int + 1 FROM public.profiles o WHERE o.green_points > _p.green_points),
    'badges', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('code', b.code, 'name', b.name, 'emoji', b.emoji,
                                          'description', b.description, 'earned_at', ub.earned_at)
             ORDER BY ub.earned_at DESC)
      FROM public.user_badges ub JOIN public.badges b ON b.code = ub.badge_code
      WHERE ub.user_id = _p.id), '[]'::jsonb)
  ) INTO _out;
  RETURN _out;
END; $$;
REVOKE ALL ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;