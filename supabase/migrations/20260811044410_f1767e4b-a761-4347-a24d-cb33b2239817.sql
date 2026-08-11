-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  college TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  green_points INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reference TEXT NOT NULL DEFAULT ('GP-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random()*99999))::text, 5, '0')),
  category TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  image_path TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  water_saved_litres NUMERIC NOT NULL DEFAULT 0,
  co2_saved_kg NUMERIC NOT NULL DEFAULT 0,
  energy_saved_kwh NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports" ON public.reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX reports_user_idx ON public.reports (user_id, created_at DESC);

-- ai_analysis
CREATE TABLE public.ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  detected_issue TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 90,
  severity TEXT NOT NULL DEFAULT 'medium',
  environmental_impact TEXT NOT NULL DEFAULT 'medium',
  estimated_water_loss TEXT,
  estimated_energy_loss TEXT,
  suggested_action TEXT NOT NULL DEFAULT '',
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis TO authenticated;
GRANT ALL ON public.ai_analysis TO service_role;
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analysis" ON public.ai_analysis FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🌱',
  description TEXT NOT NULL DEFAULT '',
  points_required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges readable" ON public.badges FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_code)
);
GRANT SELECT, INSERT, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own badges" ON public.user_badges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- learning articles
CREATE TABLE public.learning_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  reading_minutes INTEGER NOT NULL DEFAULT 3,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_articles TO authenticated;
GRANT ALL ON public.learning_articles TO service_role;
ALTER TABLE public.learning_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles readable" ON public.learning_articles FOR SELECT TO authenticated USING (true);

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- sustainability scores
CREATE TABLE public.sustainability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus TEXT NOT NULL DEFAULT 'Campus',
  score INTEGER NOT NULL DEFAULT 0,
  recorded_for DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sustainability_scores TO authenticated;
GRANT ALL ON public.sustainability_scores TO service_role;
ALTER TABLE public.sustainability_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores readable" ON public.sustainability_scores FOR SELECT TO authenticated USING (true);

-- activity logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.activity_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER reports_updated BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, college, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'college', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- seed badges
INSERT INTO public.badges (code, name, emoji, description, points_required, sort_order) VALUES
 ('green_starter', 'Green Starter', '🌱', 'Submit your first sustainability report', 10, 1),
 ('eco_warrior', 'Eco Warrior', '♻️', 'Report 5 issues around campus', 100, 2),
 ('water_saver', 'Water Saver', '💧', 'Report a water leakage issue', 150, 3),
 ('energy_guardian', 'Energy Guardian', '⚡', 'Report an energy wastage issue', 250, 4),
 ('sustainability_hero', 'Sustainability Hero', '🌍', 'Reach 500 green points', 500, 5),
 ('campus_champion', 'Campus Champion', '🏆', 'Reach 1000 green points', 1000, 6);

-- seed learning articles
INSERT INTO public.learning_articles (title, category, reading_minutes, excerpt, content) VALUES
 ('10 Ways Students Can Save Water on Campus', 'Water Conservation', 4, 'Small daily habits that add up to thousands of litres saved every semester.', 'Turn off taps tightly, report leaks within a day, use refill stations, run full laundry loads, and take shorter showers. A single dripping tap wastes up to 20 litres a day — reporting it is the highest-leverage action a student can take.'),
 ('Waste Segregation: A Complete Guide', 'Recycling', 6, 'Wet, dry and hazardous — how to sort waste correctly the first time.', 'Wet waste goes to composting, dry waste to recycling, and e-waste or batteries to designated collection points. Correct segregation at source can raise campus recycling rates by more than 40%.'),
 ('Solar on Campus: How Renewables Work', 'Renewable Energy', 5, 'A friendly primer on rooftop solar, storage and net metering.', 'Rooftop panels convert sunlight into DC power, an inverter turns it into AC for buildings, and net metering exports the surplus back to the grid. Campuses are ideal because peak demand overlaps with peak sunlight.'),
 ('Climate Change, Explained for Students', 'Climate Change', 7, 'The science, the stakes and the levers students actually control.', 'Greenhouse gases trap heat, warming the planet and destabilising weather. Student-scale levers include energy use, food waste, transport choices and holding institutions accountable with data.'),
 ('Greener Commutes: Cycling and Shared Transport', 'Sustainable Transport', 3, 'Cutting commute emissions without cutting convenience.', 'Cycling, walking, shared shuttles and carpooling can reduce a students annual commute emissions by over 60%. Safe cycle parking and lighting are the biggest enablers on most campuses.'),
 ('What Makes a Building Green?', 'Green Buildings', 5, 'Daylight, insulation, water reuse and smart controls.', 'Green buildings use passive design, efficient HVAC, LED lighting, low-flow fixtures and rainwater harvesting. Retrofitting existing blocks is often cheaper per tonne of CO2 avoided than new construction.');

-- seed campus score history
INSERT INTO public.sustainability_scores (campus, score, recorded_for) VALUES
 ('Campus', 61, current_date - 42),
 ('Campus', 65, current_date - 35),
 ('Campus', 68, current_date - 28),
 ('Campus', 71, current_date - 21),
 ('Campus', 74, current_date - 14),
 ('Campus', 76, current_date - 7),
 ('Campus', 79, current_date);