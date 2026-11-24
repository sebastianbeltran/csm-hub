-- Gestión de usuarios (Admin → pestaña "Usuarios") — 24 nov 2026
-- Activar docentes, asignarles escuela, rol y materias (teacher_subjects).
-- Ejecutar cada bloque por separado en el SQL Editor (sin $$: el editor falló con ellos).

-- Bloque 1: los admins ven a los usuarios pendientes (recién registrados, sin escuela)
DROP POLICY IF EXISTS "profiles_select_admin_pending" ON profiles;
CREATE POLICY "profiles_select_admin_pending"
  ON profiles FOR SELECT
  USING (public.is_admin() AND school_id IS NULL);

-- Bloque 2: el super_admin ve las materias asignadas de todas las escuelas ("Ver como")
DROP POLICY IF EXISTS "teacher_subjects_select_super_admin" ON teacher_subjects;
CREATE POLICY "teacher_subjects_select_super_admin"
  ON teacher_subjects FOR SELECT
  USING (public.is_super_admin());

-- Bloque 3: asignar materias solo dentro de la propia escuela (antes: cualquier admin, cualquier escuela)
DROP POLICY IF EXISTS "teacher_subjects_write_admin" ON teacher_subjects;
CREATE POLICY "teacher_subjects_write_admin"
  ON teacher_subjects FOR ALL
  USING (
    public.is_super_admin() OR (public.is_admin() AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = teacher_subjects.teacher_id AND p.school_id = public.get_my_school_id()))
  )
  WITH CHECK (
    public.is_super_admin() OR (public.is_admin() AND EXISTS (
      SELECT 1 FROM public.subjects s WHERE s.id = teacher_subjects.subject_id AND s.school_id = public.get_my_school_id()))
  );

-- Bloque 4: proteger rol / escuela / estado del perfil.
-- Antes, "profiles_update_own" permitía a cualquier usuario cambiarse el rol (p. ej. a super_admin)
-- o activarse solo. Ahora solo un admin puede cambiar esos campos, y solo el super_admin
-- puede dar o quitar el rol super_admin. Desde el SQL Editor (sin usuario) no hay restricción.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS '
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF (NEW.role = ''super_admin'' OR OLD.role = ''super_admin'')
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION ''PERMISO: solo un super_admin puede asignar o quitar el rol super_admin'';
  END IF;
  IF NOT COALESCE(public.is_admin(), FALSE) AND (
       NEW.role      IS DISTINCT FROM OLD.role
    OR NEW.school_id IS DISTINCT FROM OLD.school_id
    OR NEW.active    IS DISTINCT FROM OLD.active
    OR NEW.email     IS DISTINCT FROM OLD.email) THEN
    RAISE EXCEPTION ''PERMISO: no puedes cambiar el rol, la escuela ni el estado de tu cuenta'';
  END IF;
  RETURN NEW;
END;
';

-- Bloque 5: activar la protección
DROP TRIGGER IF EXISTS trg_protect_profile_fields ON profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- Bloque 6: guardar un usuario desde la pestaña "Usuarios" (perfil + materias en una sola operación).
-- Reglas: el admin solo edita usuarios de su escuela o pendientes, solo los asigna a su escuela,
-- no puede crear super_admin ni editarse a sí mismo. Las materias deben ser de la escuela asignada.
CREATE OR REPLACE FUNCTION public.admin_save_user(
  p_user      UUID,
  p_full_name TEXT,
  p_role      TEXT,
  p_school    UUID,
  p_active    BOOLEAN,
  p_subjects  TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS '
DECLARE
  is_super BOOLEAN := COALESCE(public.is_super_admin(), FALSE);
  target   public.profiles%ROWTYPE;
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION ''PERMISO: solo un admin puede gestionar usuarios'';
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
    IF target.school_id IS NOT NULL AND target.school_id <> public.get_my_school_id() THEN
      RAISE EXCEPTION ''PERMISO: el usuario pertenece a otra escuela'';
    END IF;
    IF p_school IS DISTINCT FROM public.get_my_school_id() THEN
      RAISE EXCEPTION ''PERMISO: solo puedes asignar usuarios a tu escuela'';
    END IF;
  END IF;

  IF p_role NOT IN (''docente'', ''director'', ''counselor'', ''admin'')
     AND NOT (is_super AND p_role = ''super_admin'') THEN
    RAISE EXCEPTION ''Rol no válido: %'', p_role;
  END IF;

  IF p_school IS NULL AND COALESCE(p_active, FALSE) THEN
    RAISE EXCEPTION ''Asigna una escuela antes de activar la cuenta'';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_subjects, ARRAY[]::TEXT[])) AS sid
    WHERE NOT EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = sid AND s.school_id = p_school)
  ) THEN
    RAISE EXCEPTION ''Hay materias que no son de la escuela asignada'';
  END IF;

  UPDATE public.profiles
     SET full_name = CASE WHEN length(trim(COALESCE(p_full_name, ''x''))) = 0 THEN NULL ELSE trim(p_full_name) END,
         role      = p_role,
         school_id = p_school,
         active    = COALESCE(p_active, FALSE)
   WHERE id = p_user;

  DELETE FROM public.teacher_subjects WHERE teacher_id = p_user;
  INSERT INTO public.teacher_subjects (teacher_id, subject_id)
    SELECT p_user, sid FROM unnest(COALESCE(p_subjects, ARRAY[]::TEXT[])) AS sid
    ON CONFLICT DO NOTHING;
END;
';

-- Bloque 7: solo usuarios con sesión pueden llamarla
REVOKE ALL ON FUNCTION public.admin_save_user(UUID, TEXT, TEXT, UUID, BOOLEAN, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_user(UUID, TEXT, TEXT, UUID, BOOLEAN, TEXT[]) TO authenticated;

-- Verificación (opcional):
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_protect_profile_fields';
-- SELECT proname FROM pg_proc WHERE proname = 'admin_save_user';
