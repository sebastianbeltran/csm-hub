import { useState, useMemo } from 'react'
import { format, parseISO, isToday, isFuture, isPast, compareAsc } from 'date-fns'
import { es } from 'date-fns/locale'
import { GraduationCap, Search, CheckCircle, XCircle, Clock, Plus, X, Trash2 } from 'lucide-react'

const GRADE_COLORS = {
  '9':  { bg: 'bg-sky-100',    text: 'text-sky-700'    },
  '10': { bg: 'bg-violet-100', text: 'text-violet-700' },
  '11': { bg: 'bg-amber-100',  text: 'text-amber-700'  },
}

const gradeColor = (grade = '') => {
  const key = grade.replace(/[^0-9]/g, '')
  return GRADE_COLORS[key] ?? { bg: 'bg-slate-100', text: 'text-slate-600' }
}

const attendanceBadge = (attended) => {
  if (attended === true)  return { label: 'Asistió',    cls: 'bg-green-100 text-green-700', icon: CheckCircle }
  if (attended === false) return { label: 'No asistió', cls: 'bg-red-100 text-red-600',     icon: XCircle    }
  return                         { label: 'Pendiente',  cls: 'bg-slate-100 text-slate-500', icon: Clock      }
}

const emptyForm = { studentName: '', grade: '', sessionDate: '', sessionTime: '', notes: '' }
const inp = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"

const canManage = (role) => role === 'counselor' || role === 'admin'

