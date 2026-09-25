import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, Trash2, CalendarDays, CalendarRange, Sun } from 'lucide-react'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths,
  format, isToday, isPast, isSameDay, isSameMonth, parseISO,
  eachDayOfInterval, differenceInDays,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORY_STYLES } from '../data/constants'

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function eventsForDay(events, day) {
  return events
    .filter(e => { try { return isSameDay(parseISO(e.date), day) } catch { return false } })
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
}

export default function WeeklyCalendar({ events, onDelete }) {
  const [view, setView] = useState('day')
  const [focusDate, setFocusDate] = useState(new Date())
  const [modalEvent, setModalEvent] = useState(null)

  const goToday = () => setFocusDate(new Date())
  const isCurrentPeriod =
    view === 'day' ? isToday(focusDate)
    : view === 'week' ? isSameDay(startOfWeek(focusDate, { weekStartsOn: 1 }), startOfWeek(new Date(), { weekStartsOn: 1 }))
    : format(focusDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  const nav = (dir) => {
    if (view === 'day') setFocusDate(d => addDays(d, dir))
    else if (view === 'week') setFocusDate(d => addWeeks(d, dir))
    else setFocusDate(d => addMonths(d, dir))
  }

  const periodLabel =
    view === 'day'
      ? format(focusDate, "EEEE d 'de' MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())
      : view === 'week'
      ? (() => {
          const ws = startOfWeek(focusDate, { weekStartsOn: 1 })
          const we = endOfWeek(focusDate, { weekStartsOn: 1 })
          return `${format(ws, "d MMM", { locale: es })} – ${format(we, "d MMM yyyy", { locale: es })}`
        })()
      : format(focusDate, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* View toggle */}
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 w-fit">
          <ViewBtn active={view === 'day'} onClick={() => setView('day')} icon={<Sun size={14} />} label="Día" />
          <ViewBtn active={view === 'week'} onClick={() => setView('week')} icon={<CalendarDays size={14} />} label="Semana" />
          <ViewBtn active={view === 'month'} onClick={() => setView('month')} icon={<CalendarRange size={14} />} label="Mes" />
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 font-medium hidden sm:block">{periodLabel}</span>
          <button
            onClick={goToday}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              isCurrentPeriod ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Hoy
          </button>
          <button onClick={() => nav(-1)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ChevronLeft size={15} className="text-slate-600" />
          </button>
          <button onClick={() => nav(1)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ChevronRight size={15} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Mobile period label */}
      <p className="text-slate-500 text-sm font-medium sm:hidden">{periodLabel}</p>

      {/* Views */}
      {view === 'day' && (
        <DayView
          date={focusDate}
          events={eventsForDay(events, focusDate)}
          onOpenModal={setModalEvent}
          onDelete={onDelete}
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
      <div className="flex flex-wrap gap-2 pt-1">
        {Object.entries(CATEGORY_STYLES).map(([key, s]) => (
          <div key={key} className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${s.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {modalEvent && (
        <EventModal
          event={modalEvent}
          onClose={() => setModalEvent(null)}
          onDelete={(id) => { onDelete(id); setModalEvent(null) }}
        />
      )}
    </div>
  )
}

/* ─── Day View ─────────────────────────────────────────── */
function DayView({ date, events, onOpenModal, onDelete }) {
  const past = isPast(date) && !isToday(date)
  const highPriority = events.filter(e => e.priority === 'high')
  const others = events.filter(e => e.priority !== 'high')

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className={`rounded-2xl p-5 flex items-center justify-between ${
        isToday(date) ? 'bg-indigo-600 text-white' : past ? 'bg-slate-200 text-slate-500' : 'bg-white border border-slate-200 text-slate-800'
      }`}>
        <div>
          <p className={`text-3xl font-bold ${isToday(date) ? 'text-white' : ''}`}>{format(date, 'd')}</p>
          <p className={`text-sm mt-0.5 ${isToday(date) ? 'text-indigo-200' : 'text-slate-500'}`}>
            {format(date, "EEEE", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
            {' · '}
            {format(date, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
          </p>
        </div>
        <div className="text-right">
          {isToday(date) && (
            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">Hoy</span>
          )}
          <p className={`text-sm mt-2 ${isToday(date) ? 'text-indigo-200' : 'text-slate-400'}`}>
            {events.length === 0 ? 'Sin eventos' : `${events.length} evento${events.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* High priority */}
      {highPriority.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Alta prioridad</p>
          </div>
          <div className="space-y-3">
            {highPriority.map(e => <DayEventCard key={e.id} event={e} onDelete={onDelete} />)}
          </div>
        </div>
      )}

      {/* Other events */}
      {others.length > 0 && (
        <div>
          {highPriority.length > 0 && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Otros eventos</p>
            </div>
          )}
          <div className="space-y-3">
            {others.map(e => <DayEventCard key={e.id} event={e} onDelete={onDelete} />)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {events.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center gap-3 text-slate-400">
          <span className="text-4xl">✓</span>
          <p className="font-medium text-slate-500">Sin eventos para este día</p>
          <p className="text-sm">Puedes agregar eventos desde el panel de administración</p>
        </div>
      )}
    </div>
  )
}

function DayEventCard({ event, onDelete }) {
  const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academico
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 border-l-4`} style={{ borderLeftColor: style.accent }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
            {event.priority === 'high' && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">⚠ Alta prioridad</span>
            )}
          </div>
          <p className="text-base font-bold text-slate-800">{event.title}</p>
          {event.description && (
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{event.description}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(event.id)}
          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

/* ─── Week View ─────────────────────────────────────────── */
function WeekView({ focusDate, events, onOpenModal, onDayClick }) {
  const weekStart = startOfWeek(focusDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[700px]">
          {days.map((day, i) => {
            const dayEvents = eventsForDay(events, day)
            const today = isToday(day)
            const past = isPast(day) && !today

            return (
              <div key={i} className={`border-r border-slate-100 last:border-r-0 min-h-[260px] flex flex-col ${
                today ? 'bg-indigo-50/60' : past ? 'bg-slate-50/70' : 'bg-white'
              }`}>
                <button
                  onClick={() => onDayClick(day)}
                  className={`p-3 pb-2 border-b text-left hover:opacity-80 transition-opacity ${today ? 'border-indigo-200' : 'border-slate-100'}`}
                >
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                    today ? 'text-indigo-500' : past ? 'text-slate-300' : 'text-slate-400'
                  }`}>{DAY_LABELS[i]}</p>
                  <div className={`mt-1.5 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                    today ? 'bg-indigo-600 text-white' : past ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </button>
                <div className="p-2 flex flex-col gap-1.5 flex-1">
                  {dayEvents.map(event => {
                    const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academico
                    return (
                      <button
                        key={event.id}
                        onClick={() => onOpenModal(event)}
                        className={`w-full text-left p-2 rounded-lg border-l-4 ${style.light} hover:opacity-75 transition-opacity`}
                        style={{ borderLeftColor: style.accent }}
                      >
                        <p className={`text-[11px] font-semibold leading-tight ${style.text} ${past ? 'opacity-50' : ''}`}>
                          {event.title}
                        </p>
                        {event.priority === 'high' && (
                          <p className="text-[10px] text-red-500 font-medium mt-0.5">● Alta prioridad</p>
                        )}
                      </button>
                    )
                  })}
                  {dayEvents.length === 0 && (
                    <p className="text-[11px] text-slate-200 text-center mt-4">—</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Month View ─────────────────────────────────────────── */
function MonthView({ focusDate, events, onDayClick }) {
  const monthStart = startOfMonth(focusDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(focusDate), { weekStartsOn: 1 })
  const cells = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAY_LABELS.map(d => (
          <div key={d} className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const dayEvents = eventsForDay(events, day)
          const today = isToday(day)
          const inMonth = isSameMonth(day, focusDate)
          const past = isPast(day) && !today
          const shown = dayEvents.slice(0, 3)
          const extra = dayEvents.length - 3

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`min-h-[90px] p-2 border-r border-b border-slate-100 last:border-r-0 text-left transition-colors
                ${today ? 'bg-indigo-50' : inMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/50'}
              `}
            >
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${
                today ? 'bg-indigo-600 text-white' : inMonth ? (past ? 'text-slate-300' : 'text-slate-700') : 'text-slate-300'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {shown.map(event => {
                  const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academico
                  return (
                    <div
                      key={event.id}
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${style.bg} ${style.text}`}
                    >
                      {event.title}
                    </div>
                  )
                })}
                {extra > 0 && (
                  <p className="text-[10px] text-slate-400 font-medium px-1">+{extra} más</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Event Modal ───────────────────────────────────────── */
function EventModal({ event, onClose, onDelete }) {
  const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academico
  let date
  try { date = parseISO(event.date) } catch { date = new Date() }
  const past = isPast(date) && !isToday(date)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
              {style.label}
            </span>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">{event.title}</h3>
          <div className="space-y-3">
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <span>📅</span>
              {format(date, "EEEE d 'de' MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
              {past && <span className="text-red-500 text-xs font-semibold bg-red-50 px-2 py-0.5 rounded-full">Vencido</span>}
              {isToday(date) && <span className="text-indigo-600 text-xs font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">Hoy</span>}
            </p>
            {event.description && (
              <p className="text-slate-600 text-sm bg-slate-50 rounded-xl p-3 leading-relaxed">{event.description}</p>
            )}
            {event.priority === 'high' && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-sm font-medium">
                ⚠️ Alta prioridad — no olvidar
              </div>
            )}
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end">
          <button
            onClick={() => onDelete(event.id)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <Trash2 size={14} /> Eliminar evento
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}{label}
    </button>
  )
}
