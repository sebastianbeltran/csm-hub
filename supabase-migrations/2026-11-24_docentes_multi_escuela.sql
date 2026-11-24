-- Docentes en varias escuelas — 24 nov 2026
-- Las escuelas de una persona = su escuela principal (profiles.school_id)
-- + las escuelas de las materias que tiene asignadas (teacher_subjects).
-- Quien dicta en High y Middle ve todo lo de ambas: materias, eventos, eventos del horario,
-- planes del grado, avisos. Las funciones de admin siguen siendo de su escuela principal.
-- Ejecutar TODO de una vez: pbcopy < este archivo, Cmd+V en el SQL Editor vacío, Run.

-- 1. Escuelas de un usuario y del usuario actual
CREATE OR REPLACE FUNCTION public.user_school_ids(p_user UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS '
  SELECT school_id FROM public.profiles WHERE id = p_user AND school_id IS NOT NULL
  UNION
  SELECT s.school_id FROM public.teacher_subjects ts JOIN public.subjects s ON s.id = ts.subject_id
   WHERE ts.teacher_id = p_user AND s.school_id IS NOT NULL
';

CREATE OR REPLACE FUNCTION public.get_my_school_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS 'SELECT public.user_school_ids(auth.uid())';

REVOKE ALL ON FUNCTION public.user_school_ids(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_school_ids(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_school_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_school_ids() TO authenticated;

-- 2. Lectura: materias, eventos y eventos del horario de todas mis escuelas
DROP POLICY IF EXISTS "subjects_select_authenticated" ON subjects;
CREATE POLICY "subjects_select_authenticated"
  ON subjects FOR SELECT
  USING (auth.uid() IS NOT NULL AND school_id IN (SELECT public.get_my_school_ids()));

DROP POLICY IF EXISTS "events_select_authenticated" ON events;
CREATE POLICY "events_select_authenticated"
  ON events FOR SELECT
  USING (auth.uid() IS NOT NULL AND (school_id IS NULL OR school_id IN (SELECT public.get_my_school_ids())));

DROP POLICY IF EXISTS "schedule_events_select" ON schedule_events;
CREATE POLICY "schedule_events_select"
  ON schedule_events FOR SELECT
  USING (auth.uid() IS NOT NULL AND school_id IN (SELECT public.get_my_school_ids()));

-- 3. Planes: guardar en cualquiera de mis escuelas; leer los del grado en mis escuelas
DROP POLICY IF EXISTS "plans_insert_own" ON plans;
CREATE POLICY "plans_insert_own"
  ON plans FOR INSERT
  WITH CHECK (teacher_id = auth.uid() AND school_id IN (SELECT public.get_my_school_ids()));

DROP POLICY IF EXISTS "plans_select_same_grade" ON plans;
CREATE POLICY "plans_select_same_grade"
  ON plans FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND school_id IN (SELECT public.get_my_school_ids())
    AND grade IN (SELECT public.get_my_grades())
  );

CREATE OR REPLACE FUNCTION public.get_screen_usage(p_school UUID, p_grade TEXT, p_week TEXT)
RETURNS TABLE (subject_id TEXT, teacher_id UUID, minutes INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER
AS 'SELECT p.subject_id, p.teacher_id, p.screen_minutes FROM public.plans p WHERE p.school_id = p_school AND (p_school IN (SELECT public.get_my_school_ids()) OR public.is_super_admin()) AND p.grade = p_grade AND p.week_start = p_week AND p.screen_minutes > 0';

-- 4. Admin: ve a los docentes de su escuela, incluidos los que tienen otra escuela principal
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (public.is_admin() AND public.get_my_school_id() IN (SELECT public.user_school_ids(profiles.id)));

DROP POLICY IF EXISTS "teacher_subjects_select_admin" ON teacher_subjects;
CREATE POLICY "teacher_subjects_select_admin"
  ON teacher_subjects FOR SELECT
  USING (public.is_admin() AND public.get_my_school_id() IN (SELECT public.user_school_ids(teacher_subjects.teacher_id)));

-- El admin asigna solo materias de su escuela (a cualquier docente que vea)
DROP POLICY IF EXISTS "teacher_subjects_write_admin" ON teacher_subjects;
CREATE POLICY "teacher_subjects_write_admin"
  ON teacher_subjects FOR ALL
  USING (
    public.is_super_admin() OR (public.is_admin() AND EXISTS (
      SELECT 1 FROM public.subjects s WHERE s.id = teacher_subjects.subject_id AND s.school_id = public.get_my_school_id()))
  )
  WITH CHECK (
    public.is_super_admin() OR (public.is_admin() AND EXISTS (
      SELECT 1 FROM public.subjects s WHERE s.id = teacher_subjects.subject_id AND s.school_id = public.get_my_school_id()))
  );

-- 5. Guardar usuario: las materias se reemplazan SOLO en la escuela que se está editando (p_scope).
--    Rol, escuela principal y estado solo los cambia el admin de la escuela principal (o super_admin).
DROP FUNCTION IF EXISTS public.admin_save_user(UUID, TEXT, TEXT, UUID, BOOLEAN, TEXT[]);

CREATE OR REPLACE FUNCTION public.admin_save_user(
  p_user UUID, p_full_name TEXT, p_role TEXT, p_school UUID, p_active BOOLEAN, p_subjects TEXT[], p_scope UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS '
DECLARE
  is_super  BOOLEAN := COALESCE(public.is_super_admin(), FALSE);
  my_school UUID    := public.get_my_school_id();
  owns      BOOLEAN := TRUE;
  target    public.profiles%ROWTYPE;
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION ''PERMISO: solo un admin puede gestionar usuarios'';
  END IF;
  IF p_scope IS NULL THEN
    RAISE EXCEPTION ''Falta la escuela de las materias'';
  END IF;
  SELECT * INTO target FROM public.profiles WHERE id = p_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION ''El usuario no existe'';
  END IF;
  IF NOT is_super THEN
    IF p_user = auth.uid() THEN
      RAISE EXCEPTION ''PERMISO: no puedes editar tu propia cuenta'';
    END IF;
    IF target.role = ''super_admin'' THEN
      RAISE EXCEPTION ''PERMISO: no puedes editar a un super_admin'';
    END IF;
    IF p_scope IS DISTINCT FROM my_school THEN
      RAISE EXCEPTION ''PERMISO: solo puedes asignar materias de tu escuela'';
    END IF;
    owns := target.school_id IS NULL OR target.school_id = my_school;
    IF NOT owns AND NOT (my_school IN (SELECT public.user_school_ids(p_user))) THEN
      RAISE EXCEPTION ''PERMISO: el usuario pertenece a otra escuela'';
    END IF;
    IF owns AND p_school IS DISTINCT FROM my_school THEN
      RAISE EXCEPTION ''PERMISO: solo puedes asignar usuarios a tu escuela'';
    END IF;
  END IF;
  IF owns THEN
    IF p_role NOT IN (''docente'', ''director'', ''counselor'', ''admin'')
       AND NOT (is_super AND p_role = ''super_admin'') THEN
      RAISE EXCEPTION ''Rol no valido: %'', p_role;
    END IF;
    IF p_school IS NULL AND COALESCE(p_active, FALSE) THEN
      RAISE EXCEPTION ''Asigna una escuela antes de activar la cuenta'';
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_subjects, ARRAY[]::TEXT[])) AS sid
    WHERE NOT EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = sid AND s.school_id = p_scope)
  ) THEN
    RAISE EXCEPTION ''Hay materias que no son de esta escuela'';
  END IF;
  IF owns THEN
    UPDATE public.profiles
       SET full_name = CASE WHEN length(trim(COALESCE(p_full_name, ''x''))) = 0 THEN NULL ELSE trim(p_full_name) END,
           role = p_role, school_id = p_school, active = COALESCE(p_active, FALSE)
     WHERE id = p_user;
  END IF;
  DELETE FROM public.teacher_subjects ts
   USING public.subjects s
   WHERE s.id = ts.subject_id AND ts.teacher_id = p_user AND s.school_id = p_scope;
  INSERT INTO public.teacher_subjects (teacher_id, subject_id)
    SELECT p_user, sid FROM unnest(COALESCE(p_subjects, ARRAY[]::TEXT[])) AS sid
    ON CONFLICT DO NOTHING;
