import { useState, useRef, useCallback } from 'react'
import { Plus, Trash2, Calendar, BookOpen, Pencil, X, Eye, Upload, CheckCircle, AlertCircle, LogIn, ShieldAlert, Link2, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORY_STYLES } from '../data/constants'
import { parseVigilanciaExcel } from '../lib/parseVigilancias'
import { hostOf } from '../lib/links'
import seedLinks from '../data/enlaces.json'

const GRADES = ['9', '10', '11']
const PRIORITIES = [
  { value: 'high',   label: 'Alta'  },
  { value: 'medium', label: 'Media' },
  { value: 'low',    label: 'Baja'  },
]
const emptyEvent = { title: '', description: '', date: '', category: 'academico', priority: 'medium' }

export default function AdminPanel({ events, subjects, onAddEvent, onUpdateEvent, onDeleteEvent, onAddSubject, onDeleteSubject, onSaveVigilancias, onLoadVigilancias, links, onSaveLinks, role, onRequestLogin }) {
  if (!role) return <LoginRequired onRequestLogin={onRequestLogin} />
  if (role !== 'admin') return <AccessDenied />

  return (
    <AdminContent
      events={events} subjects={subjects}
      onAddEvent={onAddEvent} onUpdateEvent={onUpdateEvent} onDeleteEvent={onDeleteEvent}
      onAddSubject={onAddSubject} onDeleteSubject={onDeleteSubject}
      onSaveVigilancias={onSaveVigilancias} onLoadVigilancias={onLoadVigilancias}
      links={links} onSaveLinks={onSaveLinks}
    />
  )
}

/* ─── Auth gates ─────────────────────────────────────── */
function LoginRequired({ onRequestLogin }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <LogIn size={22} className="text-green-700" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Acceso restringido</h2>
        <p className="text-sm text-slate-400 mb-6">Inicia sesión con tu cuenta de administrador para continuar</p>
        <button onClick={onRequestLogin}
          className="w-full py-3 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition-colors">
          Iniciar sesión
        </button>
      </div>
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={22} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Sin permisos</h2>
        <p className="text-sm text-slate-400">Tu cuenta no tiene acceso al panel de administración.</p>
      </div>
    </div>
  )
}

/* ─── Admin Content ──────────────────────────────────── */
function AdminContent({ events, subjects, onAddEvent, onUpdateEvent, onDeleteEvent, onAddSubject, onDeleteSubject, onSaveVigilancias, onLoadVigilancias, links, onSaveLinks }) {
  const [tab, setTab] = useState('events')

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 w-fit max-w-full overflow-x-auto">
        <TabBtn active={tab === 'events'}      onClick={() => setTab('events')}      icon={<Calendar size={14} />} label="Calendario"  />
        <TabBtn active={tab === 'subjects'}    onClick={() => setTab('subjects')}    icon={<BookOpen size={14} />} label="Materias"    />
        <TabBtn active={tab === 'vigilancias'} onClick={() => setTab('vigilancias')} icon={<Eye size={14} />}      label="Vigilancias" />
        <TabBtn active={tab === 'enlaces'}     onClick={() => setTab('enlaces')}     icon={<Link2 size={14} />}    label="Enlaces"     />
      </div>

      {tab === 'events'      && <EventsTab events={events} onAdd={onAddEvent} onUpdate={onUpdateEvent} onDelete={onDeleteEvent} />}
      {tab === 'subjects'    && <SubjectsTab subjects={subjects} onAdd={onAddSubject} onDelete={onDeleteSubject} />}
      {tab === 'vigilancias' && <ViglanciasTab onSave={onSaveVigilancias} onLoad={onLoadVigilancias} />}
      {tab === 'enlaces'     && <EnlacesTab links={links} onSave={onSaveLinks} />}
    </div>
  )
}

