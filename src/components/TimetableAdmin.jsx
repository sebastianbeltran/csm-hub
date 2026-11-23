import { useState, useEffect } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Bell, CalendarDays, CheckCircle, AlertCircle, X } from 'lucide-react'
import {
  HS_TEMPLATE, SLOT_TYPES, defaultCourses, newSlotId, toMin, resolveClass, coveredCells, gradeColor,
} from '../lib/schoolTimetable'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const inp = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500'

const addMin = (t, mins) => {
  const total = toMin(t) + mins
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
// <input type="time"> necesita 'HH:MM'
const toTimeInput = (t) => {
  const m = toMin(t)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
const fromTimeInput = (v) => (v ? `${Number(v.split(':')[0])}:${v.split(':')[1]}` : '')

export default function TimetableAdmin({ timetable, schoolSlug, onSaveTimetable, onListTeachers, onLoadTeacherSchedule, onSaveTeacherSchedule }) {
  return (
    <div className="space-y-6">
      <BellScheduleEditor timetable={timetable} schoolSlug={schoolSlug} onSave={onSaveTimetable} />
      <TeacherScheduleEditor
        timetable={timetable}
        onListTeachers={onListTeachers}
        onLoad={onLoadTeacherSchedule}
        onSave={onSaveTeacherSchedule}
      />
    </div>
  )
}

/* ─── Timbre + cursos de la escuela ──────────────────────────────────────── */

function BellScheduleEditor({ timetable, schoolSlug, onSave }) {
  const [slots,   setSlots]   = useState(() => timetable?.slots ?? [])
  const [courses, setCourses] = useState(() => (timetable?.courses ?? []).join(', '))
  const [status,  setStatus]  = useState(null)

  const update = (i, patch) => { setSlots(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s)); setStatus(null) }
  const move   = (i, dir)   => setSlots(prev => {
    const next = [...prev]; const j = i + dir
    if (j < 0 || j >= next.length) return prev
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })
  const remove = (i) => setSlots(prev => prev.filter((_, j) => j !== i))
  const add    = () => setSlots(prev => {
    const last  = prev[prev.length - 1]
    const start = last?.end || '8:00'
    const n     = prev.filter(s => s.type === 'period').length + 1
    return [...prev, { id: newSlotId(), label: `P${n}`, start, end: addMin(start, 45), type: 'period' }]
  })

  const useTemplate = () => {
    setSlots(HS_TEMPLATE.slots.map(s => ({ ...s })))
    if (!courses.trim()) setCourses((schoolSlug === 'high_school' ? HS_TEMPLATE.courses : defaultCourses(schoolSlug)).join(', '))
  }

  const problems = slots.flatMap((s, i) => {
    const out = []
    if (!s.label.trim()) out.push(`Fila ${i + 1}: falta el nombre`)
    if (toMin(s.end) <= toMin(s.start)) out.push(`${s.label || `Fila ${i + 1}`}: la hora final debe ser mayor que la inicial`)
    if (i > 0 && toMin(s.start) < toMin(slots[i - 1].end)) out.push(`${s.label}: se cruza con ${slots[i - 1].label}`)
    return out
  })

  const handleSave = async () => {
    if (problems.length) return
    const courseList = [...new Set(courses.split(',').map(c => c.trim()).filter(Boolean))]
    const ok = await onSave({ slots, courses: courseList })
    setStatus(ok ? 'ok' : 'error')
  }

  return (
    <Section icon={<Bell size={15} className="text-amber-500" />} title="Timbre de la escuela"
      subtitle="Periodos, descansos y horas de esta escuela. Lo ven todos sus docentes en “¿Cómo va mi horario?”.">
      {slots.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-slate-400 mb-3">Esta escuela aún no tiene timbre configurado.</p>
          <button onClick={useTemplate}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Empezar desde la plantilla de High School
          </button>
        </div>
      )}

      {slots.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-400 text-left">
                <th className="py-2 pr-2 font-bold">Nombre</th>
                <th className="py-2 pr-2 font-bold">Tipo</th>
                <th className="py-2 pr-2 font-bold">Inicio</th>
                <th className="py-2 pr-2 font-bold">Fin</th>
                <th className="py-2 pr-2 font-bold text-center" title="Esta franja no existe los viernes">Sin viernes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slots.map((s, i) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2"><input value={s.label} onChange={e => update(i, { label: e.target.value })} className={inp} /></td>
                  <td className="py-1.5 pr-2">
                    <select value={s.type} onChange={e => update(i, { type: e.target.value })} className={inp}>
                      {SLOT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 pr-2"><input type="time" value={toTimeInput(s.start)} onChange={e => update(i, { start: fromTimeInput(e.target.value) })} className={inp} /></td>
                  <td className="py-1.5 pr-2"><input type="time" value={toTimeInput(s.end)} onChange={e => update(i, { end: fromTimeInput(e.target.value) })} className={inp} /></td>
                  <td className="py-1.5 pr-2 text-center">
                    <input type="checkbox" checked={!!s.noFri} onChange={e => update(i, { noFri: e.target.checked || undefined })} className="w-4 h-4 accent-green-700" />
                  </td>
                  <td className="py-1.5 whitespace-nowrap text-right">
                    <IconBtn onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={13} /></IconBtn>
                    <IconBtn onClick={() => move(i, 1)} disabled={i === slots.length - 1}><ArrowDown size={13} /></IconBtn>
                    <IconBtn onClick={() => remove(i)} danger><Trash2 size={13} /></IconBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={add} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800">
            <Plus size={14} /> Agregar franja
          </button>
        </div>
      )}

      <div className="mt-5">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cursos de la escuela</label>
        <input value={courses} onChange={e => { setCourses(e.target.value); setStatus(null) }}
          placeholder={(schoolSlug === 'high_school' ? HS_TEMPLATE.courses : defaultCourses(schoolSlug)).join(', ')}
          className={inp} />
        <p className="text-xs text-slate-400 mt-1">Separados por coma. Se usan para armar los horarios y para dirigir eventos a cursos específicos.</p>
      </div>

      {problems.length > 0 && (
        <ul className="mt-4 text-xs text-red-600 space-y-0.5">{problems.map(p => <li key={p}>• {p}</li>)}</ul>
      )}

      <div className="mt-5 flex items-center gap-3 justify-end">
        <StatusMsg status={status} ok="Timbre guardado" />
        <button onClick={handleSave} disabled={problems.length > 0 || slots.length === 0}
          className="px-5 py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed">
          Guardar timbre
        </button>
      </div>
    </Section>
  )
}

/* ─── Horario de clases de cada docente ──────────────────────────────────── */

const emptyCell = { course: '', label: '', span: 1, note: '' }

function TeacherScheduleEditor({ timetable, onListTeachers, onLoad, onSave }) {
  const slots   = timetable?.slots ?? []
  const courses = timetable?.courses ?? []

  const [teachers,  setTeachers]  = useState([])
  const [teacherId, setTeacherId] = useState('')
  const [schedule,  setSchedule]  = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [editing,   setEditing]   = useState(null)   // { dayIdx, slotId, cell }
  const [dirty,     setDirty]     = useState(false)
  const [status,    setStatus]    = useState(null)

  useEffect(() => { onListTeachers().then(setTeachers) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectTeacher = async (id) => {
    if (dirty && !window.confirm('Hay cambios sin guardar en este horario. ¿Descartarlos?')) return
    setTeacherId(id); setSchedule(null); setEditing(null); setDirty(false); setStatus(null); setLoadError(null)
    if (!id) return
    const { schedule: sch, error } = await onLoad(id)
    if (error) setLoadError(error)
    else setSchedule(sch ?? {})
  }

  const covered = coveredCells(slots, schedule)

  const openCell = (dayIdx, slotId) => {
    const cell = schedule?.[dayIdx]?.[slotId]
    setEditing({ dayIdx, slotId, cell: { ...emptyCell, ...cell } })
  }

  const applyCell = (cell) => {
    const { dayIdx, slotId } = editing
    setSchedule(prev => {
      const day = { ...(prev?.[dayIdx] || {}) }
      if (!cell || (!cell.course.trim() && !cell.label.trim())) delete day[slotId]
      else {
        const clean = { course: cell.course.trim() }
        if (cell.label.trim() && cell.label.trim() !== clean.course) clean.label = cell.label.trim()
        if (Number(cell.span) > 1) clean.span = Number(cell.span)
        if (cell.note.trim()) clean.note = cell.note.trim()
        day[slotId] = clean
      }
      return { ...(prev || {}), [dayIdx]: day }
    })
    setEditing(null); setDirty(true); setStatus(null)
  }

  const handleSave = async () => {
    const ok = await onSave(teacherId, schedule)
    setStatus(ok ? 'ok' : 'error')
    if (ok) setDirty(false)
  }

  const teacherName = (t) => t.full_name || t.email || t.id.slice(0, 8)

  return (
    <Section icon={<CalendarDays size={15} className="text-green-600" />} title="Horario de clases por docente"
      subtitle="Elige un docente y haz clic en cada periodo para asignarle el curso.">
      {slots.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Primero configura y guarda el timbre de la escuela.</p>
      ) : (
        <>
          <div className="max-w-sm">
            <select value={teacherId} onChange={e => selectTeacher(e.target.value)} className={inp}>
              <option value="">— Seleccionar docente —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{teacherName(t)}{t.role !== 'docente' ? ` (${t.role})` : ''}</option>)}
            </select>
            {teachers.length === 0 && <p className="text-xs text-slate-400 mt-1">No hay usuarios registrados en esta escuela todavía.</p>}
          </div>

          {loadError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              No se pudo leer el horario ({loadError}). ¿Ya se ejecutó la migración SQL de <code>teacher_schedules</code> en Supabase?
            </div>
          )}

          {schedule && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm border-collapse" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th className="w-20" />
                    {DAYS.map(d => <th key={d} className="py-2 text-[11px] uppercase tracking-wider text-slate-400 font-bold">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {slots.map(slot => (
                    <tr key={slot.id} className="border-t border-slate-100">
                      <td className="py-1 pr-2 text-xs text-slate-400 whitespace-nowrap">
                        <span className="font-bold text-slate-500">{slot.label}</span> <span className="text-[10px]">{slot.start}</span>
                      </td>
                      {DAYS.map((_, dayIdx) => {
                        if (slot.type !== 'period') {
                          return <td key={dayIdx} className="py-1 px-1"><div className="h-6 rounded bg-slate-50" /></td>
                        }
                        if (dayIdx === 4 && slot.noFri) {
                          return <td key={dayIdx} className="py-1 px-1 text-center text-slate-200">—</td>
                        }
                        if (covered.has(`${dayIdx}-${slot.id}`)) {
                          return <td key={dayIdx} className="py-1 px-1 text-center text-[10px] text-slate-300">↑ continúa</td>
                        }
                        const cls = resolveClass(schedule?.[dayIdx]?.[slot.id])
                        const c   = cls ? gradeColor(cls.grade) : null
                        const isEditing = editing?.dayIdx === dayIdx && editing?.slotId === slot.id
                        return (
                          <td key={dayIdx} className="py-1 px-1">
                            <button onClick={() => openCell(dayIdx, slot.id)}
                              className={`w-full min-h-9 rounded-lg text-xs font-bold px-2 py-1.5 text-left border transition-colors ${
                                isEditing ? 'ring-2 ring-green-500' : ''
                              } ${cls ? 'border-transparent' : 'border-dashed border-slate-200 text-slate-300 hover:border-green-300 hover:text-green-600'}`}
                              style={cls ? { backgroundColor: c.bg, color: c.text, borderLeft: `3px solid ${c.accent}` } : undefined}>
                              {cls ? <>{cls.label}{cls.span > 1 && <span className="font-normal opacity-60"> · {cls.span} per.</span>}</> : '+'}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {editing && (
                <CellEditor
                  key={`${editing.dayIdx}-${editing.slotId}`}
                  initial={editing.cell}
                  title={`${DAYS[editing.dayIdx]} · ${slots.find(s => s.id === editing.slotId)?.label}`}
                  courses={courses}
                  maxSpan={Math.max(1, slots.length - slots.findIndex(s => s.id === editing.slotId))}
                  onApply={applyCell}
                  onClear={() => applyCell(null)}
                  onCancel={() => setEditing(null)}
                />
              )}

              <div className="mt-5 flex items-center gap-3 justify-end">
                {dirty && <span className="text-xs text-amber-600 font-semibold">Cambios sin guardar</span>}
                <StatusMsg status={status} ok="Horario guardado" />
                <button onClick={handleSave} disabled={!dirty}
                  className="px-5 py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed">
                  Guardar horario
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

function CellEditor({ initial, title, courses, maxSpan, onApply, onClear, onCancel }) {
  const [cell, setCell] = useState(initial)
  const set = (k, v) => setCell(c => ({ ...c, [k]: v }))
  return (
    <div className="mt-4 rounded-2xl border border-green-200 bg-green-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-700">{title}</h4>
        <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <label className="block">
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Curso</span>
          <input list="tt-courses" value={cell.course} onChange={e => set('course', e.target.value)} placeholder="Ej: 9A" className={inp} autoFocus />
          <datalist id="tt-courses">{courses.map(c => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Texto a mostrar</span>
          <input value={cell.label} onChange={e => set('label', e.target.value)} placeholder={cell.course || 'Ej: Proy 9A'} className={inp} />
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Franjas seguidas</span>
          <select value={cell.span} onChange={e => set('span', Number(e.target.value))} className={inp}>
            {Array.from({ length: Math.min(4, maxSpan) }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nota (opcional)</span>
          <input value={cell.note} onChange={e => set('note', e.target.value)} placeholder="Ej: 8:55–9:35" className={inp} />
        </label>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        El grado (y su color) sale del curso. Si el curso es de otra escuela (p. ej. 7A siendo de High School) se marca con su sigla.
        Para clases sin curso (p. ej. Profundización) deja el curso vacío y escribe solo el texto.
      </p>
      <div className="mt-3 flex gap-2 justify-end">
        <button onClick={onClear} className="px-4 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50">Quitar clase</button>
        <button onClick={() => onApply(cell)} className="px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800">Aplicar</button>
      </div>
    </div>
  )
}

/* ─── UI helpers ─────────────────────────────────────────────────────────── */

function Section({ icon, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">{icon}<h3 className="font-semibold text-slate-800 text-sm">{title}</h3></div>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function IconBtn({ children, onClick, disabled, danger }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-20 ${danger ? 'text-slate-300 hover:text-red-500 hover:bg-red-50' : 'text-slate-400 hover:bg-slate-100'}`}>
      {children}
    </button>
  )
}

function StatusMsg({ status, ok }) {
  if (status === 'ok')    return <span className="flex items-center gap-1 text-sm text-emerald-600 font-semibold"><CheckCircle size={14} /> {ok}</span>
  if (status === 'error') return <span className="flex items-center gap-1 text-sm text-red-600 font-semibold"><AlertCircle size={14} /> No se pudo guardar</span>
  return null
}
