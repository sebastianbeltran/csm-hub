-- Límite semanal de pantallas (iPad) en Early Childhood y Primary — 23 nov 2026
-- 600 min (10 h) por grado y semana, sumando todas las materias.
-- Ejecutar cada bloque por separado en el SQL Editor (sin $$: el editor falló con ellos).

-- Bloque 1: columna con los minutos de pantalla del plan (0 = no usa)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS screen_minutes INTEGER NOT NULL DEFAULT 0 CHECK (screen_minutes >= 0);

-- Bloque 2: límite por escuela (NULL = sin límite)
CREATE OR REPLACE FUNCTION public.screen_limit_for_school(p_school UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
AS 'SELECT CASE WHEN slug IN (''early_childhood'', ''primary_school'') THEN 600 ELSE NULL END FROM public.schools WHERE id = p_school';

-- Bloque 3: uso de pantallas de un grado/semana (lo consulta el lesson plan)
CREATE OR REPLACE FUNCTION public.get_screen_usage(p_school UUID, p_grade TEXT, p_week TEXT)
RETURNS TABLE (subject_id TEXT, teacher_id UUID, minutes INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER
AS 'SELECT p.subject_id, p.teacher_id, p.screen_minutes FROM public.plans p WHERE p.school_id = p_school AND (p_school = public.get_my_school_id() OR public.is_super_admin()) AND p.grade = p_grade AND p.week_start = p_week AND p.screen_minutes > 0';

-- Bloque 4: validación al guardar (nadie puede pasarse del límite)
CREATE OR REPLACE FUNCTION public.check_screen_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS '
DECLARE
  lim  INTEGER;
  used INTEGER;
BEGIN
  IF COALESCE(NEW.screen_minutes, 0) = 0 THEN
    RETURN NEW;
  END IF;
  lim := public.screen_limit_for_school(NEW.school_id);
  IF lim IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.school_id::text || NEW.grade || NEW.week_start));
  SELECT COALESCE(SUM(screen_minutes), 0) INTO used
    FROM public.plans
   WHERE school_id = NEW.school_id AND grade = NEW.grade AND week_start = NEW.week_start AND id <> NEW.id;
  IF used + NEW.screen_minutes > lim THEN
    RAISE EXCEPTION ''LIMITE_PANTALLAS: solo quedan % min de pantallas para este grado esta semana'', GREATEST(lim - used, 0);
  END IF;
  RETURN NEW;
END;
';

-- Bloque 5: activar la validación en la tabla plans
DROP TRIGGER IF EXISTS trg_check_screen_limit ON plans;
CREATE TRIGGER trg_check_screen_limit
  BEFORE INSERT OR UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION public.check_screen_limit();
