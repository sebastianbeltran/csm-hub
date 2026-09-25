import { LayoutDashboard, BookOpen } from 'lucide-react'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'plans',     label: 'Plan Semanal', icon: BookOpen },
]

export default function Sidebar({ activeView, onNavigate, isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-30 w-64 bg-slate-900 text-white flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        <div className="p-6 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-base leading-tight">Hub Docente</p>
              <p className="text-slate-400 text-xs">Colegio Santa María</p>
            </div>
          </div>
        </div>

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
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                `}
              >
                <Icon size={17} />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/60">
          <p className="text-slate-500 text-xs text-center">Hub v1.0</p>
        </div>
      </aside>
    </>
  )
}