/* ─── Events Tab ─────────────────────────────────────── */
function EventsTab({ events, onAdd, onUpdate, onDelete }) {
  const [form, setForm]           = useState(emptyEvent)
  const [editingId, setEditingId] = useState(null)
  const [success, setSuccess]     = useState(false)
  const descRef = useRef(null)

  const insertLink = useCallback(() => {
    const ta = descRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
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
        <Card title={editingId ? 'Editar evento' : 'Agregar evento'}
          icon={<Calendar size={15} className={editingId ? 'text-amber-500' : 'text-green-600'} />}>
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
                    title="Insertar enlace">
                    🔗 Enlace
                  </button>
                </div>
                <textarea ref={descRef} placeholder="Detalles adicionales. Pega una URL directamente o usa 🔗 para insertar [texto](url)"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className={`${inp} resize-none`} />
              </div>
            </Field>
            <div className="flex gap-2">
              {editingId && (
                <button type="button" onClick={cancelEdit}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                  <X size={15} /> Cancelar
                </button>
              )}
              <button type="submit"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-bold text-sm transition-colors ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-700 hover:bg-green-800'}`}>
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
                    <button onClick={() => startEdit(event)}
                      className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(event.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
  const [grade, setGrade]     = useState('9')
  const [label, setLabel]     = useState('')
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
            <button type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors">
              <Plus size={15} /> Agregar materia
            </button>
            {success && <p className="text-center text-emerald-600 text-sm font-semibold">✓ Materia agregada</p>}
          </form>
        </Card>
      </div>
      <div className="lg:col-span-3">
        <Card title="Materias por grado">
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
  const [status,      setStatus]      = useState(null)
  const [preview,     setPreview]     = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

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
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
          <p>Sube el Excel de vigilancias para actualizar los datos del dashboard.</p>
          <p className="text-xs text-slate-400">
            Debe incluir la tabla de vigilancias (DESCANSO / ALMUERZO) y las tablas de carros 🚗 y rutas 🚌, en la misma hoja o en hojas separadas.
          </p>
          {lastUpdated && (
            <p className="text-xs text-green-700 mt-2 font-medium">
              ✓ Última actualización:{' '}
              {format(new Date(lastUpdated), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
            </p>
          )}
        </div>

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
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={handleFile} disabled={status === 'parsing' || status === 'saving'} />
          </label>
        </div>

        {status?.error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{status.error}</p>
          </div>
        )}

        {status === 'ok' && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
            <CheckCircle size={16} className="text-green-600" />
            <p className="text-sm text-green-700 font-medium">Datos actualizados correctamente</p>
          </div>
        )}

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
            <div className="flex gap-2">
              <button onClick={handleCancel}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                <X size={15} /> Cancelar
              </button>
              <button onClick={handleSave} disabled={status === 'saving'}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition-colors disabled:opacity-60">
                {status === 'saving' ? 'Guardando...' : <><Upload size={15} /> Guardar en Supabase</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

/* ─── Enlaces Tab ────────────────────────────────────── */
const normalizeUrl = (u) => {
  const t = u.trim()
  return /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`
}
const isValidUrl = (u) => { try { return /^https?:$/.test(new URL(u).protocol) } catch { return false } }
const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

function EnlacesTab({ links, onSave }) {
  const [form, setForm]           = useState({ title: '', url: '' })
  const [editingId, setEditingId] = useState(null)
  const [status, setStatus]       = useState(null) // null | 'saving' | 'ok' | { error }

  const savedUrls = new Set(links.map(l => l.url))
  const pendingSeed = seedLinks.filter(l => !savedUrls.has(l.url))

  const persist = async (next, okMsg) => {
    setStatus('saving')
    const ok = await onSave(next)
    setStatus(ok ? { ok: okMsg } : { error: 'No se pudo guardar en Supabase. Revisa tu sesión e inténtalo de nuevo.' })
    if (ok) setTimeout(() => setStatus(null), 2500)
    return ok
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const title = form.title.trim()
    const url = normalizeUrl(form.url)
    if (!title || !form.url.trim()) return
    if (!isValidUrl(url)) { setStatus({ error: 'El enlace no parece válido. Ejemplo: https://forms.gle/...' }); return }
    const next = editingId
      ? links.map(l => l.id === editingId ? { ...l, title, url } : l)
      : [...links, { id: newId(), title, url }]
    if (await persist(next, editingId ? 'Enlace actualizado' : 'Enlace agregado')) {
      setForm({ title: '', url: '' })
      setEditingId(null)
    }
  }

  const startEdit = (l) => { setEditingId(l.id); setForm({ title: l.title, url: l.url }); setStatus(null) }
  const cancelEdit = () => { setEditingId(null); setForm({ title: '', url: '' }) }

  const remove = (l) => {
    if (editingId === l.id) cancelEdit()
    persist(links.filter(x => x.id !== l.id), 'Enlace eliminado')
  }

  const move = (idx, dir) => {
    const j = idx + dir
    if (j < 0 || j >= links.length) return
    const next = [...links]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    persist(next, 'Orden actualizado')
  }

  const busy = status === 'saving'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2">
        <Card title={editingId ? 'Editar enlace' : 'Nuevo enlace'} icon={<Link2 size={15} className="text-green-600" />}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Título">
              <input className={inp} value={form.title} placeholder="Ej. Reporte de alimentación"
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </Field>
            <Field label="Enlace">
              <input className={inp} value={form.url} placeholder="https://..." inputMode="url"
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </Field>
            <div className="flex gap-2">
              {editingId && (
                <button type="button" onClick={cancelEdit}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                  <X size={15} /> Cancelar
                </button>
              )}
              <button type="submit" disabled={busy || !form.title.trim() || !form.url.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition-colors disabled:opacity-50">
                {editingId ? <><CheckCircle size={15} /> Guardar cambios</> : <><Plus size={15} /> Agregar enlace</>}
              </button>
            </div>

            {status?.error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{status.error}</p>
              </div>
            )}
            {status?.ok && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-sm text-green-700 font-medium">{status.ok}</p>
              </div>
            )}
          </form>
        </Card>
      </div>

      <div className="lg:col-span-3 space-y-3">
        {pendingSeed.length > 0 && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm text-amber-700">
              Hay {pendingSeed.length} enlace{pendingSeed.length > 1 ? 's' : ''} nuevo{pendingSeed.length > 1 ? 's' : ''} preparado{pendingSeed.length > 1 ? 's' : ''} desde el código.
            </p>
            <button onClick={() => persist([...links, ...pendingSeed], 'Enlaces importados')} disabled={busy}
              className="flex-shrink-0 px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors disabled:opacity-50">
              Importar
            </button>
          </div>
        )}

        <Card title={`Enlaces publicados (${links.length})`} icon={<ExternalLink size={15} className="text-green-600" />}>
          {links.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aún no hay enlaces.</p>
          ) : (
            <ul className="divide-y divide-slate-100 -my-2">
              {links.map((l, i) => (
                <li key={l.id} className={`flex items-center gap-2 py-2.5 ${editingId === l.id ? 'bg-green-50 -mx-2 px-2 rounded-xl' : ''}`}>
                  <div className="flex flex-col">
                    <button onClick={() => move(i, -1)} disabled={busy || i === 0} title="Subir"
                      className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300"><ArrowUp size={13} /></button>
                    <button onClick={() => move(i, 1)} disabled={busy || i === links.length - 1} title="Bajar"
                      className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300"><ArrowDown size={13} /></button>
                  </div>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 group">
                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-green-700">{l.title}</p>
                    <p className="text-xs text-slate-400 truncate">{hostOf(l.url)}</p>
                  </a>
                  <button onClick={() => startEdit(l)} disabled={busy} title="Editar"
                    className="p-2 text-slate-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => remove(l)} disabled={busy} title="Eliminar"
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
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
