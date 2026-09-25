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

const exportToPDF = (filteredPlans, title, subtitle, subjectsList, groupBySubject = false) => {
  const withContent = [...filteredPlans].filter(p => p.actividades)
  const sorted = withContent.sort((a, b) =>
    groupBySubject
      ? (a.subjectId + a.weekStart).localeCompare(b.subjectId + b.weekStart)
      : (a.weekStart + a.subjectId).localeCompare(b.weekStart + b.subjectId)
  )

  const wLabel = (mondayStr) => {
    try {
      const s = parseISO(mondayStr)
      return `${format(s, "d 'de' MMMM", { locale: es })} – ${format(addDays(s, 4), "d 'de' MMMM yyyy", { locale: es })}`
    } catch { return mondayStr }
  }

  const arr = (v) => Array.isArray(v) ? v : (v ? [v] : [])
  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
  const chips = (items) => arr(items).map(i => `<span class="chip">${esc(i)}</span>`).join('')
  const field = (label, content, full = false) => content ? `
    <div class="field ${full ? 'full' : ''}">
      <div class="field-label">${label}</div>
      <div class="field-value">${content}</div>
    </div>` : ''

  const logoUrl = window.location.origin + '/csm-logo.png'
  const date = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })

  // Group by subject when needed
  let content = ''
  if (groupBySubject) {
    const bySubject = []
    let lastId = null
    sorted.forEach(p => {
      if (p.subjectId !== lastId) {
        bySubject.push({ subjectId: p.subjectId, plans: [] })
        lastId = p.subjectId
      }
      bySubject[bySubject.length - 1].plans.push(p)
    })
    content = bySubject.map(({ subjectId: sid, plans: sp }) => {
      const subLabel = subjectsList.find(s => s.id === sid)?.label || sid
      const grade = sp[0]?.grade || ''
      return `
        <div class="subject-block">
          <div class="subject-header">
            <span class="subject-name">${esc(subLabel)}</span>
            <span class="subject-grade">${grade}°</span>
          </div>
          ${sp.map(p => weekBlock(p, false)).join('')}
        </div>`
    }).join('')
  } else {
    content = sorted.map(p => weekBlock(p, false)).join('')
  }

  function weekBlock(p, showSub) {
    const subLabel = subjectsList.find(s => s.id === p.subjectId)?.label || ''
    return `
    <div class="week">
      <div class="week-header">
        <span>Semana · ${wLabel(p.week_start || p.weekStart)}</span>
        ${showSub ? `<span class="sub-info">${esc(subLabel)}</span>` : ''}
      </div>
      <div class="week-body">
        ${field('Actividades semanales', esc(p.actividades), true)}
        ${arr(p.evaluacion).length ? `<div class="field"><div class="field-label">Evaluación</div><div class="chips">${chips(p.evaluacion)}</div></div>` : ''}
        ${arr(p.comp_transversales || p.compTransversales).length ? `<div class="field"><div class="field-label">Comp. Transversales</div><div class="chips">${chips(p.comp_transversales || p.compTransversales)}</div></div>` : ''}
        ${field('Diferenciación (E · M · IP)', esc(p.diferenciacion))}
        ${field('Diversidad', esc(p.diversidad))}
        ${field('Competencias del Área', esc(p.comp_area || p.compArea), true)}
        ${field('Conexión con el Proyecto', esc(p.conexion_proyecto || p.conexionProyecto), true)}
        ${field('Observaciones', esc(p.observaciones), true)}
      </div>
    </div>`
  }

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:10.5px;color:#111;background:#fff;padding:0 0 32px}
    .page-header{display:flex;align-items:center;gap:16px;padding:20px 28px 16px;border-bottom:3px solid #166534}
    .page-header img{height:44px;width:auto}
    .page-header h1{font-size:15px;font-weight:800;color:#166534;line-height:1.2}
    .page-header p{font-size:10px;color:#666;margin-top:3px}
    .plan-meta{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 16px;margin:16px 28px}
    .plan-meta h2{font-size:13px;font-weight:700;color:#166534}
    .plan-meta p{font-size:10px;color:#555;margin-top:3px}
    .subject-block{margin-top:20px;page-break-before:always}
    .subject-block:first-child{page-break-before:avoid;margin-top:0}
    .subject-header{display:flex;align-items:baseline;justify-content:space-between;margin:0 28px 8px;padding-bottom:6px;border-bottom:2px solid #166534}
    .subject-name{font-size:14px;font-weight:800;color:#166534}
    .subject-grade{font-size:11px;font-weight:600;color:#4b5563;background:#f0fdf4;padding:2px 10px;border-radius:99px;border:1px solid #bbf7d0}
    .week{margin:8px 28px 0;page-break-inside:avoid}
    .week-header{background:#166534;color:#fff;padding:7px 12px;border-radius:6px 6px 0 0;font-weight:700;font-size:11px;display:flex;justify-content:space-between;align-items:center}
    .sub-info{font-weight:400;font-size:10px;opacity:.85}
    .week-body{border:1px solid #d1fae5;border-top:none;border-radius:0 0 6px 6px;padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}
    .field{display:flex;flex-direction:column;gap:3px}
    .field.full{grid-column:1/-1}
    .field-label{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#166534}
    .field-value{font-size:10.5px;line-height:1.55;color:#111}
    .chips{display:flex;flex-wrap:wrap;gap:4px}
    .chip{background:#dcfce7;color:#15803d;padding:2px 7px;border-radius:99px;font-size:9.5px;font-weight:700}
    .footer{text-align:center;color:#9ca3af;font-size:8.5px;margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;margin-left:28px;margin-right:28px}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.week{page-break-inside:avoid}.subject-block{page-break-before:always}.subject-block:first-child{page-break-before:avoid}}
  </style></head><body>
  <div class="page-header">
    <img src="${logoUrl}" alt="CSM">
    <div><h1>Colegio Santa María</h1><p>Plan Semanal Integrado · Bachillerato</p></div>
  </div>
  <div class="plan-meta"><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>
  ${content}
  <div class="footer">Generado desde Hub Docente · Colegio Santa María · ${date}</div>
  </body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0'
  document.body.appendChild(iframe)
  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()
  iframe.onload = () => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }
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

  const exportSemana = () => {
    const subLabel = subjects.find(s => s.id === subjectId)?.label || subjectId
    exportToPDF(
      plans.filter(p => p.subjectId === subjectId && (p.week_start || p.weekStart) === weekStart),
      subLabel + ' · ' + grade + '°',
      'Semana del ' + weekLabel(weekStart),
      subjects, false
    )
  }
  const exportMateria = () => {
    const subLabel = subjects.find(s => s.id === subjectId)?.label || subjectId
    exportToPDF(
      plans.filter(p => p.subjectId === subjectId && p.grade === grade),
      subLabel + ' · ' + grade + '°',
      'Todas las semanas del período',
      subjects, false
    )
  }
  const exportGrado = () => {
    exportToPDF(
      plans.filter(p => p.grade === grade),
      'Grado ' + grade + '° — Plan Semanal Integrado',
      'Todas las materias · Todas las semanas',
      subjects, true
    )
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
              <Download size={14} /> PDF <ChevronDown size={12} />
            </button>
            {showExport && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[260px] py-1">
                  <button onClick={() => { exportSemana(); setShowExport(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors">
                    <p className="font-semibold text-slate-700">Esta materia · Esta semana</p>
                    <p className="text-xs text-slate-400">{currentSubject?.label} · {weekLabel(weekStart)}</p>
                  </button>
                  <button onClick={() => { exportMateria(); setShowExport(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors border-t border-slate-50">
                    <p className="font-semibold text-slate-700">Esta materia · Todas las semanas</p>
                    <p className="text-xs text-slate-400">{currentSubject?.label} · {grade}°</p>
                  </button>
                  <button onClick={() => { exportGrado(); setShowExport(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors border-t border-slate-50">
                    <p className="font-semibold text-slate-700">Todas las materias · Grado {grade}°</p>
                    <p className="text-xs text-slate-400">Agrupado por materia · todas las semanas</p>
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
