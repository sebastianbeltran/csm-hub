-- ================================================
-- CSM Hub Docente — Schema completo (staging)
-- Pegar completo en Supabase SQL Editor → Run
-- ================================================


-- ------------------------------------------------
-- 1. TABLA SCHOOLS
-- ------------------------------------------------
CREATE TABLE schools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------
-- 2. TABLA PROFILES (extiende auth.users)
-- ------------------------------------------------
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  email      TEXT,
  role       TEXT NOT NULL DEFAULT 'docente'
               CHECK (role IN ('super_admin','admin','coordinador','counselor','docente')),
  school_id  UUID REFERENCES schools(id),
  active     BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------
-- 3. TABLA EVENTS
-- ------------------------------------------------
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  date        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'academico',
  priority    TEXT NOT NULL DEFAULT 'medium',
  school_id   UUID REFERENCES schools(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------
-- 4. TABLA SUBJECTS
-- ------------------------------------------------
CREATE TABLE subjects (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  grade      TEXT NOT NULL,
  school_id  UUID REFERENCES schools(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------
-- 5. TABLA PLANS
-- ------------------------------------------------
CREATE TABLE plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id          UUID REFERENCES schools(id),
  subject_id         TEXT REFERENCES subjects(id),
  week_start         TEXT NOT NULL,
  grade              TEXT NOT NULL,
  comp_transversales TEXT[] DEFAULT '{}',
  comp_area          TEXT DEFAULT '',
  conexion_proyecto  TEXT DEFAULT '',
  evaluacion         JSONB DEFAULT '[]',
  diferenciacion     TEXT DEFAULT '',
  diversidad         TEXT DEFAULT '',
  actividades        TEXT DEFAULT '',
  observaciones      TEXT DEFAULT '',
  saved_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------
-- 6. TABLA COUNSELING_SESSIONS
-- ------------------------------------------------
CREATE TABLE counseling_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  grade        TEXT NOT NULL,
  session_date TEXT NOT NULL,
  session_time TEXT NOT NULL,
  attended     BOOLEAN,
  notes        TEXT,
  school_id    UUID REFERENCES schools(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------
-- 7. TABLA VIGILANCIAS_CONFIG
-- ------------------------------------------------
CREATE TABLE vigilancias_config (
  id         TEXT PRIMARY KEY,
  data       JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------
-- 8. TABLA TEACHER_SUBJECTS (junction)
-- ------------------------------------------------
CREATE TABLE teacher_subjects (
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id)   ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);


-- ================================================
-- FUNCIONES AUXILIARES PARA RLS
-- ================================================

CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.get_my_role() IN ('admin', 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.get_my_role() = 'super_admin'
$$;

CREATE OR REPLACE FUNCTION public.is_coordinator_or_above()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.get_my_role() IN ('coordinador', 'admin', 'super_admin')
$$;


-- ================================================
-- RLS — SCHOOLS
-- ================================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schools_select_authenticated"
  ON schools FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "schools_all_super_admin"
  ON schools FOR ALL
  USING (public.is_super_admin());


-- ================================================
-- RLS — PROFILES
-- ================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (public.is_admin() AND school_id = public.get_my_school_id());

CREATE POLICY "profiles_select_super_admin"
  ON profiles FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (public.is_admin() AND school_id = public.get_my_school_id());

-- INSERT lo maneja el trigger con SECURITY DEFINER (bypasea RLS)


-- ================================================
-- RLS — EVENTS
-- ================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_authenticated"
  ON events FOR SELECT
  USING (auth.uid() IS NOT NULL
    AND (school_id IS NULL OR school_id = public.get_my_school_id()));

CREATE POLICY "events_insert_admin"
  ON events FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "events_update_admin"
  ON events FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "events_delete_admin"
  ON events FOR DELETE
  USING (public.is_admin());


-- ================================================
-- RLS — SUBJECTS
-- ================================================
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_select_authenticated"
  ON subjects FOR SELECT
  USING (auth.uid() IS NOT NULL AND school_id = public.get_my_school_id());

CREATE POLICY "subjects_insert_admin"
  ON subjects FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "subjects_update_admin"
  ON subjects FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "subjects_delete_admin"
  ON subjects FOR DELETE
  USING (public.is_admin());


-- ================================================
-- RLS — PLANS
-- ================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_own"
  ON plans FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "plans_insert_own"
  ON plans FOR INSERT
  WITH CHECK (teacher_id = auth.uid() AND school_id = public.get_my_school_id());

CREATE POLICY "plans_update_own"
  ON plans FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "plans_delete_own"
  ON plans FOR DELETE
  USING (teacher_id = auth.uid());

CREATE POLICY "plans_select_coordinator"
  ON plans FOR SELECT
  USING (public.is_coordinator_or_above() AND school_id = public.get_my_school_id());

CREATE POLICY "plans_all_super_admin"
  ON plans FOR ALL
  USING (public.is_super_admin());


-- ================================================
-- RLS — COUNSELING_SESSIONS
-- ================================================
ALTER TABLE counseling_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "counseling_select_staff"
  ON counseling_sessions FOR SELECT
  USING (auth.uid() IS NOT NULL
    AND school_id = public.get_my_school_id()
    AND public.get_my_role() IN ('counselor','admin','super_admin','coordinador'));

CREATE POLICY "counseling_insert_counselor"
  ON counseling_sessions FOR INSERT
  WITH CHECK (school_id = public.get_my_school_id()
    AND public.get_my_role() IN ('counselor','admin','super_admin'));

CREATE POLICY "counseling_update_counselor"
  ON counseling_sessions FOR UPDATE
  USING (school_id = public.get_my_school_id()
    AND public.get_my_role() IN ('counselor','admin','super_admin'));

CREATE POLICY "counseling_delete_counselor"
  ON counseling_sessions FOR DELETE
  USING (school_id = public.get_my_school_id()
    AND public.get_my_role() IN ('counselor','admin','super_admin'));


-- ================================================
-- RLS — VIGILANCIAS_CONFIG
-- ================================================
ALTER TABLE vigilancias_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vigilancias_select_authenticated"
  ON vigilancias_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "vigilancias_insert_admin"
  ON vigilancias_config FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "vigilancias_update_admin"
  ON vigilancias_config FOR UPDATE
  USING (public.is_admin());


-- ================================================
-- RLS — TEACHER_SUBJECTS
-- ================================================
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_subjects_select_own"
  ON teacher_subjects FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "teacher_subjects_select_admin"
  ON teacher_subjects FOR SELECT
  USING (public.is_admin() AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = teacher_subjects.teacher_id
      AND p.school_id = public.get_my_school_id()
  ));

CREATE POLICY "teacher_subjects_write_admin"
  ON teacher_subjects FOR ALL
  USING (public.is_admin());


-- ================================================
-- TRIGGER — Auto-creación de perfil al primer login con Google
-- Nota: la restricción de dominio @csm.edu.co va SOLO en producción
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'docente',
    FALSE
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ================================================
-- ÍNDICES
-- ================================================
CREATE INDEX idx_plans_teacher_id       ON plans(teacher_id);
CREATE INDEX idx_plans_school_week      ON plans(school_id, week_start);
CREATE INDEX idx_events_school_date     ON events(school_id, date);
CREATE INDEX idx_profiles_school        ON profiles(school_id);
CREATE INDEX idx_subjects_school_grade  ON subjects(school_id, grade);
CREATE INDEX idx_counseling_school_date ON counseling_sessions(school_id, session_date);
CREATE INDEX idx_teacher_subjects_tid   ON teacher_subjects(teacher_id);


-- ================================================
-- DATOS SEMILLA — ESCUELA
-- ================================================
INSERT INTO schools (name, slug) VALUES
  ('High School', 'high_school');
