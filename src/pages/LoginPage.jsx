import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const err = await onLogin(email, password)
    setLoading(false)
    if (err) setError(err)
    // Si no hay error, useAuth actualiza `user` y App redirige automáticamente
  }

  const inp = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo + nombre */}
        <div className="flex items-center gap-3 justify-center">
          <img src="/csm-logo.png" alt="CSM" className="h-12 w-auto object-contain" />
          <div>
            <p className="font-bold text-slate-800 text-lg leading-tight">Hub Docente</p>
            <p className="text-slate-400 text-xs">Colegio Santa María</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-base font-bold text-slate-800 mb-6">Iniciar sesión</h1>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Correo institucional
              </label>
              <input
                type="email"
                placeholder="nombre@csm.edu.co"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inp}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${inp} pr-10`}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Colegio Santa María
        </p>
      </div>
    </div>
  )
}
