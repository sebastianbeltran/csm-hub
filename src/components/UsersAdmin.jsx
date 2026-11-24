import { useState, useEffect, useCallback, useRef } from 'react'
import { Users, Search, Pencil, X, Save, CheckCircle, AlertCircle, UserCheck, RefreshCw } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { getSchoolGrades, gradeLabel } from '../lib/schoolGrades'
import { SCHOOL_ABBR } from '../lib/schoolTimetable'

const ROLE_OPTIONS = [
  { value: 'docente',   label: 'Docente'       },
  { value: 'director',  label: 'Director'      },
  { value: 'counselor', label: 'Counselor'     },
  { value: 'admin',     label: 'Administrador' },
]
const ROLE_LABEL = { ...Object.fromEntries(ROLE_OPTIONS.map(r => [r.value, r.label])), super_admin: 'Super admin' }

const FILTERS = [
  { value: 'all',      label: 'Todos'      },
  { value: 'pending',  label: 'Pendientes' },
  { value: 'active',   label: 'Activos'    },
  { value: 'inactive', label: 'Inactivos'  },
]

const inp = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500'

// Pendiente = se registró con Google pero aún no tiene escuela asignada
const isPending = (u) => !u.school_id
const initial   = (u) => (u.full_name || u.email || '?').trim().charAt(0).toUpperCase()
const fmtDate   = (iso) => { try { return format(parseISO(iso), "d MMM yyyy", { locale: es }) } catch { return '—' } }

