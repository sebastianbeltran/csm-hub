import { Eye, School } from 'lucide-react'
import { PREVIEW_ROLES } from '../hooks/useAuth'

const ROLE_NAMES = {
  super_admin: 'Super admin',
  admin:       'Admin',
  director:    'Director',
  counselor:   'Counselor',
  docente:     'Docente',
}

// Barra visible solo para el super_admin: permite ver la app como la vería
// cada rol y elegir qué escuela administrar. Las vistas personales (Dashboard, Plan,
// Horario) siempre muestran todas las escuelas del usuario. No cambia los permisos reales.
export default function RoleSwitcher({ previewRole, onChangeRole, schools, schoolId, onChangeSchool }) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
          <Eye size={14} />
          Ver como
        </span>
        <div className="flex flex-wrap gap-1">
          {PREVIEW_ROLES.map(r => {
            const active = previewRole === r
            return (
              <button
                key={r}
                onClick={() => onChangeRole(r)}
                aria-pressed={active}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                {ROLE_NAMES[r]}
              </button>
            )
          })}
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
        <School size={14} />
        Administrar
        <select
          value={schoolId ?? ''}
          onChange={e => onChangeSchool(e.target.value)}
          className="ml-1 px-2 py-1 bg-white border border-amber-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {!schoolId && <option value="">Elegir escuela</option>}
          {schools.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
