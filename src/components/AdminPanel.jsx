import { useState } from 'react'
import { Plus, Trash2, Calendar, BookOpen, Lock, Pencil, X } from 'lucide-react'
import { CATEGORY_STYLES } from '../data/constants'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Cambiar esta contraseña ────────────────────────────
const ADMIN_PASSWORD = 'CSM2026'
// ────────────────────────────────────────────────────────

const GRADES = ['9', '10', '11']
const PRIORITIES = [
  { value: 'high',   label: 'Alta'  },
  { value: 'medium', label: 'Media' },
  { value: 'low',    label: 'Baja'  },
]
const emptyEvent = { title: '', description: '', date: '', category: 'academico', priority: 'medium' }

export default function AdminPanel({ events, subjects, onAddEvent, onUpdateEvent, onDeleteEvent, onAddSubject, onDeleteSubject }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('csm_admin') === 'true'
  )

  const unlock = () => {
    setUnlocked(true)
    sessionStorage.setItem('csm_admin', 'true')
  }

  if (!unlocked) return <PasswordGate onUnlock={unlock} />

  return <AdminContent
    events={events} subjects={subjects}
    onAddEvent={onAddEvent} onUpdateEvent={onUpdateEvent} onDeleteEvent={onDeleteEvent}
    onAddSubject={onAddSubject} onDeleteSubject={onDeleteSubject}
  />
}

/* ─── Password Gate ─────────────────────────────────── */
function PasswordGate({ onUnlock }) {
  const [pwd, setPwd]     = useState('')
  const [error, setError] = useState(false)

  const handle = (e) => {
    e.preventDefault()
    if (pwd === ADMIN_PASSWORD) {
      onUnlock()
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock size={22} className="text-indigo-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Panel de administración</h2>
        <p className="text-sm text-slate-400 mb-6">Ingresa la contraseña para continuar</p>
        <form onSubmit={handle} className="space-y-3">
          <input
            type="password" value={pwd} onChange={e => setPwd(e.target.value)}
            placeholder="Contraseña"
            autoFocus
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center font-semibold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-red-500 text-sm font-medium">Contraseña incorrecta</p>}
          <button type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── Admin Content ──────────────────────────────────── */
function AdminContent({ events, subjects, onAddEvent, onUpdateEvent, onDeleteEvent, onAddSubject, onDeleteSubject }) {
  const [tab, setTab] = useState('events')

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 w-fit">
        <TabBtn active={tab === 'events'} onClick={() => setTab('events')} icon={<Calendar size={14} />} label="Calendario" />
        <TabBtn active={tab === 'subjects'} onClick={() => setTab('subjects')} icon={<BookOpen size={14} />} label="Materias" />
      </div>

      {tab === 'events'   && <EventsTab events={events} onAdd={onAddEvent} onUpdate={onUpdateEvent} onDelete={onDeleteEvent} />}
      {tab === 'subjects' && <SubjectsTab subjects={subjects} onAdd={onAddSubject} onDelete={onDeleteSubject} />}
    </div>
  )
}

/* ─── Events Tab ─────────────────────────────────────── */
function EventsTab({ events, onAdd, onUpdate, onDelete }) {
  const [form, setForm]         = useState(emptyEvent)
  const [editingId, setEditingId] = useState(null)
  const [success, setSuccess]   = useState(false)

  const startEdit = (event) => {
    setEditingId(event.id)
    setForm({ title: event.title, description: event.description || '', date: event.date, category: event.category, priority: event.priority })
  }

  const cancelEdit = () => { setEditingId(null); setForm(emptyEvent) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.date) return
    if (editingId) {
      onUpdate({ ...form, id: editingId })
      setEditingId(null)
    } else {
      onAdd({ ...form })
    }
    setForm(emptyEvent)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2">
        <Card
          title={editingId ? 'Editar evento' : 'Agregar evento'}
          icon={<Calendar size={15} className={editingId ? 'text-amber-500' : 'text-indigo-500'} />}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Título *">
              <input type="text" placeholder="Ej: Entrega de notas"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={inp} required />
            </Field>
            <Field label="Fecha *">
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={inp} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoría">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
                  {Object.entries(CATEGORY_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Prioridad">
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={inp}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Descripción">
              <textarea placeholder="Detalles adicionales" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} className={`${inp} resize-none`} />
            </Field>
            <div className="flex gap-2">
              {editingId && (
                <button type="button" onClick={cancelEdit} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                  <X size={15} /> Cancelar
                </button>
              )}
              <button type="submit" className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-bold text-sm transition-colors ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {editingId ? <><Pencil size={15} /> Guardar cambios</> : <><Plus size={15} /> Agregar evento</>}
              </button>
            </div>
            {success && <p className="text-center text-emerald-600 text-sm font-semibold">✓ {editingId ? 'Evento actualizado' : 'Evento agregado'}</p>}
          </form>
        </Card>
      </div>
      <div className="lg:col-span-3">
        <Card title={`Eventos (${events.length})`}>
          <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
            {events.length === 0 && <p className="text-center text-slate-400 text-sm py-10">Sin eventos</p>}
            {[...events].sort((a, b) => new Date(a.date) - new Date(b.date)).map(event => {
              const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academico
              let dl = ''
              try { dl = format(parseISO(event.date), "d MMM yyyy", { locale: es }) } catch {}
              return (
                <div key={event.id} className="flex items-center gap-3 py-3">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{event.title}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
                      <span className="text-xs text-slate-400">{dl}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(event)} className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(event.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ─── Subjects Tab ───────────────────────────────────── */
function SubjectsTab({ subjects, onAdd, onDelete }) {
  const [grade, setGrade]   = useState('9')
  const [label, setLabel]   = useState('')
  const [success, setSuccess] = useState(false)

  const gradeSubjects = subjects.filter(s => s.grade === grade)

  const handleAdd = (e) => {
    e.preventDefault()
    if (!label.trim()) return
    onAdd({ grade, label: label.trim() })
    setLabel('')
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2">
        <Card title="Agregar materia" icon={<BookOpen size={15} className="text-emerald-500" />}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Field label="Grado">
              <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
                {GRADES.map(g => (
                  <button key={g} type="button" onClick={() => setGrade(g)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      grade === g ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}>{g}°</button>
                ))}
              </div>
            </Field>
            <Field label="Nombre de la materia *">
              <input type="text" placeholder="Ej: Filosofía" value={label}
                onChange={e => setLabel(e.target.value)} className={inp} required />
            </Field>
            <button type="submit" className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors">
              <Plus size={15} /> Agregar materia
            </button>
            {success && <p className="text-center text-emerald-600 text-sm font-semibold">✓ Materia agregada</p>}
          </form>
        </Card>
      </div>
      <div className="lg:col-span-3">
        <Card title="Materias por grado">
          {/* Grade tabs */}
          <div className="flex gap-2 mb-4">
            {GRADES.map(g => (
              <button key={g} onClick={() => setGrade(g)}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold border-2 transition-all ${
                  grade === g ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-500 hover:border-indigo-300'
                }`}>{g}°</button>
            ))}
            <span className="ml-auto text-xs text-slate-400 self-center">{gradeSubjects.length} materias</span>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {gradeSubjects.length === 0 && <p className="text-center text-slate-400 text-sm py-8">Sin materias para {grade}°</p>}
            {gradeSubjects.map(s => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                <span className="text-sm text-slate-700 font-medium">{s.label}</span>
                <button onClick={() => onDelete(s.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ─── Shared ─────────────────────────────────────────── */
const inp = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Card({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
        active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}>
      {icon}{label}
    </button>
  )
}
