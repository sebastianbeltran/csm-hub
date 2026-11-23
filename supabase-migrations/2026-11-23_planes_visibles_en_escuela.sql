-- Docentes pueden LEER los planes de otras materias, pero solo de su escuela
-- y de los grados donde tienen materias asignadas (teacher_subjects).
-- Ejecutar cada bloque por separado en el SQL Editor (con $$ falló: "syntax error at end of input").

DROP POLICY IF EXISTS "plans_select_same_school" ON plans;

CREATE OR REPLACE FUNCTION public.get_my_grades()
RETURNS SETOF TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS 'SELECT DISTINCT s.grade FROM public.teacher_subjects ts JOIN public.subjects s ON s.id = ts.subject_id WHERE ts.teacher_id = auth.uid()';

CREATE POLICY "plans_select_same_grade"
  ON plans FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND school_id = public.get_my_school_id()
    AND grade IN (SELECT public.get_my_grades())
  );
