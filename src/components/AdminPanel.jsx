import { useState, useRef, useCallback } from 'react'
import { Plus, Trash2, Calendar, BookOpen, Lock, Pencil, X, Eye, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { CATEGORY_STYLES } from '../data/constants'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { parseVigilanciaExcel } from '../lib/parseVigilancias'

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

export default function AdminPanel({ events, subjects, onAddEvent, onUpdateEvent, onDeleteEvent, onAddSubject, onDeleteSubject, onSaveVigilancias, onLoadVigilancias }) {
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
    onSaveVigilancias={onSaveVigilancias} onLoadVigilancias={onLoadVigilancias}
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
        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock size={22} className="text-green-700" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Panel de administración</h2>
        <p className="text-sm text-slate-400 mb-6">Ingresa la contraseña para continuar</p>
        <form onSubmit={handle} className="space-y-3">
          <input
            type="password" value={pwd} onChange={e => setPwd(e.target.value)}
            placeholder="Contraseña"
            autoFocus
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center font-semibold tracking-widest focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          {error && <p className="text-red-500 text-sm font-medium">Contraseña incorrecta</p>}
          <button type="submit"
            className="w-full py-3 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition-colors">
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── Admin Content ──────────────────────────────────── */
function AdminContent({ events, subjects, onAddEvent, onUpdateEvent, onDeleteEvent, onAddSubject, onDeleteSubject, onSaveVigilancias, onLoadVigilancias }) {
  const [tab, setTab] = useState('events')

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 w-fit">
        <TabBtn active={tab === 'events'} onClick={() => setTab('events')} icon={<Calendar size={14} />} label="Calendario" />
        <TabBtn active={tab === 'subjects'} onClick={() => setTab('subjects')} icon={<BookOpen size={14} />} label="Materias" />
        <TabBtn active={tab === 'vigilancias'} onClick={() => setTab('vigilancias')} icon={<Eye size={14} />} label="Vigilancias" />
      </div>

      {tab === 'events'      && <EventsTab events={events} onAdd={onAddEvent} onUpdate={onUpdateEvent} onDelete={onDeleteEvent} />}
      {tab === 'subjects'    && <SubjectsTab subjects={subjects} onAdd={onAddSubject} onDelete={onDeleteSubject} />}
      {tab === 'vigilancias' && <ViglanciasTab onSave={onSaveVigilancias} onLoad={onLoadVigilancias} />}
    </div>
  )
}

/* ─── Events Tab ─────────────────────────────────────── */
function EventsTab({ events, onAdd, onUpdate, onDelete }) {
  const [form, setForm]         = useState(emptyEvent)
  const [editingId, setEditingId] = useState(null)
  const [success, setSuccess]   = useState(false)
  const descRef = useRef(null)

  const insertLink = useCallback(() => {
    const ta = descRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = form.description.slice(start, end)
    const snippet = selected ? `[${selected}](url)` : `[texto](url)`
    const next = form.description.slice(0, start) + snippet + form.description.slice(end)
    setForm(f => ({ ...f, description: next }))
    setTimeout(() => {
      ta.focus()
      const urlPos = start + (selected ? selected.length : 6) + 2
      ta.setSelectionRange(urlPos, urlPos + 3)
    }, 0)
  }, [form.description])

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
          icon={<Calendar size={15} className={editingId ? 'text-amber-500' : 'text-green-600'} />}
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
              <div className="space-y-1">
                <div className="flex gap-1">
                  <button type="button" onClick={insertLink}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Insertar enlace — selecciona texto primero o inserta plantilla">
                    🔗 Enlace
                  </button>
                </div>
                <textarea ref={descRef} placeholder="Detalles adicionales. Pega una URL directamente o usa 🔗 para insertar [texto](url)"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className={`${inp} resize-none`} />
              </div>
            </Field>
            <div className="flex gap-2">
              {editingId && (
                <button type="button" onClick={cancelEdit} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                  <X size={15} /> Cancelar
                </button>
              )}
              <button type="submit" className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-bold text-sm transition-colors ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-700 hover:bg-green-800'}`}>
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
                      grade === g ? 'bg-white text-green-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
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
                  grade === g ? 'bg-green-700 border-green-700 text-white' : 'border-slate-200 text-slate-500 hover:border-green-300'
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

/* ─── Vigilancias Tab ────────────────────────────────── */
function ViglanciasTab({ onSave, onLoad }) {
  const fileRef = useRef(null)
  const [status, setStatus] = useState(null) // null | 'parsing' | 'saving' | 'ok' | { error: string }
  const [preview, setPreview] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Cargar fecha de última actualización al montar
  useState(() => {
    onLoad?.().then(row => { if (row?.updated_at) setLastUpdated(row.updated_at) })
  })

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('parsing')
    setPreview(null)
    try {
      const buf = await file.arrayBuffer()
      const parsed = parseVigilanciaExcel(buf)
      setPreview(parsed)
      setStatus(null)
    } catch (err) {
      setStatus({ error: err.message })
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!preview) return
    setStatus('saving')
    const ok = await onSave(preview)
    if (ok) {
      setLastUpdated(new Date().toISOString())
      setStatus('ok')
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      setTimeout(() => setStatus(null), 3000)
    } else {
      setStatus({ error: 'Error al guardar en Supabase. Verifica la tabla vigilancias_config.' })
    }
  }

  const handleCancel = () => {
    setPreview(null)
    setStatus(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Card title="Actualizar datos de vigilancias" icon={<Eye size={15} className="text-green-600" />}>
      <div className="space-y-5">
        {/* Info */}
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
          <p>Sube el Excel de vigilancias para actualizar los datos del dashboard.</p>
          <p className="text-xs text-slate-400">
            El archivo debe tener las hojas <strong>"VIGILANCIAS HIGH 26-27"</strong> y{' '}
            <strong>" VIGILANCIAS HIGH 26-27"</strong> con el mismo formato que el original.
          </p>
          {lastUpdated && (
            <p className="text-xs text-green-700 mt-2 font-medium">
              ✓ Última actualización:{' '}
              {format(new Date(lastUpdated), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
            </p>
          )}
        </div>

        {/* File input */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Archivo Excel (.xlsx)
          </label>
          <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            status === 'parsing' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:border-green-400 hover:bg-green-50'
          }`}>
            <Upload size={18} className="text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-500">
              {status === 'parsing' ? 'Procesando...' : 'Seleccionar archivo'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
              disabled={status === 'parsing' || status === 'saving'}
            />
          </label>
        </div>

        {/* Error */}
        {status?.error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{status.error}</p>
          </div>
        )}

        {/* Success */}
        {status === 'ok' && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
            <CheckCircle size={16} className="text-green-600" />
            <p className="text-sm text-green-700 font-medium">Datos actualizados correctamente</p>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vista previa</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{preview.vigilancias.length}</p>
                <p className="text-xs text-amber-500 font-medium mt-0.5">Slots vigilancia</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{preview.carros.length}</p>
                <p className="text-xs text-blue-500 font-medium mt-0.5">Semanas carros</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{preview.rutas.length}</p>
                <p className="text-xs text-purple-500 font-medium mt-0.5">Semanas rutas</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-500 mb-2">Carros — primera semana:</p>
              {preview.carros[0] && (
                <div className="text-xs text-slate-600 space-y-0.5">
                  <p className="font-medium text-slate-800">{preview.carros[0].label}</p>
                  {['lunes','martes','miercoles','jueves','viernes'].map(d => (
                    <p key={d}><span className="text-slate-400 w-16 inline-block capitalize">{d}:</span> {preview.carros[0][d] || '—'}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                <X size={15} /> Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={status === 'saving'}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition-colors disabled:opacity-60"
              >
                {status === 'saving' ? 'Guardando...' : <><Upload size={15} /> Guardar en Supabase</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

/* ─── Shared ─────────────────────────────────────────── */
const inp = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"

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
        active ? 'bg-green-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}>
      {icon}{label}
    </button>
  )
}
