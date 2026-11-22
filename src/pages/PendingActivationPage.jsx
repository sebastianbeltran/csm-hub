import { Clock, LogOut } from 'lucide-react'

export default function PendingActivationPage({ onLogout }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3 justify-center">
          <img src="/csm-logo.png" alt="CSM" className="h-12 w-auto object-contain" />
          <div>
            <p className="font-bold text-slate-800 text-lg leading-tight">Hub Docente</p>
            <p className="text-slate-400 text-xs">Colegio Santa María</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-amber-600" />
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-2">Tu cuenta está siendo configurada</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            El administrador de tu sección activará tu cuenta en breve y te asignará tus materias.
          </p>
          <button
            onClick={onLogout}
            className="mt-6 flex items-center gap-2 mx-auto text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
