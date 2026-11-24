// Timbre (periodos/descansos) y cursos de cada escuela, más helpers del horario.
//
// Config por escuela → vigilancias_config id = `horario_<slug>`:
//   { slots: [{ id, label, start: 'H:MM', end: 'H:MM', type: 'period'|'break'|'dg', noFri? }],
//     courses: ['9A', '9B', ...] }
// Horario de cada docente → tabla teacher_schedules (columna schedule):
//   { '0': { [slotId]: { course, label?, span?, note? } }, ... '4': {...} }   (0 = lunes)

import { GRADES_BY_SCHOOL, gradeLabel } from './schoolGrades'

export const timetableId = (slug) => `horario_${slug}`

export const SLOT_TYPES = [
  { value: 'period', label: 'Clase' },
  { value: 'break',  label: 'Descanso' },
  { value: 'dg',     label: 'D.G.' },
]

// Plantilla con el timbre de High School 2026-27 (punto de partida para cualquier escuela)
export const HS_TEMPLATE = {
  slots: [
    { id: 'DG',       label: 'D.G',      start: '8:00',  end: '8:15',  type: 'dg'     },
    { id: 'P1',       label: 'P1',       start: '8:15',  end: '8:55',  type: 'period' },
    { id: 'P2',       label: 'P2',       start: '8:55',  end: '9:35',  type: 'period' },
    { id: 'recreo',   label: 'Recreo',   start: '9:35',  end: '10:05', type: 'break'  },
    { id: 'P3',       label: 'P3',       start: '10:05', end: '10:50', type: 'period' },
    { id: 'P4',       label: 'P4',       start: '10:50', end: '11:35', type: 'period' },
    { id: 'P5',       label: 'P5',       start: '11:35', end: '12:20', type: 'period' },
    { id: 'P6',       label: 'P6',       start: '12:20', end: '13:05', type: 'period' },
    { id: 'almuerzo', label: 'Almuerzo', start: '13:05', end: '14:05', type: 'break'  },
    { id: 'P7',       label: 'P7',       start: '14:05', end: '14:45', type: 'period', noFri: true },
    { id: 'P8',       label: 'P8',       start: '14:45', end: '15:25', type: 'period', noFri: true },
  ],
  courses: ['9A', '9B', '10A', '10B', '11°'],
}

export const toMin = (t) => {
  const [h, m] = String(t || '0:0').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export const slotMinutes = (s) => Math.max(0, toMin(s.end) - toMin(s.start))

export const newSlotId = () => `s_${Math.random().toString(36).slice(2, 8)}`

// Cursos sugeridos para una escuela: grado + A/B (el admin los ajusta)
export const defaultCourses = (slug) =>
  (GRADES_BY_SCHOOL[slug] ?? []).flatMap(g => {
    const base = /^\d+$/.test(g) ? g : `${gradeLabel(g)} `
    return [`${base}A`, `${base}B`]
  })

const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

// '8B' → '8' · 'Proy 9B' → '9' · '11°' → '11' · 'Kínder A' → 'kinder' · 'Profundización' → 'special'
export const courseGrade = (course) => {
  if (!course) return 'special'
  const num = String(course).match(/(\d{1,2})/)
  if (num) return String(Number(num[1]))
  const s = stripAccents(String(course)).toLowerCase()
  if (s.startsWith('pre')) return 'prekinder'
  if (s.startsWith('kin')) return 'kinder'
  if (s.startsWith('tran')) return 'transicion'
  return 'special'
}

export const SCHOOL_ABBR = {
  early_childhood: 'EC',
  primary_school:  'PS',
  middle_school:   'MS',
  high_school:     'HS',
}
export const SCHOOL_ABBR_NAMES = {
  EC: 'Early Childhood', PS: 'Primary School', MS: 'Middle School', HS: 'High School',
}

// Si el curso pertenece a otra escuela, devuelve su abreviatura ('MS'); si no, null
export const otherSchoolBadge = (grade, schoolSlug) => {
  const owner = Object.keys(GRADES_BY_SCHOOL).find(slug => GRADES_BY_SCHOOL[slug].includes(grade))
  return owner && owner !== schoolSlug ? SCHOOL_ABBR[owner] : null
}

// Colores por grado
const PALETTE = {
  prekinder:  { bg: '#fefce8', accent: '#eab308', text: '#713f12', light: '#fef9c3' },
  kinder:     { bg: '#f0fdfa', accent: '#14b8a6', text: '#134e4a', light: '#ccfbf1' },
  transicion: { bg: '#fdf2f8', accent: '#ec4899', text: '#831843', light: '#fce7f3' },
  '1':  { bg: '#fefce8', accent: '#ca8a04', text: '#713f12', light: '#fef08a' },
  '2':  { bg: '#f0fdfa', accent: '#0d9488', text: '#134e4a', light: '#99f6e4' },
  '3':  { bg: '#fdf2f8', accent: '#db2777', text: '#831843', light: '#fbcfe8' },
  '4':  { bg: '#ecfeff', accent: '#0891b2', text: '#164e63', light: '#cffafe' },
  '5':  { bg: '#f7fee7', accent: '#65a30d', text: '#365314', light: '#d9f99d' },
  '6':  { bg: '#fefce8', accent: '#d97706', text: '#78350f', light: '#fde68a' },
  '7':  { bg: '#ecfdf5', accent: '#10b981', text: '#065f46', light: '#d1fae5' },
  '8':  { bg: '#eff6ff', accent: '#3b82f6', text: '#1e3a5f', light: '#dbeafe' },
  '9':  { bg: '#f5f3ff', accent: '#8b5cf6', text: '#3b0764', light: '#ede9fe' },
  '10': { bg: '#fff7ed', accent: '#f97316', text: '#7c2d12', light: '#fed7aa' },
  '11': { bg: '#fff1f2', accent: '#f43f5e', text: '#881337', light: '#ffe4e6' },
  special: { bg: '#faf5ff', accent: '#a855f7', text: '#581c87', light: '#f3e8ff' },
}
export const gradeColor = (grade) => PALETTE[grade] ?? PALETTE.special

// Normaliza una celda del horario: agrega grade/label derivados
export const resolveClass = (cell) => {
  if (!cell || (!cell.course && !cell.label)) return null
  const grade = courseGrade(cell.course || cell.label)
  return { ...cell, label: cell.label || cell.course, grade, span: Math.max(1, Number(cell.span) || 1) }
}

// Set de celdas "tapadas" por clases que ocupan varios periodos: '0-P5'
export const coveredCells = (slots, schedule) => {
  const covered = new Set()
  for (let dayIdx = 0; dayIdx <= 4; dayIdx++) {
    for (const [slotId, cell] of Object.entries(schedule?.[dayIdx] || {})) {
      const span = Math.max(1, Number(cell?.span) || 1)
      if (span < 2) continue
      const start = slots.findIndex(s => s.id === slotId)
      if (start < 0) continue
      for (let i = 1; i < span; i++) if (slots[start + i]) covered.add(`${dayIdx}-${slots[start + i].id}`)
    }
  }
  return covered
}
