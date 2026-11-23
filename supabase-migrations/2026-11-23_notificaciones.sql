-- Notificaciones dentro de la app — 23 nov 2026
-- Las generan triggers de la base de datos; el docente las ve en la campanita del header.
-- Sin $$ (el SQL Editor falló con ellos): cuerpos entre comillas simples, comillas internas dobladas.

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   UUID REFERENCES schools(id),
  kind        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE USING (user_id = auth.uid());

-- Docentes de una escuela que dictan alguno de los cursos (cursos vacío = toda la escuela)
CREATE OR REPLACE FUNCTION public.teachers_for_courses(p_school UUID, p_courses TEXT[])
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS '
  SELECT p.id FROM public.profiles p
   WHERE p.school_id = p_school AND COALESCE(cardinality(p_courses), 0) = 0
  UNION
  SELECT DISTINCT ts.teacher_id
    FROM public.teacher_schedules ts,
         jsonb_each(ts.schedule) AS d(day_key, slots),
         jsonb_each(d.slots)      AS c(slot_key, cell)
   WHERE ts.school_id = p_school
     AND COALESCE(cardinality(p_courses), 0) > 0
     AND jsonb_typeof(d.slots) = ''object''
     AND c.cell->>''course'' = ANY(p_courses)
';

-- Eventos del horario (schedule_events): crear, modificar o cancelar
CREATE OR REPLACE FUNCTION public.notify_schedule_event()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS '
DECLARE
  ev      RECORD;
  v_title TEXT;
  v_body  TEXT;
BEGIN
  IF TG_OP = ''DELETE'' THEN
    ev := OLD;
    IF OLD.date < CURRENT_DATE THEN RETURN OLD; END IF;
    v_title := ''Evento cancelado: '' || OLD.title;
  ELSIF TG_OP = ''UPDATE'' THEN
    ev := NEW;
    IF NEW.title IS NOT DISTINCT FROM OLD.title
       AND NEW.date IS NOT DISTINCT FROM OLD.date
       AND NEW.time_start IS NOT DISTINCT FROM OLD.time_start
       AND NEW.time_end IS NOT DISTINCT FROM OLD.time_end
       AND NEW.target_courses IS NOT DISTINCT FROM OLD.target_courses THEN
      RETURN NEW;
    END IF;
    v_title := ''Evento modificado: '' || NEW.title;
  ELSE
    ev := NEW;
    v_title := ''Nuevo evento: '' || NEW.title;
  END IF;

  v_body := to_char(ev.date, ''DD/MM'') || '' · '' || ev.time_start || ''–'' || ev.time_end || '' · ''
         || CASE WHEN COALESCE(cardinality(ev.target_courses), 0) > 0
                 THEN array_to_string(ev.target_courses, '', '')
                 ELSE ''Toda la escuela'' END;

  INSERT INTO public.notifications (user_id, school_id, kind, title, body, link)
  SELECT t, ev.school_id, ''schedule_event'', v_title, v_body, ''/horario''
    FROM public.teachers_for_courses(ev.school_id, ev.target_courses) AS t
   WHERE t IS DISTINCT FROM auth.uid();

  IF TG_OP = ''DELETE'' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
';

DROP TRIGGER IF EXISTS trg_notify_schedule_event ON schedule_events;
CREATE TRIGGER trg_notify_schedule_event
  AFTER INSERT OR UPDATE OR DELETE ON schedule_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_schedule_event();

-- Cambios en el horario de un docente (teacher_schedules)
CREATE OR REPLACE FUNCTION public.notify_teacher_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS '
BEGIN
  IF TG_OP = ''UPDATE'' AND NEW.schedule IS NOT DISTINCT FROM OLD.schedule THEN
    RETURN NEW;
  END IF;
  IF NEW.teacher_id IS NOT DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, school_id, kind, title, body, link)
  VALUES (
    NEW.teacher_id, NEW.school_id, ''teacher_schedule'',
    CASE WHEN TG_OP = ''INSERT'' THEN ''Ya tienes tu horario de clases'' ELSE ''Tu horario de clases fue actualizado'' END,
    ''Revisa los cambios en ¿Cómo va mi horario?'',
    ''/horario''
  );
  RETURN NEW;
END;
';

DROP TRIGGER IF EXISTS trg_notify_teacher_schedule ON teacher_schedules;
CREATE TRIGGER trg_notify_teacher_schedule
  AFTER INSERT OR UPDATE ON teacher_schedules
  FOR EACH ROW EXECUTE FUNCTION public.notify_teacher_schedule();

-- Tiempo real: la campanita se actualiza sin recargar
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
