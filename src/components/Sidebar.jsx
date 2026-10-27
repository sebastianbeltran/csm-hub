import { LayoutDashboard, BookOpen, GraduationCap, LogIn, LogOut, ShieldCheck } from 'lucide-react'

const ROLE_LABELS = {
  admin:     { label: 'Administrador', cls: 'bg-green-900 text-green-300'  },
  counselor: { label: 'Counselor',     cls: 'bg-sky-900 text-sky-300'      },
  docente:   { label: 'Docente',       cls: 'bg-slate-700 text-slate-300'  },
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'plans',     label: 'Plan Semanal',       icon: BookOpen        },
  { id: 'counselor', label: 'College Counseling', icon: GraduationCap   },
]

export default function Sidebar({ activeView, onNavigate, isOpen, onClose, role, fullName, onLogin, onLogout }) {
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
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = activeView === id
            return (
              <button
                key={id}
                onClick={() => { onNavigate(id); onClose() }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 text-left
                  ${active
                    ? 'bg-green-700 text-white shadow-lg shadow-green-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.07]'
                  }
                `}
              >
                <Icon size={17} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Auth section */}
        <div className="p-4 border-t border-white/[0.07] space-y-3">
          {role ? (
            <LoggedIn role={role} fullName={fullName} onLogout={onLogout} />
          ) : (
            <button
              onClick={onLogin}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.07] transition-all duration-150"
            >
              <LogIn size={16} />
              Iniciar sesión
            </button>
          )}
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
        <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={14} className="text-white" />
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
