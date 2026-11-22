import { useState, useEffect } from 'react'
import { Clock, Users, X } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const PX_PER_MIN = 1.5
const DAY_START  = 8 * 60   // 480 min from midnight

const DAYS = [
  { label: 'Lunes',     short: 'LUN', js: 1 },
  { label: 'Martes',    short: 'MAR', js: 2 },
  { label: 'Miércoles', short: 'MIÉ', js: 3 },
  { label: 'Jueves',    short: 'JUE', js: 4 },
  { label: 'Viernes',   short: 'VIE', js: 5 },
]

const SLOTS = [
  { id: 'DG',       label: 'D.G',     min: 15, start: '8:00',  end: '8:15',  type: 'dg'     },
  { id: 'P1',       label: 'P1',      min: 40, start: '8:15',  end: '8:55',  type: 'period' },
  { id: 'P2',       label: 'P2',      min: 40, start: '8:55',  end: '9:35',  type: 'period' },
  { id: 'recreo',   label: 'Recreo',  min: 30, start: '9:35',  end: '10:05', type: 'break'  },
  { id: 'P3',       label: 'P3',      min: 45, start: '10:05', end: '10:50', type: 'period' },
  { id: 'P4',       label: 'P4',      min: 45, start: '10:50', end: '11:35', type: 'period' },
  { id: 'P5',       label: 'P5',      min: 45, start: '11:35', end: '12:20', type: 'period' },
  { id: 'P6',       label: 'P6',      min: 45, start: '12:20', end: '13:05', type: 'period' },
  { id: 'almuerzo', label: 'Almuerzo',min: 60, start: '13:05', end: '14:05', type: 'break'  },
  { id: 'P7',       label: 'P7',      min: 40, start: '14:05', end: '14:45', type: 'period', noFri: true },
  { id: 'P8',       label: 'P8',      min: 40, start: '14:45', end: '15:25', type: 'period', noFri: true },
]

const TOTAL_HEIGHT = SLOTS.reduce((s, sl) => s + Math.round(sl.min * PX_PER_MIN), 0)

// span: N → la clase ocupa N periodos consecutivos (celdas mergeadas en el Excel)
const MY_SCHEDULE = {
  0: { // Lunes
    P1: { label: '8B',  grade: '8',  course: '8B'  },
    P2: { label: '7A',  grade: '7',  course: '7A',  ms: true, msTime: '8:55–9:35' },
    P4: { label: '10B', grade: '10', course: '10B' },
    P5: { label: '10A', grade: '10', course: '10A' },
    P8: { label: '7B',  grade: '7',  course: '7B',  ms: true, msTime: '2:40–3:20' },
  },
  1: { // Martes — Profundización abarca P4+P5+P6 (celdas mergeadas)
    P2: { label: '7B', grade: '7', course: '7B', ms: true, msTime: '8:55–9:35' },
    P4: { label: 'Profundización', grade: 'special', course: 'especial', span: 3, endTime: '13:05' },
  },
  2: { // Miércoles
    P3: { label: '10B',     grade: '10', course: '10B' },
    P4: { label: 'Proy 9B', grade: '9',  course: '9B'  },
    P5: { label: 'Proy 9A', grade: '9',  course: '9A'  },
    P8: { label: '8A',      grade: '8',  course: '8A',  ms: true, msTime: '2:40–3:20' },
  },
  3: { // Jueves
    P1: { label: 'Proy 10A', grade: '10', course: '10A' },
    P3: { label: '9A',       grade: '9',  course: '9A'  },
    P4: { label: 'Proy 10B', grade: '10', course: '10B' },
    P5: { label: '9B',       grade: '9',  course: '9B'  },
    P6: { label: '10A',      grade: '10', course: '10A' },
  },
  4: { // Viernes — Proyecto 11° abarca P4+P5+P6 (celdas mergeadas)
    P3: { label: '7A',           grade: '7',  course: '7A',  ms: true, msTime: '10:10–10:50' },
    P4: { label: 'Proyecto 11°', grade: '11', course: '11°', span: 3, endTime: '13:00' },
  },
}