export default function UsersAdmin({ onListUsers, onSaveUser, subjects, schools, schoolId, schoolSlug, isSuperAdmin, currentUserId }) {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(null)
  const [query,   setQuery]   = useState('')
  const [filter,  setFilter]  = useState('all')
  const [editing, setEditing] = useState(null)   // id del usuario abierto
  const [flash,   setFlash]   = useState(null)   // mensaje tras guardar
  const [others,  setOthers]  = useState(false)  // super_admin: incluir usuarios de otras escuelas

  // onListUsers cambia en cada render del store: se lee desde un ref para no recargar en bucle
  const listRef = useRef(onListUsers)
  useEffect(() => { listRef.current = onListUsers })

  const reload = useCallback(async () => {
    setLoading(true)
    const { users: list, error } = await listRef.current()
    setUsers(list)
    setLoadErr(error)
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload, schoolId])

  const pendingCount = users.filter(isPending).length
  const q = query.trim().toLowerCase()
  const visible = users
    .filter(u => u.inSchool || others)
    .filter(u => !q || (u.full_name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q))
    .filter(u =>
      filter === 'pending'  ? isPending(u) :
      filter === 'active'   ? !isPending(u) && u.active :
      filter === 'inactive' ? !isPending(u) && !u.active : true)
    // Pendientes primero, luego por nombre
    .sort((a, b) => (isPending(b) - isPending(a)) || (a.full_name ?? '').localeCompare(b.full_name ?? ''))

  const subjectLabel = (id) => subjects.find(s => s.id === id)?.label ?? null

  const canEdit = (u) => isSuperAdmin || (u.id !== currentUserId && u.role !== 'super_admin')

  const handleSave = async (payload) => {
    const res = await onSaveUser(payload)
    if (res !== true) return res
    setEditing(null)
    setFlash(payload.active ? 'Usuario guardado' : 'Usuario guardado (cuenta inactiva)')
    setTimeout(() => setFlash(null), 3000)
    reload()
    return true
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-green-700" />
            <h3 className="font-semibold text-slate-800 text-sm">Usuarios</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Los docentes se registran solos al entrar con Google. Aquí se activan y se les asigna escuela, rol y materias.
          </p>
        </div>
        <button onClick={reload} title="Actualizar"
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {pendingCount > 0 && filter !== 'pending' && (
        <button onClick={() => setFilter('pending')}
          className="w-full flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-100 text-amber-800 text-xs font-semibold hover:bg-amber-100 text-left">
          <UserCheck size={14} />
          {pendingCount === 1 ? '1 usuario espera activación' : `${pendingCount} usuarios esperan activación`} — ver pendientes
        </button>
      )}

      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre o correo"
            className={`${inp} pl-8`} />
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === f.value ? 'bg-white text-green-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              {f.label}{f.value === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {isSuperAdmin && (
        <label className="mx-5 mt-3 flex items-center gap-2 text-xs text-slate-500 cursor-pointer w-fit">
          <input type="checkbox" checked={others} onChange={e => setOthers(e.target.checked)} className="accent-green-700" />
          Mostrar también usuarios de otras escuelas (para asignarles materias de esta)
        </label>
      )}

      {flash && (
        <div className="mx-5 mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <CheckCircle size={14} /> {flash}
        </div>
      )}
      {loadErr && (
        <div className="mx-5 mt-3 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle size={14} /> No se pudieron cargar los usuarios: {loadErr}
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {!loading && visible.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">
            {users.length === 0 ? 'Todavía no hay usuarios en esta escuela.' : 'Ningún usuario coincide con la búsqueda.'}
          </p>
        )}
        {visible.map(u => (
          <div key={u.id}>
            <UserRow user={u} subjectLabel={subjectLabel} editable={canEdit(u)} isMe={u.id === currentUserId}
              schools={schools} schoolId={schoolId}
              open={editing === u.id} onToggle={() => setEditing(editing === u.id ? null : u.id)} />
            {editing === u.id && (
              <UserEditor
                user={u}
                subjects={subjects}
                schools={schools}
                schoolId={schoolId}
                schoolSlug={schoolSlug}
                isSuperAdmin={isSuperAdmin}
                onCancel={() => setEditing(null)}
                onSave={handleSave}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function UserRow({ user: u, subjectLabel, editable, isMe, open, onToggle, schools, schoolId }) {
  const pending = isPending(u)
  const labels  = u.subjectIds.map(subjectLabel).filter(Boolean)
  const abbr    = (id) => SCHOOL_ABBR[schools.find(s => s.id === id)?.slug] ?? '?'
  // Escuela principal (si no es la activa) y otras escuelas donde dicta
  const badges  = (u.schoolIds ?? []).filter(id => id !== schoolId)
    .map(id => ({ id, text: id === u.school_id ? `Principal: ${abbr(id)}` : `+${abbr(id)}` }))
  return (
    <div onClick={editable ? onToggle : undefined}
      className={`px-5 py-3 flex items-center gap-3 ${open ? 'bg-slate-50' : ''} ${editable ? 'cursor-pointer hover:bg-slate-50' : ''}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        pending ? 'bg-amber-100 text-amber-700' : u.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-400'}`}>
        {initial(u)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {u.full_name || '(sin nombre)'}{isMe && <span className="text-xs font-normal text-slate-400"> · tú</span>}
        </p>
        <p className="text-xs text-slate-400 truncate">
          {u.email}
          {badges.map(b => (
            <span key={b.id} className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold"
              title={schools.find(s => s.id === b.id)?.name}>{b.text}</span>
          ))}
        </p>
      </div>
      <div className="hidden md:block w-56 min-w-0">
        {labels.length > 0
          ? <p className="text-xs text-slate-500 truncate" title={labels.join(', ')}>{labels.length} materia{labels.length === 1 ? '' : 's'} · {labels.join(', ')}</p>
          : <p className="text-xs text-slate-300">Sin materias</p>}
      </div>
      <div className="hidden sm:block w-24 text-xs text-slate-400 text-right" title="Último acceso">
        {u.last_login ? fmtDate(u.last_login) : '—'}
      </div>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 w-24 text-center truncate">
        {ROLE_LABEL[u.role] ?? u.role}
      </span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-20 text-center ${
        pending ? 'bg-amber-100 text-amber-800' : u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
        {pending ? 'Pendiente' : u.active ? 'Activo' : 'Inactivo'}
      </span>
      <button onClick={e => { e.stopPropagation(); onToggle() }} disabled={!editable}
        title={editable ? '' : 'No puedes editar esta cuenta'}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-30 ${
          pending ? 'bg-green-700 text-white hover:bg-green-800' : 'text-slate-500 border border-slate-200 hover:bg-white'}`}>
        {open ? <X size={12} /> : pending ? <UserCheck size={12} /> : <Pencil size={12} />}
        {open ? 'Cerrar' : pending ? 'Activar' : 'Editar'}
      </button>
    </div>
  )
}

function UserEditor({ user, subjects, schools, schoolId, schoolSlug, isSuperAdmin, onCancel, onSave }) {
  const pending = isPending(user)
  // Rol, escuela principal y estado los cambia solo el admin de la escuela principal (o super_admin)
  const owns    = isSuperAdmin || pending || user.school_id === schoolId
  const ownIds  = new Set(subjects.map(s => s.id))   // materias de la escuela activa
  const [fullName,   setFullName]   = useState(user.full_name ?? '')
  const [role,       setRole]       = useState(user.role === 'super_admin' ? 'super_admin' : (user.role || 'docente'))
  // Pendiente → se asigna a la escuela activa y se activa por defecto
  const [userSchool, setUserSchool] = useState(user.school_id ?? schoolId ?? '')
  const [active,     setActive]     = useState(pending ? true : !!user.active)
  const [selected,   setSelected]   = useState(() => new Set(user.subjectIds.filter(id => ownIds.has(id))))
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  // Las materias que se asignan aquí son las de la escuela activa; las de otras escuelas no se tocan
  const activeSchoolName = schools.find(s => s.id === schoolId)?.name ?? 'esta escuela'
  const grades = getSchoolGrades(schoolSlug)
  const byGrade = grades
    .map(g => ({ grade: g, list: subjects.filter(s => s.grade === g) }))
    .filter(g => g.list.length > 0)

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const toggleGrade = (list) => setSelected(prev => {
    const next = new Set(prev)
    const all  = list.every(s => next.has(s.id))
    list.forEach(s => all ? next.delete(s.id) : next.add(s.id))
    return next
  })

  const deactivating = !pending && user.active && !active

  const submit = async () => {
    if (!userSchool && active) { setError('Asigna una escuela antes de activar la cuenta'); return }
    setSaving(true)
    setError(null)
    const res = await onSave({
      id: user.id,
      fullName,
      role,
      schoolId: userSchool || null,
      active,
      subjectIds: [...selected],
    })
    setSaving(false)
    if (res !== true) setError(res)
  }

  return (
    <div className="px-5 pb-5 pt-2 bg-slate-50 border-t border-slate-100 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</span>
          <input value={fullName} onChange={e => setFullName(e.target.value)} disabled={!owns} className={`${inp} mt-1 bg-white disabled:bg-slate-100`} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</span>
          <select value={role} onChange={e => setRole(e.target.value)} className={`${inp} mt-1 bg-white disabled:bg-slate-100`}
            disabled={role === 'super_admin' || !owns}>
            {role === 'super_admin' && <option value="super_admin">Super admin</option>}
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Escuela principal</span>
          {isSuperAdmin ? (
            <select value={userSchool} onChange={e => setUserSchool(e.target.value)} className={`${inp} mt-1 bg-white`}>
              <option value="">— Sin escuela —</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <p className="mt-1 px-3 py-2 text-sm text-slate-600">{schools.find(s => s.id === userSchool)?.name ?? '—'}</p>
          )}
        </label>
        <div className="block">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</span>
          <label className="mt-1 flex items-center gap-2 px-3 py-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} disabled={!owns} className="accent-green-700 w-4 h-4" />
            Cuenta activa
          </label>
        </div>
      </div>

      {!owns && (
        <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2">
          Su escuela principal es {schools.find(s => s.id === user.school_id)?.name ?? 'otra'}: allá se cambian su rol y su estado.
          Aquí solo asignas sus materias de {activeSchoolName}.
        </p>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Materias en {activeSchoolName}</span>
          <span className="text-xs text-slate-400">{selected.size} seleccionada{selected.size === 1 ? '' : 's'}</span>
        </div>
        {byGrade.length === 0 ? (
          <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2">
            Esta escuela aún no tiene materias. Créalas en la pestaña <strong>Materias</strong>.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {byGrade.map(({ grade, list }) => {
              const all = list.every(s => selected.has(s.id))
              return (
                <div key={grade} className="bg-white border border-slate-200 rounded-xl p-3">
                  <button onClick={() => toggleGrade(list)}
                    className="text-xs font-bold text-green-800 hover:underline mb-1.5">
                    {gradeLabel(grade)} {all ? '· quitar todas' : '· todas'}
                  </button>
                  <div className="space-y-1">
                    {list.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="accent-green-700" />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {deactivating && (
        <p className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <AlertCircle size={14} /> Al guardar, esta persona perderá el acceso a la app la próxima vez que la abra.
        </p>
      )}
      {error && (
        <p className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-white">Cancelar</button>
        <button onClick={submit} disabled={saving}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 ${
            deactivating ? 'bg-red-600 hover:bg-red-700' : 'bg-green-700 hover:bg-green-800'}`}>
          <Save size={14} /> {saving ? 'Guardando…' : deactivating ? 'Desactivar y guardar' : pending ? 'Activar' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
