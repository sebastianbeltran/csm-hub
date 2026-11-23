-- =====================================================================
-- Horario y lesson plan por escuela — 23 nov 2026
-- Ejecutar en Supabase STAGING → SQL Editor (una sola vez).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Horario de clases de cada docente (lo carga el admin de su escuela)
--    schedule = { "0": { "<slotId>": { "course": "9A", "label"?, "span"?, "note"? } }, ... "4": {...} }
--    (0 = lunes; los slotId vienen del timbre de la escuela en vigilancias_config 'horario_<slug>')
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_schedules (
  teacher_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id),
  schedule    JSONB NOT NULL DEFAULT '{}',
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teacher_schedules ENABLE ROW LEVEL SECURITY;

-- El docente ve el suyo; director/admin ven los de su escuela; super_admin ve todos
CREATE POLICY "teacher_schedules_select"
  ON teacher_schedules FOR SELECT
  USING (
    teacher_id = auth.uid()
    OR public.is_super_admin()
    OR (public.is_coordinator_or_above() AND school_id = public.get_my_school_id())
  );

-- Solo el admin de la escuela (o super_admin) escribe, y solo para docentes de esa escuela
CREATE POLICY "teacher_schedules_write_admin"
  ON teacher_schedules FOR ALL
  USING (
    public.is_super_admin()
    OR (public.is_admin() AND school_id = public.get_my_school_id())
  )
  WITH CHECK (
    (public.is_super_admin() OR (public.is_admin() AND school_id = public.get_my_school_id()))
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = teacher_id AND p.school_id = teacher_schedules.school_id)
  );


-- ---------------------------------------------------------------------
-- 2. "Ver como" otra escuela: el super_admin necesita leer materias y
--    eventos de todas las escuelas (la app filtra por la escuela activa).
-- ---------------------------------------------------------------------
CREATE POLICY "subjects_select_super_admin"
  ON subjects FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "events_select_super_admin"
  ON events FOR SELECT
  USING (public.is_super_admin());


-- ---------------------------------------------------------------------
-- 3. Datos iniciales: timbre + cursos de High School
-- ---------------------------------------------------------------------
INSERT INTO vigilancias_config (id, data, updated_at) VALUES (
  'horario_high_school',
  '{
    "slots": [
      {"id": "DG",       "label": "D.G",      "start": "8:00",  "end": "8:15",  "type": "dg"},
      {"id": "P1",       "label": "P1",       "start": "8:15",  "end": "8:55",  "type": "period"},
      {"id": "P2",       "label": "P2",       "start": "8:55",  "end": "9:35",  "type": "period"},
      {"id": "recreo",   "label": "Recreo",   "start": "9:35",  "end": "10:05", "type": "break"},
      {"id": "P3",       "label": "P3",       "start": "10:05", "end": "10:50", "type": "period"},
      {"id": "P4",       "label": "P4",       "start": "10:50", "end": "11:35", "type": "period"},
      {"id": "P5",       "label": "P5",       "start": "11:35", "end": "12:20", "type": "period"},
      {"id": "P6",       "label": "P6",       "start": "12:20", "end": "13:05", "type": "period"},
      {"id": "almuerzo", "label": "Almuerzo", "start": "13:05", "end": "14:05", "type": "break"},
      {"id": "P7",       "label": "P7",       "start": "14:05", "end": "14:45", "type": "period", "noFri": true},
      {"id": "P8",       "label": "P8",       "start": "14:45", "end": "15:25", "type": "period", "noFri": true}
    ],
    "courses": ["7A", "7B", "8A", "8B", "9A", "9B", "10A", "10B", "11°"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------
-- 4. Datos iniciales: horario de jbeltran2 (el que estaba fijo en el código)
-- ---------------------------------------------------------------------
INSERT INTO teacher_schedules (teacher_id, school_id, schedule, updated_by)
SELECT p.id, p.school_id, '{
  "0": {
    "P1": {"course": "8B"},
    "P2": {"course": "7A", "note": "8:55–9:35"},
    "P4": {"course": "10B"},
    "P5": {"course": "10A"},
    "P8": {"course": "7B", "note": "2:40–3:20"}
  },
  "1": {
    "P2": {"course": "7B", "note": "8:55–9:35"},
    "P4": {"course": "", "label": "Profundización", "span": 3}
  },
  "2": {
    "P3": {"course": "10B"},
    "P4": {"course": "9B", "label": "Proy 9B"},
    "P5": {"course": "9A", "label": "Proy 9A"},
    "P8": {"course": "8A", "note": "2:40–3:20"}
  },
  "3": {
    "P1": {"course": "10A", "label": "Proy 10A"},
    "P3": {"course": "9A"},
    "P4": {"course": "10B", "label": "Proy 10B"},
    "P5": {"course": "9B"},
    "P6": {"course": "10A"}
  },
  "4": {
    "P3": {"course": "7A", "note": "10:10–10:50"},
    "P4": {"course": "11°", "label": "Proyecto 11°", "span": 3}
  }
}'::jsonb, p.id
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'jbeltran2@csm.edu.co'
ON CONFLICT (teacher_id) DO NOTHING;