// Celdas "tapadas" por un span — no se renderizan como celdas independientes
const COVERED = new Set()
for (let dayIdx = 0; dayIdx <= 4; dayIdx++) {
  for (const [slotId, cls] of Object.entries(MY_SCHEDULE[dayIdx] || {})) {
    const span = cls.span || 1
    if (span > 1) {
      const startRowIdx = SLOTS.findIndex(s => s.id === slotId)
      for (let i = 1; i < span; i++) {
        if (SLOTS[startRowIdx + i]) COVERED.add(`${dayIdx}-${SLOTS[startRowIdx + i].id}`)
      }
    }
  }
}

const GRADE = {
  '7':     { bg: '#ecfdf5', accent: '#10b981', text: '#065f46', light: '#d1fae5' },
  '8':     { bg: '#eff6ff', accent: '#3b82f6', text: '#1e3a5f', light: '#dbeafe' },
  '9':     { bg: '#f5f3ff', accent: '#8b5cf6', text: '#3b0764', light: '#ede9fe' },
  '10':    { bg: '#fff7ed', accent: '#f97316', text: '#7c2d12', light: '#fed7aa' },
  '11':    { bg: '#fff1f2', accent: '#f43f5e', text: '#881337', light: '#ffe4e6' },
  special: { bg: '#faf5ff', accent: '#a855f7', text: '#581c87', light: '#f3e8ff' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const slotH = (s) => Math.round(s.min * PX_PER_MIN)

function findActiveSlot(nowMins) {
  let acc = DAY_START
  for (let i = 0; i < SLOTS.length; i++) {
    if (nowMins >= acc && nowMins < acc + SLOTS[i].min) return i
    acc += SLOTS[i].min
  }
  return -1
}

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

// Fecha local como 'YYYY-MM-DD' sin conversión UTC
const localDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

// ['YYYY-MM-DD', ...] para los 5 días de la semana (hora local, no UTC)
function getWeekDates(refDate) {
  const d   = new Date(refDate)
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  return Array.from({ length: 5 }, (_, i) => {
    const wd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + mondayOffset + i)
    return localDateStr(wd)
  })
}

// Cursos que el teacher imparte en un día específico
function getTeacherCoursesForDay(dayIdx) {
  return new Set(
    Object.values(MY_SCHEDULE[dayIdx] || {}).map(c => c.course).filter(Boolean)
  )
}

// Si el teacher es relevante para este evento (por cursos o "toda la escuela")
function isEventRelevant(evt, dayIdx) {
  if (!evt.target_courses?.length) return true          // toda la escuela
  const teacherCourses = getTeacherCoursesForDay(dayIdx)
  return evt.target_courses.some(c => teacherCourses.has(c))
}

// Eventos relevantes para el teacher en un slot (spanCount cubre celdas mergeadas)
function getEventsForSlot(scheduleEvents, weekDates, dayIdx, slot, spanCount = 1) {
  if (!scheduleEvents?.length) return []
  const dateStr  = weekDates[dayIdx]
  const slotIdx  = SLOTS.findIndex(s => s.id === slot.id)
  const endSlot  = SLOTS[slotIdx + spanCount - 1] || slot
  const sStart   = toMin(slot.start)
  const sEnd     = toMin(endSlot.end)

  return scheduleEvents.filter(evt => {
    if (evt.date !== dateStr) return false
    if (!isEventRelevant(evt, dayIdx)) return false
    const eStart = toMin(evt.time_start)
    const eEnd   = toMin(evt.time_end)
    return eStart < sEnd && eEnd > sStart
  })
}

// Todos los eventos de la semana relevantes para este teacher
function getWeekEvents(scheduleEvents, weekDates) {
  if (!scheduleEvents?.length) return []
  return scheduleEvents.filter((evt, _, arr) => {
    const dayIdx = weekDates.indexOf(evt.date)
    if (dayIdx < 0) return false
    return isEventRelevant(evt, dayIdx)
  }).sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start))
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HorarioSemanal({ scheduleEvents = [] }) {
  const [now,          setNow]          = useState(new Date())
  const [weekOffset,   setWeekOffset]   = useState(0)   // 0 = semana actual, 1 = próxima, -1 = anterior
  const [showSubModal, setShowSubModal] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const jsDay    = now.getDay()
  const todayIdx = jsDay >= 1 && jsDay <= 5 ? jsDay - 1 : -1
  const nowMins  = now.getHours() * 60 + now.getMinutes()
  const totalScheduleMins = SLOTS.reduce((s, sl) => s + sl.min, 0)

  // La línea de tiempo solo se muestra en la semana actual
  const isCurrentWeek = weekOffset === 0
  const isSchoolTime  = isCurrentWeek && todayIdx >= 0 && nowMins >= DAY_START && nowMins < DAY_START + totalScheduleMins
  const timelineTop   = Math.round((nowMins - DAY_START) * PX_PER_MIN)
  const activeSlotIdx = isSchoolTime ? findActiveSlot(nowMins) : -1
  const activeSlot    = activeSlotIdx >= 0 ? SLOTS[activeSlotIdx] : null

  // Fecha de referencia desplazada por weekOffset
  const refDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weekOffset * 7)

  const timeStr    = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  const weekDates  = getWeekDates(refDate)
  const weekEvents  = getWeekEvents(scheduleEvents, weekDates)
  const todayStr    = localDateStr(new Date())
  const todayJsDay  = new Date().getDay()
  const todayRealIdx = todayJsDay >= 1 && todayJsDay <= 5 ? todayJsDay - 1 : -1
  const todayEvents = scheduleEvents.filter(evt => {
    if (evt.date !== todayStr) return false
    return todayRealIdx >= 0 && isEventRelevant(evt, todayRealIdx)
  }).sort((a, b) => a.time_start.localeCompare(b.time_start))

  // Etiqueta de la semana mostrada
  const weekLabel = (() => {
    const mon = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + (refDate.getDay() === 0 ? -6 : 1 - refDate.getDay()))
    const fri = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 4)
    const fmtDate = (d) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    if (weekOffset === 0) return `Esta semana · ${fmtDate(mon)} – ${fmtDate(fri)}`
    if (weekOffset === 1) return `Próxima semana · ${fmtDate(mon)} – ${fmtDate(fri)}`
    if (weekOffset === -1) return `Semana anterior · ${fmtDate(mon)} – ${fmtDate(fri)}`
    return `${fmtDate(mon)} – ${fmtDate(fri)}`
  })()

  const gridTemplateRows    = SLOTS.map(s => `${slotH(s)}px`).join(' ')
  const gridTemplateColumns = '56px repeat(5, 1fr)'

  return (
    <div className="max-w-7xl mx-auto space-y-4">

      {/* Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">¿Cómo va mi horario?</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {weekLabel}
            {isCurrentWeek && activeSlot && (
              <span className="ml-2 font-semibold text-green-600">
                · {activeSlot.type === 'break' ? activeSlot.label : `Periodo ${activeSlot.label}`}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Navegación de semana */}
          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
              disabled={weekOffset === 0}
              className={`px-3 py-2 font-bold text-sm transition-colors ${weekOffset === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100'}`}>‹</button>
            {!isCurrentWeek && (
              <button onClick={() => setWeekOffset(0)}
                className="px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 transition-colors border-x border-slate-200">
                Hoy
              </button>
            )}
            <button onClick={() => setWeekOffset(o => o + 1)}
              className="px-3 py-2 text-slate-500 hover:bg-slate-100 transition-colors font-bold text-sm">›</button>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Clock size={13} className="text-slate-400" />
            <span className="text-sm font-mono font-bold text-slate-700">{timeStr}</span>
          </div>
          <button
            onClick={() => setShowSubModal(true)}
            className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-orange-100 active:bg-orange-200 transition-colors"
          >
            <Users size={13} />
            Buscar reemplazo
          </button>
        </div>
      </div>

      {/* Grid ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

        {/* Day headers */}
        <div className="overflow-x-auto" style={{ minWidth: 500 }}>
          <div className="grid border-b border-slate-200" style={{ gridTemplateColumns }}>
            <div className="bg-slate-50 border-r border-slate-200" />
            {DAYS.map((day, i) => {
              const isToday   = isCurrentWeek && i === todayIdx
              const dateNum   = weekDates[i] ? new Date(weekDates[i] + 'T12:00:00').getDate() : ''
              return (
                <div
                  key={i}
                  className={`py-2.5 text-center border-r border-slate-200 last:border-r-0 ${isToday ? 'bg-green-700' : 'bg-slate-50'}`}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-green-200' : 'text-slate-400'}`}>
                    {day.short}
                  </div>
                  <div className={`text-lg font-bold leading-tight ${isToday ? 'text-white' : 'text-slate-700'}`}>
                    {dateNum}
                  </div>
                  {isToday && (
                    <div className="w-1 h-1 rounded-full bg-white/70 mx-auto mt-0.5" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Grid body — CSS Grid con soporte de rowSpan */}
          <div
            className="relative overflow-x-auto"
            style={{ minWidth: 500, height: TOTAL_HEIGHT }}
          >
            <div
              className="absolute inset-0"
              style={{ display: 'grid', gridTemplateColumns, gridTemplateRows }}
            >
              {SLOTS.map((slot, rowIdx) => {
                const isActiveRow = rowIdx === activeSlotIdx

                // ── Time label ──────────────────────────────────────────
                const timeLabel = (
                  <div
                    key={`t-${slot.id}`}
                    className={`border-b border-r border-slate-100 flex flex-col items-center justify-center gap-0.5 ${
                      slot.type === 'break' ? 'bg-slate-50/80' :
                      slot.type === 'dg'    ? 'bg-green-50/50'  :
                      isActiveRow           ? 'bg-green-50'     : ''
                    }`}
                    style={{ gridRow: rowIdx + 1, gridColumn: 1 }}
                  >
                    {slot.type === 'period' && (
                      <>
                        <span className={`text-[11px] font-bold ${isActiveRow ? 'text-green-700' : 'text-slate-400'}`}>
                          {slot.label}
                        </span>
                        <span className="text-[9px] text-slate-300 leading-none">{slot.start}</span>
                      </>
                    )}
                    {slot.type === 'dg' && (
                      <span className="text-[9px] font-bold text-green-500 tracking-widest uppercase">D.G</span>
                    )}
                    {slot.type === 'break' && (
                      <span className="text-[9px] text-slate-300">{slot.start}</span>
                    )}
                  </div>
                )

                // ── Day cells ───────────────────────────────────────────
                const dayCells = DAYS.map((_, dayIdx) => {
                  const key = `${slot.id}-${dayIdx}`

                  // Saltear celdas tapadas por un span anterior
                  if (COVERED.has(`${dayIdx}-${slot.id}`)) return null

                  const isToday     = dayIdx === todayIdx
                  const isFriNoSlot = dayIdx === 4 && slot.noFri
                  const cls         = MY_SCHEDULE[dayIdx]?.[slot.id]
                  const span        = cls?.span || 1
                  const gs          = cls ? GRADE[cls.grade] : null

                  // ── DG band ──
                  if (slot.type === 'dg') {
                    return (
                      <div
                        key={key}
                        className={`border-b border-r border-slate-100 last:border-r-0 flex items-center justify-center ${
                          isToday ? 'bg-green-50' : 'bg-slate-50/40'
                        }`}
                        style={{ gridRow: rowIdx + 1, gridColumn: dayIdx + 2 }}
                      >
                        <span className="text-[9px] font-bold tracking-widest text-green-500/60 uppercase">D.G.</span>
                      </div>
                    )
                  }

                  // ── Break band ──
                  if (slot.type === 'break') {
                    return (
                      <div
                        key={key}
                        className={`border-b border-r border-slate-100 last:border-r-0 flex items-center justify-center ${
                          isToday ? 'bg-amber-50/50' : 'bg-slate-50/60'
                        }`}
                        style={{ gridRow: rowIdx + 1, gridColumn: dayIdx + 2 }}
                      >
                        {dayIdx === 2 && (
                          <span className="text-[10px] text-slate-300 font-medium select-none">{slot.label}</span>
                        )}
                      </div>
                    )
                  }

                  // ── Viernes sin clase (P7, P8) ──
                  if (isFriNoSlot) {
                    return (
                      <div
                        key={key}
                        className="border-b border-r border-slate-100 last:border-r-0 bg-slate-50/40 flex items-center justify-center"
                        style={{ gridRow: rowIdx + 1, gridColumn: dayIdx + 2 }}
                      >
                        <span className="text-[10px] text-slate-200 select-none">—</span>
                      </div>
                    )
                  }

                  // ── Celda de clase (normal o con span) ──
                  const gridRow   = span > 1 ? `${rowIdx + 1} / ${rowIdx + 1 + span}` : rowIdx + 1
                  const slotEvts  = getEventsForSlot(scheduleEvents, weekDates, dayIdx, slot, span)

                  return (
                    <div
                      key={key}
                      className={`border-b border-r border-slate-100 last:border-r-0 p-1 relative ${
                        isToday && isActiveRow ? 'bg-green-50/20' : ''
                      }`}
                      style={{ gridRow, gridColumn: dayIdx + 2 }}
                    >
                      {/* Clase — siempre a full opacity; el overlay se superpone solo en su franja */}
                      {cls && gs && (
                        <div
                          className="h-full rounded-lg border-l-[3px] px-2 py-1.5 flex flex-col justify-between overflow-hidden"
                          style={{ backgroundColor: gs.bg, borderLeftColor: gs.accent }}
                        >
                          <div className="flex items-start justify-between gap-1 min-w-0">
                            <span className="text-xs font-bold leading-tight" style={{ color: gs.text }}>
                              {cls.label}
                            </span>
                            {cls.ms && (
                              <span className="text-[8px] font-bold px-1 py-px rounded shrink-0 leading-tight"
                                style={{ backgroundColor: gs.light, color: gs.accent }}>MS</span>
                            )}
                          </div>
                          {span > 1 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {Array.from({ length: span }, (_, i) => {
                                const s = SLOTS[rowIdx + i]
                                return s ? (
                                  <span key={s.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                    style={{ backgroundColor: gs.light, color: gs.accent }}>{s.label}</span>
                                ) : null
                              })}
                            </div>
                          )}
                          <div className="mt-auto">
                            {cls.msTime && <span className="text-[8px] opacity-50 leading-tight block" style={{ color: gs.text }}>{cls.msTime}</span>}
                            {span > 1 && cls.endTime && <span className="text-[9px] opacity-60 leading-tight block" style={{ color: gs.text }}>{slot.start} – {cls.endTime}</span>}
                          </div>
                        </div>
                      )}

                      {/* Eventos superpuestos — posicionados proporcionalmente dentro de la celda */}
                      {slotEvts.map(evt => {
                        const slotStart  = toMin(slot.start)
                        const spanEndSlt = SLOTS[SLOTS.findIndex(s => s.id === slot.id) + span - 1] || slot
                        const slotEnd    = toMin(spanEndSlt.end)
                        const slotDur    = slotEnd - slotStart
                        const eStart     = toMin(evt.time_start)
                        const eEnd       = toMin(evt.time_end)
                        const topPct     = Math.max(0, (Math.max(eStart, slotStart) - slotStart) / slotDur * 100)
                        const heightPct  = Math.max(0, (Math.min(eEnd, slotEnd) - Math.max(eStart, slotStart)) / slotDur * 100)
                        const isTiny     = heightPct < 25  // menos de ~1/4 del slot: solo mostrar título

                        return (
                          <div
                            key={evt.id}
                            className="absolute left-1 right-1 z-10 rounded-lg bg-teal-500 border border-teal-400 px-2 overflow-hidden shadow-md flex flex-col justify-between"
                            style={{ top: `${topPct}%`, height: `${heightPct}%` }}
                            title={[evt.title, evt.description, `${evt.time_start}–${evt.time_end}`].filter(Boolean).join(' · ')}
                          >
                            <div className="flex items-start gap-1 min-w-0 pt-1">
                              <span className="text-[10px] shrink-0 leading-tight">📢</span>
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-white leading-tight line-clamp-2 block">{evt.title}</span>
                                {!isTiny && evt.description && (
                                  <p className="text-[8px] text-teal-100 leading-tight line-clamp-1 mt-0.5">{evt.description}</p>
                                )}
                              </div>
                            </div>
                            {!isTiny && (
                              <div className="pb-1">
                                <span className="text-[8px] font-semibold text-teal-200 leading-none">
                                  {evt.time_start} – {evt.time_end}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })

                return [timeLabel, ...dayCells]
              })}

              {/* Time line ──────────────────────────────────────────────── */}
              {isSchoolTime && (
                <div
                  className="pointer-events-none z-10"
                  style={{
                    position: 'absolute',
                    top: timelineTop,
                    left: 0,
                    right: 0,
                  }}
                >
                  <div className="flex items-center">
                    <div
                      className="flex-shrink-0 flex items-center justify-end pr-1.5"
                      style={{ width: 56 }}
                    >
                      <span className="text-[9px] font-bold text-red-500 bg-white px-1 py-0.5 rounded shadow-sm border border-red-100 leading-none whitespace-nowrap">
                        {timeStr}
                      </span>
                    </div>
                    <div className="flex-1 relative">
                      <div
                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500"
                        style={{ boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}
                      />
                      <div
                        className="w-full h-px bg-red-400"
                        style={{ boxShadow: '0 0 3px rgba(239,68,68,0.3)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Legend ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex flex-wrap gap-3 items-center">
        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mr-1">Grados</span>
        {[['7°','7'],['8°','8'],['9°','9'],['10°','10'],['11°','11'],['Especial','special']].map(([lbl, g]) => {
          const c = GRADE[g]
          return (
            <div key={g} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm border-l-2" style={{ backgroundColor: c.bg, borderLeftColor: c.accent }} />
              <span className="text-xs text-slate-500">{lbl}</span>
            </div>
          )
        })}
        <span className="text-xs text-slate-300 ml-1">· MS = Middle School</span>
        {isSchoolTime && (
          <div className="flex items-center gap-1 ml-auto">
            <div className="w-4 h-px bg-red-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-xs text-slate-400">Hora actual</span>
          </div>
        )}
      </div>

      {/* Eventos de la semana ───────────────────────────────────────────── */}
      {weekEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">📢 Eventos de la semana</span>
            <span className="ml-auto text-[11px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{weekEvents.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {weekEvents.map(evt => {
              const dayIdx  = weekDates.indexOf(evt.date)
              const dayName = dayIdx >= 0 ? DAYS[dayIdx].label : evt.date
              return (
                <div key={evt.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-1 h-full self-stretch rounded-full bg-teal-500 shrink-0 mt-1" style={{ minHeight: 16 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{evt.title}</span>
                      {evt.target_courses?.length > 0
                        ? evt.target_courses.map(c => (
                            <span key={c} className="text-[10px] font-bold px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded">{c}</span>
                          ))
                        : <span className="text-[10px] font-semibold text-teal-600">🏫 Toda la escuela</span>
                      }
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dayName} · {evt.time_start}–{evt.time_end}
                      {evt.description && ` · ${evt.description}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Substitution modal ─────────────────────────────────────────────── */}
      {showSubModal && (
        <SubstitutionModal
          onClose={() => setShowSubModal(false)}
          todayIdx={todayIdx}
        />
      )}
    </div>
  )
}

// ─── Substitution Modal ────────────────────────────────────────────────────────

function SubstitutionModal({ onClose, todayIdx }) {
  const [date,          setDate]          = useState(() => new Date().toISOString().split('T')[0])
  const [selectedSlots, setSelectedSlots] = useState(new Set())
  const [searched,      setSearched]      = useState(false)

  const dateDay    = new Date(date + 'T12:00:00').getDay()
  const dateDayIdx = dateDay >= 1 && dateDay <= 5 ? dateDay - 1 : -1

  // Para reemplazos siempre por hora individual — expandir spans en periodos sueltos
  const classesForDate = dateDayIdx >= 0
    ? SLOTS.filter(s => {
        if (s.type !== 'period') return false
        if (s.noFri && dateDayIdx === 4) return false
        if (COVERED.has(`${dateDayIdx}-${s.id}`)) return false
        const cls = MY_SCHEDULE[dateDayIdx]?.[s.id]
        if (!cls) return false
        // Expandir spans: si tiene span, generar entradas para cada periodo cubierto
        return true
      })
    : []

  // Generar lista plana de periodos (1 por hora, expandiendo spans)
  const flatPeriods = []
  for (const slot of classesForDate) {
    const cls  = MY_SCHEDULE[dateDayIdx]?.[slot.id]
    const span = cls?.span || 1
    for (let i = 0; i < span; i++) {
      const s = SLOTS[SLOTS.findIndex(x => x.id === slot.id) + i]
      if (s) flatPeriods.push({ slot: s, cls, rootSlotId: slot.id })
    }
  }

  const toggle = (id) => {
    setSelectedSlots(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setSearched(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Buscar reemplazo</h2>
            <p className="text-sm text-slate-500 mt-0.5">Selecciona hora por hora las clases a cubrir</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Fecha */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Fecha de ausencia</label>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setSelectedSlots(new Set()); setSearched(false) }}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
          />
          {date && dateDayIdx < 0 && (
            <p className="text-xs text-amber-600 font-medium">Este día no es un día de clase.</p>
          )}
        </div>

        {/* Periodos */}
        {flatPeriods.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Horas a cubrir
            </label>
            <div className="space-y-1.5">
              {flatPeriods.map(({ slot, cls }) => {
                const gs  = GRADE[cls.grade]
                const sel = selectedSlots.has(slot.id)
                return (
                  <button
                    key={slot.id}
                    onClick={() => toggle(slot.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      sel ? 'border-green-500 bg-green-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${sel ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                      {sel && <span className="text-white text-[8px] font-black leading-none">✓</span>}
                    </div>
                    <div className="w-1 h-7 rounded-full shrink-0" style={{ backgroundColor: gs.accent }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">{slot.label}</span>
                        <span className="text-sm font-semibold text-slate-800 truncate">{cls.label}</span>
                        {cls.ms && <span className="text-[8px] font-bold px-1 py-px rounded shrink-0" style={{ backgroundColor: gs.light, color: gs.accent }}>MS</span>}
                      </div>
                      <span className="text-xs text-slate-400">{slot.start} – {slot.end}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {flatPeriods.length === 0 && dateDayIdx >= 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No tienes clases asignadas ese día.</p>
        )}

        {selectedSlots.size > 0 && !searched && (
          <button
            onClick={() => setSearched(true)}
            className="w-full bg-green-700 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-800 transition-colors flex items-center justify-center gap-2"
          >
            <Users size={14} />
            Buscar profesores disponibles · {selectedSlots.size} hora{selectedSlots.size > 1 ? 's' : ''}
          </button>
        )}

        {searched && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Disponibilidad por hora</p>
            {[...selectedSlots].map(slotId => {
              const slot = SLOTS.find(s => s.id === slotId)
              const fp   = flatPeriods.find(p => p.slot.id === slotId)
              if (!slot || !fp) return null
              const gs = GRADE[fp.cls.grade]
              return (
                <div key={slotId} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: gs.bg }}>
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: gs.accent }} />
                    <span className="text-xs font-bold" style={{ color: gs.text }}>{slot.label}</span>
                    <span className="text-sm font-semibold" style={{ color: gs.text }}>{fp.cls.label}</span>
                    <span className="text-xs ml-auto" style={{ color: gs.accent }}>{slot.start} – {slot.end}</span>
                  </div>
                  <div className="px-3 py-2.5 bg-amber-50 border-t border-amber-100">
                    <p className="text-xs text-amber-700">
                      Próximamente aparecerán los profesores disponibles una vez se carguen todos los horarios del colegio.
                    </p>
                  </div>
                </div>
              )
            })}
            <button
              onClick={() => setSearched(false)}
              className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors"
            >
              Cambiar selección
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