END;
';

REVOKE ALL ON FUNCTION public.admin_save_user(UUID, TEXT, TEXT, UUID, BOOLEAN, TEXT[], UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_user(UUID, TEXT, TEXT, UUID, BOOLEAN, TEXT[], UUID) TO authenticated;

-- 6. Avisos: un evento del horario de Middle para 7A llega al docente aunque su horario
--    esté guardado en High; "toda la escuela" incluye a quienes dictan ahí.
CREATE OR REPLACE FUNCTION public.teachers_for_courses(p_school UUID, p_courses TEXT[])
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS '
  SELECT p.id FROM public.profiles p
   WHERE COALESCE(cardinality(p_courses), 0) = 0
     AND p_school IN (SELECT public.user_school_ids(p.id))
  UNION
  SELECT DISTINCT ts.teacher_id
    FROM public.teacher_schedules ts,
         jsonb_each(ts.schedule) AS d(day_key, slots),
         jsonb_each(d.slots)      AS c(slot_key, cell)
   WHERE COALESCE(cardinality(p_courses), 0) > 0
     AND jsonb_typeof(d.slots) = ''object''
     AND c.cell->>''course'' = ANY(p_courses)
';

-- Verificación: las 4 columnas deben salir en true
SELECT
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_school_ids') AS escuelas,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_save_user' AND pronargs = 7) AS guardar_usuario,
  NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_save_user' AND pronargs = 6) AS sin_version_vieja,
  EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'plans_insert_own'
          AND with_check LIKE '%get_my_school_ids%') AS planes;
