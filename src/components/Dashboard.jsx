import { useState } from 'react'
import {
  format, parseISO, isToday, isPast, differenceInDays,
  addDays, addWeeks, addMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Sun, CalendarDays, CalendarRange,
  ChevronLeft, ChevronRight, X, AlertCircle,
} from 'lucide-react'
import { CATEGORY_STYLES } from '../data/constants'

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function eventsForDay(events, day) {
  return events
    .filter(e => { try { return isSameDay(parseISO(e.date), day) } catch { return false } })
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
}

function relDate(dateStr) {
  try {
    const d = parseISO(dateStr)
    const days = differenceInDays(d, new Date())
    if (isToday(d)) return { label: 'Hoy', chip: 'bg-green-700 text-white' }
    if (days === 1) return { label: 'Mañana', chip: 'bg-amber-500 text-white' }
    if (days > 1 && days <= 7) return { label: `En ${days} días`, chip: 'bg-slate-200 text-slate-600' }
    if (days > 7) return { label: format(d, "d MMM", { locale: es }), chip: 'bg-slate-100 text-slate-500' }
    return { label: `Hace ${Math.abs(days)}d`, chip: 'bg-red-100 text-red-500' }
  } catch { return { label: dateStr, chip: 'bg-slate-100 text-slate-500' } }
}