export default function CollegeCounselor({ sessions = [], role, onAdd, onDelete, onUpdateAttendance }) {
  const [filter,      setFilter]      = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [search,      setSearch]      = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState(emptyForm)
  const [saving,      setSaving]      = useState(false)
  const [success,     setSuccess]     = useState(false)

  const filtered = useMemo(() => {
    return sessions
      .filter(s => {
        if (gradeFilter !== 'all' && !s.grade.startsWith(gradeFilter)) return false
        if (search && !s.studentName.toLowerCase().includes(search.toLowerCase())) return false
        try {
          const d = parseISO(s.sessionDate)
          if (filter === 'today')    return isToday(d)
          if (filter === 'upcoming') return isFuture(d) && !isToday(d)
          if (filter === 'past')     return isPast(d) && !isToday(d)
        } catch { return true }
        return true
      })
      .sort((a, b) => {
        const d = compareAsc(parseISO(a.sessionDate), parseISO(b.sessionDate))
        return d !== 0 ? d : a.sessionTime.localeCompare(b.sessionTime)
      })
  }, [sessions, filter, gradeFilter, search])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(s => {
      if (!map[s.sessionDate]) map[s.sessionDate] = []
      map[s.sessionDate].push(s)
    })
    return Object.entries(map).sort(([a], [b]) => compareAsc(parseISO(a), parseISO(b)))
  }, [filtered])

  const todayCount    = sessions.filter(s => { try { return isToday(parseISO(s.sessionDate)) } catch { return false } }).length
  const pendingCount  = sessions.filter(s => s.attended === null || s.attended === undefined).length
  const attendedCount = sessions.filter(s => s.attended === true).length

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.studentName.trim() || !form.sessionDate || !form.sessionTime) return
    setSaving(true)
    const ok = await onAdd(form)
    setSaving(false)
    if (ok) {
      setForm(emptyForm)
      setShowForm(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Stats + add button */}
      <div className="flex items-center gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 flex-1 flex divide-x divide-slate-100">
          <StatCard label="Hoy"        value={todayCount}    accent="text-blue-600"  bg="bg-blue-50"   />
          <StatCard label="Pendientes" value={pendingCount}  accent="text-amber-600" bg="bg-amber-50"  />
          <StatCard label="Asistidas"  value={attendedCount} accent="text-green-700" bg="bg-green-50"  />
        </div>
        {canManage(role) && (
          <button
            onClick={() => setShowForm(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 shadow-sm ${
              showForm
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-green-700 text-white hover:bg-green-800'
            }`}
          >
            {showForm ? <><X size={15} /> Cerrar</> : <><Plus size={15} /> Nueva cita</>}
          </button>
        )}
      </div>

      {/* Add form — counselor/admin only */}
      {canManage(role) && showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Nueva cita</h3>
          <form onSubmit={handleAdd}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <input
                type="text" placeholder="Nombre de la estudiante" value={form.studentName}
                onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))}
                className={inp} required autoFocus
              />
              <input
                type="text" placeholder="Curso (ej: 10A)" value={form.grade}
                onChange={e => setForm(f => ({ ...f, grade: e.target.value.toUpperCase() }))}
                className={inp} required maxLength={4}
              />
              <input
                type="date" value={form.sessionDate}
                onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value }))}
                className={inp} required
              />
              <input
                type="time" value={form.sessionTime}
                onChange={e => setForm(f => ({ ...f, sessionTime: e.target.value }))}
                className={inp} required
              />
            </div>
            <div className="flex gap-3 items-end">
              <input
                type="text" placeholder="Notas (opcional)" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className={`${inp} flex-1`}
              />
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition-colors disabled:opacity-60 flex-shrink-0">
                <Plus size={14} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            {success && (
              <p className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold mt-3">
                <CheckCircle size={14} />Cita agregada
              </p>
            )}
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: 'all',      label: 'Todas'    },
            { id: 'today',    label: 'Hoy'      },
            { id: 'upcoming', label: 'Próximas' },
            { id: 'past',     label: 'Pasadas'  },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f.id ? 'bg-green-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap sm:ml-auto">
          {['all', '9', '10', '11'].map(g => (
            <button key={g} onClick={() => setGradeFilter(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                gradeFilter === g ? 'bg-green-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {g === 'all' ? 'Todos los grados' : `${g}°`}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" placeholder="Buscar estudiante..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {/* Sessions */}
      {grouped.length === 0 ? (
        <EmptyState canManage={canManage(role)} onAdd={() => setShowForm(true)} />
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, daySessions]) => (
            <DateGroup
              key={date}
              date={date}
              sessions={daySessions}
              canManage={canManage(role)}
              onDelete={onDelete}
              onUpdateAttendance={onUpdateAttendance}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DateGroup({ date, sessions, canManage, onDelete, onUpdateAttendance }) {
  let label = ''
  let isHighlight = false
  try {
    const d = parseISO(date)
    if (isToday(d)) { label = 'Hoy'; isHighlight = true }
    else label = format(d, "EEEE d 'de' MMMM", { locale: es })
    label = label.charAt(0).toUpperCase() + label.slice(1)
  } catch { label = date }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className={`px-5 py-3 border-b border-slate-100 flex items-center gap-2 ${isHighlight ? 'bg-green-50' : ''}`}>
        {isHighlight && <span className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />}
        <span className={`text-sm font-bold ${isHighlight ? 'text-green-800' : 'text-slate-700'}`}>{label}</span>
        <span className="ml-auto text-xs text-slate-400 font-medium">
          {sessions.length} {sessions.length === 1 ? 'cita' : 'citas'}
        </span>
      </div>
      <div className="divide-y divide-slate-50">
        {sessions.map(s => (
          <SessionRow
            key={s.id}
            session={s}
            canManage={canManage}
            onDelete={onDelete}
            onUpdateAttendance={onUpdateAttendance}
          />
        ))}
      </div>
    </div>
  )
}

function SessionRow({ session, canManage, onDelete, onUpdateAttendance }) {
  const badge     = attendanceBadge(session.attended)
  const BadgeIcon = badge.icon
  const grade     = gradeColor(session.grade)
  const time      = session.sessionTime?.slice(0, 5) ?? ''

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{session.studentName}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${grade.bg} ${grade.text}`}>
            {session.grade}°
          </span>
        </div>
        {session.notes && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{session.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-mono font-semibold text-slate-600">{time}</span>

        {canManage ? (
          /* Attendance toggle buttons */
          <div className="flex gap-1">
            <AttendBtn
              active={session.attended === true}
              onClick={() => onUpdateAttendance(session.id, session.attended === true ? null : true)}
              cls="text-green-700 hover:bg-green-50"
              icon={CheckCircle}
              title="Asistió"
            />
            <AttendBtn
              active={session.attended === false}
              onClick={() => onUpdateAttendance(session.id, session.attended === false ? null : false)}
              cls="text-red-500 hover:bg-red-50"
              icon={XCircle}
              title="No asistió"
            />
            <button
              onClick={() => onDelete(session.id)}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          /* Read-only badge */
          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
            <BadgeIcon size={12} />
            {badge.label}
          </span>
        )}
      </div>
    </div>
  )
}

function AttendBtn({ active, onClick, cls, icon: Icon, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${cls} ${active ? 'bg-current/10 ring-1 ring-current/30' : 'text-slate-300'}`}
    >
      <Icon size={15} />
    </button>
  )
}

function StatCard({ label, value, accent, bg }) {
  return (
    <div className="flex-1 flex items-center gap-3 px-5 py-4">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <span className={`text-base font-bold ${accent}`}>{value}</span>
      </div>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
    </div>
  )
}

function EmptyState({ canManage, onAdd }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
      <GraduationCap size={32} className="mx-auto text-slate-300 mb-3" />
      <p className="text-slate-500 font-medium text-sm">Sin citas programadas</p>
      {canManage ? (
        <button onClick={onAdd}
          className="mt-4 flex items-center gap-1.5 mx-auto px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors">
          <Plus size={14} /> Nueva cita
        </button>
      ) : (
        <p className="text-slate-400 text-xs mt-1">La counselor aún no ha cargado citas</p>
      )}
    </div>
  )
}
