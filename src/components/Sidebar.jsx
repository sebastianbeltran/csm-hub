import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, GraduationCap, Link2, LogOut, Settings, CalendarClock } from 'lucide-react'

const ROLE_LABELS = {
  super_admin: { label: 'Super admin',   cls: 'bg-amber-900 text-amber-300'  },
  admin:       { label: 'Administrador', cls: 'bg-green-900 text-green-300'  },
  director:    { label: 'Director',      cls: 'bg-violet-900 text-violet-300' },
  counselor:   { label: 'Counselor',     cls: 'bg-sky-900 text-sky-300'      },
  docente:     { label: 'Docente',       cls: 'bg-slate-700 text-slate-300'  },
}

const NAV = [
  { path: '/',           label: 'Dashboard',            icon: LayoutDashboard },
  { path: '/horario',    label: '¿Cómo va mi horario?', icon: CalendarClock   },
  { path: '/planes',     label: 'Plan Semanal',         icon: BookOpen        },
  { path: '/counseling', label: 'College Counseling',   icon: GraduationCap,  feature: 'counseling' },
  { path: '/enlaces',    label: 'Enlaces de interés',   icon: Link2           },
  { path: '/admin',      label: 'Administración',       icon: Settings,       roles: ['admin', 'super_admin', 'director'] },
]

export default function Sidebar({ isOpen, onClose, role, features = {}, fullName, onLogout }) {
  const { pathname } = useLocation()

  const isActive = (path) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-30 w-64 bg-green-950 text-white flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <img src="/csm-logo.png" alt="CSM" className="h-9 w-auto object-contain flex-shrink-0" />
            <div>
              <p className="font-bold text-white text-base leading-tight">Hub Docente</p>
              <p className="text-slate-400 text-xs">Colegio Santa María</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV
            .filter(item =>
              (!item.roles || item.roles.includes(role)) &&
              (!item.feature || features[item.feature])
            )
            .map(({ path, label, icon: Icon }) => {
              const active = isActive(path)
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={onClose}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-150
                    ${active
                      ? 'bg-green-700 text-white shadow-lg shadow-green-900/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.07]'
                    }
                  `}
                >
                  <Icon size={17} />
                  {label}
                </Link>
              )
            })
          }
        </nav>

        {/* Usuario */}
        <div className="p-4 border-t border-white/[0.07]">
          {role ? (
            <LoggedIn role={role} fullName={fullName} onLogout={onLogout} />
          ) : null}
        </div>
      </aside>
    </>
  )
}

function LoggedIn({ role, fullName, onLogout }) {
  const roleInfo = ROLE_LABELS[role] ?? ROLE_LABELS.docente

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
          {(fullName || '?').trim().charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {fullName && <p className="text-xs font-semibold text-white truncate">{fullName}</p>}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleInfo.cls}`}>
            {roleInfo.label}
          </span>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-white hover:bg-white/[0.07] transition-all duration-150"
      >
        <LogOut size={14} />
        Cerrar sesión
      </button>
    </div>
  )
}