export default function Dashboard({ events }) {
  const [view, setView] = useState('day')
  const [focusDate, setFocusDate] = useState(new Date())
  const [modalEvent, setModalEvent] = useState(null)

  const nav = (dir) => {
    if (view === 'day') setFocusDate(d => addDays(d, dir))
    else if (view === 'week') setFocusDate(d => addWeeks(d, dir))
    else setFocusDate(d => addMonths(d, dir))
  }

  const isCurrentPeriod =
    view === 'day' ? isToday(focusDate)
    : view === 'week'
      ? isSameDay(startOfWeek(focusDate, { weekStartsOn: 1 }), startOfWeek(new Date(), { weekStartsOn: 1 }))
      : format(focusDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  const periodLabel =
    view === 'day'
      ? format(focusDate, "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())
      : view === 'week'
      ? (() => {
          const ws = startOfWeek(focusDate, { weekStartsOn: 1 })
          const we = endOfWeek(focusDate, { weekStartsOn: 1 })
          return `${format(ws, "d MMM", { locale: es })} – ${format(we, "d MMM", { locale: es })}`
        })()
      : format(focusDate, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())

  const upcoming = events
    .filter(e => { try { return differenceInDays(parseISO(e.date), new Date()) >= 0 || isToday(parseISO(e.date)) } catch { return false } })
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const todayEvents = eventsForDay(events, new Date())
  const urgentCount = events.filter(e => {
    try { const d = differenceInDays(parseISO(e.date), new Date()); return d >= 0 && d <= 3 && e.priority === 'high' } catch { return false }
  }).length

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="space-y-4">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-green-800 to-green-700 rounded-2xl px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-base">{greeting}, docentes</p>
          <p className="text-green-200 text-sm mt-0.5">
            {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
          </p>
        </div>
        {urgentCount > 0 && (
          <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
            <AlertCircle size={15} className="text-white" />
            <span className="text-white text-sm font-medium">{urgentCount} urgente{urgentCount > 1 ? 's' : ''} hoy</span>
          </div>
        )}
      </div>

      {/* Main two-panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

        {/* LEFT — Calendar */}
        <div className="lg:col-span-3 space-y-3">
          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
              <ViewBtn active={view === 'day'} onClick={() => setView('day')} icon={<Sun size={13} />} label="Día" />
              <ViewBtn active={view === 'week'} onClick={() => setView('week')} icon={<CalendarDays size={13} />} label="Semana" />
              <ViewBtn active={view === 'month'} onClick={() => setView('month')} icon={<CalendarRange size={13} />} label="Mes" />
            </div>

            {/* Period label */}
            <span className="flex-1 text-sm font-medium text-slate-600 hidden sm:block truncate">{periodLabel}</span>

            {/* Navigation */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => { setFocusDate(new Date()) }}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors ${
                  isCurrentPeriod ? 'bg-green-700 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Hoy
              </button>
              <button onClick={() => nav(-1)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <ChevronLeft size={14} className="text-slate-500" />
              </button>
              <button onClick={() => nav(1)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <ChevronRight size={14} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Calendar content */}
          {view === 'day' && (
            <DayView
              date={focusDate}
              events={eventsForDay(events, focusDate)}
            />
          )}
          {view === 'week' && (
            <WeekView
              focusDate={focusDate}
              events={events}
              onOpenModal={setModalEvent}
              onDayClick={(day) => { setFocusDate(day); setView('day') }}
            />
          )}
          {view === 'month' && (
            <MonthView
              focusDate={focusDate}
              events={events}
              onDayClick={(day) => { setFocusDate(day); setView('day') }}
            />
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_STYLES).map(([key, s]) => (
              <div key={key} className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${s.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                <span className={`text-[11px] font-medium ${s.text}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Upcoming */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Próximas fechas</h3>
              {upcoming.length > 0 && (
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {upcoming.length}
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-50 max-h-[620px] overflow-y-auto">
              {upcoming.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-12">Sin eventos próximos</p>
              )}
              {upcoming.map(event => {
                const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academico
                const rel = relDate(event.date)
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => {
                      try { setFocusDate(parseISO(event.date)); setView('day') } catch {}
                    }}
                  >
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${rel.chip}`}>
                      {rel.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{event.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                    {event.priority === 'high' && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Alta prioridad" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalEvent && (
        <EventModal
          event={modalEvent}
          onClose={() => setModalEvent(null)}
        />
      )}
    </div>
  )
}

/* ─── Day View ─────────────────────────────────── */
function DayView({ date, events }) {
  const past = isPast(date) && !isToday(date)
  const high = events.filter(e => e.priority === 'high')
  const others = events.filter(e => e.priority !== 'high')

  return (
    <div className="space-y-3">
      {/* Day header */}
      <div className={`rounded-2xl px-5 py-4 flex items-center justify-between ${
        isToday(date) ? 'bg-green-700' : past ? 'bg-slate-200' : 'bg-white border border-slate-200'
      }`}>
        <div>
          <p className={`text-4xl font-extrabold ${isToday(date) ? 'text-white' : past ? 'text-slate-400' : 'text-slate-800'}`}>
            {format(date, 'd')}
          </p>
          <p className={`text-sm mt-0.5 ${isToday(date) ? 'text-green-200' : 'text-slate-400'}`}>
            {format(date, "EEEE · MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
          </p>
        </div>
        <div className="text-right">
          {isToday(date) && <span className="text-xs bg-white/20 text-white font-semibold px-3 py-1 rounded-full">Hoy</span>}
          <p className={`text-sm mt-2 ${isToday(date) ? 'text-green-200' : 'text-slate-400'}`}>
            {events.length === 0 ? 'Sin eventos' : `${events.length} evento${events.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* High priority */}
      {high.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            Alta prioridad
          </p>
          <div className="space-y-2">
            {high.map(e => <DayCard key={e.id} event={e} />)}
          </div>
        </div>
      )}

      {/* Others */}
      {others.length > 0 && (
        <div>
          {high.length > 0 && (
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5 mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
              Otros eventos
            </p>
          )}
          <div className="space-y-2">
            {others.map(e => <DayCard key={e.id} event={e} />)}
          </div>
        </div>
      )}

      {/* Empty */}
      {events.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 py-12 flex flex-col items-center gap-2 text-slate-400">
          <span className="text-3xl">✓</span>
          <p className="font-medium text-slate-500 text-sm">Sin eventos para este día</p>
        </div>
      )}
    </div>
  )
}

function DayCard({ event }) {
  const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academico
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 border-l-4" style={{ borderLeftColor: style.accent }}>
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
        {event.priority === 'high' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">⚠ Alta</span>}
      </div>
      <p className="text-sm font-bold text-slate-800">{event.title}</p>
      {event.description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{event.description}</p>}
    </div>
  )
}

/* ─── Week View ─────────────────────────────────── */
function WeekView({ focusDate, events, onOpenModal, onDayClick }) {
  const weekStart = startOfWeek(focusDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[560px]">
          {days.map((day, i) => {
            const dayEvts = eventsForDay(events, day)
            const today = isToday(day)
            const past = isPast(day) && !today
            return (
              <div key={i} className={`border-r border-slate-100 last:border-r-0 min-h-[220px] flex flex-col ${
                today ? 'bg-green-50/60' : past ? 'bg-slate-50/70' : 'bg-white'
              }`}>
                <button
                  onClick={() => onDayClick(day)}
                  className={`p-2.5 pb-2 border-b text-left hover:opacity-75 transition-opacity ${today ? 'border-green-200' : 'border-slate-100'}`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${today ? 'text-green-600' : past ? 'text-slate-300' : 'text-slate-400'}`}>
                    {DAY_LABELS[i]}
                  </p>
                  <div className={`mt-1 w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                    today ? 'bg-green-700 text-white' : past ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </button>
                <div className="p-1.5 flex flex-col gap-1 flex-1">
                  {dayEvts.map(event => {
                    const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academico
                    return (
                      <button
                        key={event.id}
                        onClick={() => onOpenModal(event)}
                        className={`w-full text-left px-1.5 py-1 rounded-lg border-l-[3px] ${style.light} hover:opacity-75 transition-opacity`}
                        style={{ borderLeftColor: style.accent }}
                      >
                        <p className={`text-[10px] font-semibold leading-tight ${style.text} ${past ? 'opacity-50' : ''}`}>{event.title}</p>
                        {event.priority === 'high' && <p className="text-[9px] text-red-500 font-medium">● Alta</p>}
                      </button>
                    )
                  })}
                  {dayEvts.length === 0 && <p className="text-[10px] text-slate-200 text-center mt-3">—</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Month View ─────────────────────────────────── */
function MonthView({ focusDate, events, onDayClick }) {
  const gridStart = startOfWeek(startOfMonth(focusDate), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(focusDate), { weekStartsOn: 1 })
  const cells = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAY_LABELS.map(d => (
          <div key={d} className="py-2.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const dayEvts = eventsForDay(events, day)
          const today = isToday(day)
          const inMonth = isSameMonth(day, focusDate)
          const past = isPast(day) && !today
          const shown = dayEvts.slice(0, 2)
          const extra = dayEvts.length - 2
          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`min-h-[80px] p-1.5 border-r border-b border-slate-100 last:border-r-0 text-left transition-colors ${
                today ? 'bg-green-50' : inMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/40 hover:bg-slate-100/60'
              }`}
            >
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${
                today ? 'bg-green-700 text-white' : inMonth ? (past ? 'text-slate-300' : 'text-slate-700') : 'text-slate-300'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {shown.map(event => {
                  const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academico
                  return (
                    <div key={event.id} className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate ${style.bg} ${style.text}`}>
                      {event.title}
                    </div>
                  )
                })}
                {extra > 0 && <p className="text-[9px] text-slate-400 font-medium px-1">+{extra}</p>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Modal ─────────────────────────────────────── */
function EventModal({ event, onClose }) {
  const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academico
  let date
  try { date = parseISO(event.date) } catch { date = new Date() }
  const past = isPast(date) && !isToday(date)
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>{style.label}</span>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} className="text-slate-400" /></button>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">{event.title}</h3>
          <div className="space-y-3">
            <p className="text-sm text-slate-500 flex items-center gap-2">
              📅 {format(date, "EEEE d 'de' MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
              {past && <span className="text-red-500 text-xs font-semibold bg-red-50 px-2 py-0.5 rounded-full">Vencido</span>}
              {isToday(date) && <span className="text-green-700 text-xs font-semibold bg-green-50 px-2 py-0.5 rounded-full">Hoy</span>}
            </p>
            {event.description && <p className="text-slate-600 text-sm bg-slate-50 rounded-xl p-3 leading-relaxed">{event.description}</p>}
            {event.priority === 'high' && <div className="text-red-600 bg-red-50 rounded-xl p-3 text-sm font-medium">⚠️ Alta prioridad — no olvidar</div>}
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function ViewBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}{label}
    </button>
  )
}
