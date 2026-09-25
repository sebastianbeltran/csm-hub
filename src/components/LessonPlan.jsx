import { useState, useEffect } from 'react'
import { format, addWeeks, startOfWeek, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Save, Download, ChevronDown, ChevronUp } from 'lucide-react'

const GRADES = ['9', '10', '11']

const COMP_TRANSVERSALES = [
  { id: 'COM',  label: 'Comunicación' },
  { id: 'PL',   label: 'P. Lógico' },
  { id: 'CD',   label: 'C. Digital' },
  { id: 'PC',   label: 'P. Crítico' },
  { id: 'META', label: 'Metacognición' },
  { id: 'TC',   label: 'T. Colaborativo' },
]

const emptyForm = {
  actividades: '', evaluacion: [], diferenciacion: '',
  diversidad: '', compTransversales: [], compArea: '',
  conexionProyecto: '', observaciones: '',
}

const getMonday = (date) =>
  format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')

const weekLabel = (mondayStr) => {
  try {
    const s = parseISO(mondayStr)
    return `${format(s, "d MMM", { locale: es })} – ${format(addDays(s, 4), "d MMM yyyy", { locale: es })}`
  } catch { return mondayStr }
}

const toggleArr = (arr, item) =>
  arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]

const downloadCSV = (rows, filename) => {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function LessonPlan({ plans, subjects, onSave }) {
  const [grade, setGrade]         = useState('9')
  const [subjectId, setSubjectId] = useState('')
  const [weekStart, setWeekStart] = useState(getMonday(new Date()))
  const [form, setForm]           = useState(emptyForm)
  const [showRef, setShowRef]     = useState(true)
  const [saved, setSaved]         = useState(false)
  const [showExport, setShowExport] = useState(false)

  const gradeSubjects = subjects.filter(s => s.grade === grade)

  // Reset subject when grade changes
  useEffect(() => {
    const list = subjects.filter(s => s.grade === grade)
    setSubjectId(list[0]?.id || '')
  }, [grade, subjects])

  // Load plan when subject/week changes
  useEffect(() => {
    if (!subjectId) return
    const existing = plans.find(p => p.id === `${subjectId}_${weekStart}`)
    setForm(existing ? {
      actividades:       existing.actividades       || '',
      evaluacion:        existing.evaluacion        || [],
      diferenciacion:    existing.diferenciacion    || '',
      diversidad:        existing.diversidad        || '',
      compTransversales: existing.compTransversales || [],
      compArea:          existing.compArea          || '',
      conexionProyecto:  existing.conexionProyecto  || '',
      observaciones:     existing.observaciones     || '',
    } : emptyForm)
  }, [subjectId, weekStart, plans])

  const navWeek = (dir) => setWeekStart(getMonday(addWeeks(parseISO(weekStart), dir)))
  const setField = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSave = () => {
    if (!subjectId) return
    onSave({ ...form, id: `${subjectId}_${weekStart}`, subjectId, grade, weekStart, savedAt: new Date().toISOString() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // Export helpers
  const planRows = (filteredPlans) => {
    const headers = ['Grado', 'Semana', 'Materia', 'Actividades', 'Evaluación',
      'Diferenciación', 'Diversidad', 'Comp. Transversales', 'Comp. del Área', 'Conexión Proyecto', 'Observaciones']
    const rows = filteredPlans
      .sort((a, b) => (a.grade + a.weekStart + a.subjectId).localeCompare(b.grade + b.weekStart + b.subjectId))
      .map(p => {
        const subLabel = subjects.find(s => s.id === p.subjectId)?.label || p.subjectId
        return [
          `${p.grade}°`, weekLabel(p.weekStart), subLabel,
          p.actividades || '', (p.evaluacion || []).join(' + '),
          p.diferenciacion || '', p.diversidad || '',
          (p.compTransversales || []).join(', '), p.compArea || '',
          p.conexionProyecto || '', p.observaciones || '',
        ]
      })
    return [headers, ...rows]
  }

  const exportMateria = () => {
    const subLabel = subjects.find(s => s.id === subjectId)?.label || subjectId
    downloadCSV(planRows(plans.filter(p => p.subjectId === subjectId)),
      `plan_${subjectId}.csv`)
  }
  const exportGrado = () => {
    downloadCSV(planRows(plans.filter(p => p.grade === grade)),
      `plan_${grade}grado.csv`)
  }
  const exportTodo = () => {
    downloadCSV(planRows(plans), 'plan_compilado_total.csv')
  }

  const isCurrentWeek = weekStart === getMonday(new Date())
  const currentSubject = subjects.find(s => s.id === subjectId)

  const refEntries = [-2, -1].map(offset => {
    const ws = getMonday(addWeeks(parseISO(weekStart), offset))
    return { ws, entry: plans.find(p => p.id === `${subjectId}_${ws}`) }
  })

  return (
    <div className="space-y-4 max-w-4xl mx-auto">

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">

        {/* Grade tabs */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Grado</label>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
            {GRADES.map(g => (
              <button key={g} onClick={() => setGrade(g)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  grade === g ? 'bg-white text-green-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >{g}°</button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Materia</label>
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-600">
            {gradeSubjects.length === 0
              ? <option value="">Sin materias — agregar desde Administrar</option>
              : gradeSubjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)
            }
          </select>
        </div>

        {/* Week */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Semana</label>
          <div className="flex items-center gap-1.5">
            <button onClick={() => navWeek(-1)} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50">
              <ChevronLeft size={14} className="text-slate-500" />
            </button>
            <span className={`px-3 py-2 rounded-xl text-sm font-semibold border min-w-[170px] text-center ${
              isCurrentWeek ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>{weekLabel(weekStart)}</span>
            <button onClick={() => navWeek(1)} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50">
              <ChevronRight size={14} className="text-slate-500" />
            </button>
            {!isCurrentWeek && (
              <button onClick={() => setWeekStart(getMonday(new Date()))}
                className="px-2.5 py-2 text-xs font-bold text-green-700 hover:bg-green-50 rounded-xl border border-green-200">
                Hoy
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-auto">
          {/* Export dropdown */}
          <div className="relative">
            <button onClick={() => setShowExport(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">
              <Download size={14} /> Exportar <ChevronDown size={12} />
            </button>
            {showExport && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[220px] py-1 overflow-hidden">
                  <button onClick={() => { exportMateria(); setShowExport(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors">
                    <p className="font-semibold text-slate-700">Esta materia</p>
                    <p className="text-xs text-slate-400">{currentSubject?.label} — todas las semanas</p>
                  </button>
                  <button onClick={() => { exportGrado(); setShowExport(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors border-t border-slate-50">
                    <p className="font-semibold text-slate-700">Grado {grade}° completo</p>
                    <p className="text-xs text-slate-400">Todas las materias de {grade}°</p>
                  </button>
                  <button onClick={() => { exportTodo(); setShowExport(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors border-t border-slate-50">
                    <p className="font-semibold text-slate-700">Compilado total</p>
                    <p className="text-xs text-slate-400">9°, 10° y 11° — todas las semanas</p>
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={handleSave} disabled={!subjectId}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              saved ? 'bg-emerald-600 text-white' : 'bg-green-700 text-white hover:bg-green-800'
            }`}>
            <Save size={14} /> {saved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Reference toggle */}
      <button onClick={() => setShowRef(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors px-1">
        {showRef ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        Referencia — últimas 2 semanas
        {refEntries.some(r => r.entry)
          ? <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{refEntries.filter(r => r.entry).length} registro{refEntries.filter(r => r.entry).length > 1 ? 's' : ''}</span>
          : <span className="text-slate-300 text-xs">sin registros previos</span>
        }
      </button>

      {/* Reference cards */}
      {showRef && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {refEntries.map(({ ws, entry }, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {i === 0 ? 'Hace 2 semanas' : 'Semana anterior'}
                </span>
                <span className="text-xs text-slate-400 font-medium">{weekLabel(ws)}</span>
              </div>
              {entry ? (
                <div className="p-4 space-y-3">
                  {entry.actividades && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Actividades</p>
                      <p className="text-slate-600 text-xs leading-relaxed line-clamp-5">{entry.actividades}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {entry.evaluacion?.map(e => <span key={e} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{e}</span>)}
                    {entry.compTransversales?.map(c => <span key={c} className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">{c}</span>)}
                  </div>
                  {entry.observaciones && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observaciones</p>
                      <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">{entry.observaciones}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-300 text-sm">Sin registro para esta semana</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {subjectId ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-800 to-green-700 px-6 py-4">
            <p className="text-white font-bold text-base">{currentSubject?.label} · {grade}°</p>
            <p className="text-green-200 text-sm">{weekLabel(weekStart)}{isCurrentWeek ? ' · Semana actual' : ''}</p>
          </div>
          <div className="p-6 space-y-5">
            <Field label="Actividades semanales" required hint="Descripción de las actividades de la semana">
              <textarea value={form.actividades} onChange={e => setField('actividades', e.target.value)}
                placeholder="Describe las actividades planificadas para esta semana..."
                className={ta} rows={5} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Evaluación">
                <div className="flex gap-2">
                  {['Formativa', 'Sumativa'].map(opt => (
                    <button key={opt} type="button" onClick={() => setField('evaluacion', toggleArr(form.evaluacion, opt))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                        form.evaluacion.includes(opt)
                          ? 'bg-green-700 border-green-700 text-white'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-green-300'
                      }`}>{opt}</button>
                  ))}
                </div>
              </Field>
              <Field label="Competencias Transversales">
                <div className="flex gap-2 flex-wrap">
                  {COMP_TRANSVERSALES.map(({ id, label }) => (
                    <button key={id} type="button" title={label}
                      onClick={() => setField('compTransversales', toggleArr(form.compTransversales, id))}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        form.compTransversales.includes(id)
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-violet-300'
                      }`}>{id}</button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Diferenciación" hint="E · M · IP">
                <textarea value={form.diferenciacion} onChange={e => setField('diferenciacion', e.target.value)}
                  placeholder={"E (Exceed): ...\nM (Met): ...\nIP (In Process): ..."}
                  className={ta} rows={4} />
              </Field>
              <Field label="Diversidad / Diversity" hint="Ajustes para estudiantes con apoyo">
                <textarea value={form.diversidad} onChange={e => setField('diversidad', e.target.value)}
                  placeholder="Ajuste curricular específico..." className={ta} rows={4} />
              </Field>
            </div>
            <Field label="Competencias del Área" hint="Subject competencies">
              <textarea value={form.compArea} onChange={e => setField('compArea', e.target.value)}
                placeholder="Competencias del área trabajadas esta semana..." className={ta} rows={2} />
            </Field>
            <Field label="Conexión con el Proyecto" hint="Project link">
              <textarea value={form.conexionProyecto} onChange={e => setField('conexionProyecto', e.target.value)}
                placeholder="¿Cómo conecta esta semana con el proyecto interdisciplinario?" className={ta} rows={2} />
            </Field>
            <Field label="Observaciones">
              <textarea value={form.observaciones} onChange={e => setField('observaciones', e.target.value)}
                placeholder="Notas libres: incidencias, ajustes de última hora, seguimiento..." className={ta} rows={3} />
            </Field>
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button onClick={handleSave} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                saved ? 'bg-emerald-600 text-white' : 'bg-green-700 text-white hover:bg-green-800'
              }`}>
                <Save size={15} /> {saved ? '✓ Guardado correctamente' : 'Guardar plan semanal'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400">
          <p className="font-medium">No hay materias para {grade}°</p>
          <p className="text-sm mt-1">Ve a <strong>Administrar</strong> para agregar materias</p>
        </div>
      )}
    </div>
  )
}

const ta = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none leading-relaxed"

function Field({ label, required, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
