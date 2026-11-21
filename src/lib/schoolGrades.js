// Grados de cada escuela (por slug de la tabla `schools`).
// `value` es lo que se guarda en la base de datos (columna `grade` de subjects y plans).
const numeric = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i))

export const GRADES_BY_SCHOOL = {
  early_childhood: ['prekinder', 'kinder', 'transicion'],
  primary_school:  numeric(1, 5),
  middle_school:   numeric(6, 8),
  high_school:     numeric(9, 11),
}

const GRADE_NAMES = {
  prekinder:  'Prekínder',
  kinder:     'Kínder',
  transicion: 'Transición',
}

// Sin escuela conocida se muestran los grados de High School (comportamiento anterior)
export const getSchoolGrades = (schoolSlug) =>
  GRADES_BY_SCHOOL[schoolSlug] ?? GRADES_BY_SCHOOL.high_school

// '9' → '9°' · 'transicion' → 'Transición'
export const gradeLabel = (grade) => GRADE_NAMES[grade] ?? (grade ? `${grade}°` : '')
