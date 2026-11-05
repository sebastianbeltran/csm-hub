import { useState } from 'react'
import { ExternalLink, Link2, Search } from 'lucide-react'
import { hostOf } from '../lib/links'

export default function Enlaces({ links }) {
  const [q, setQ] = useState('')
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const shown = q.trim()
    ? links.filter(l => norm(`${l.title} ${l.url}`).includes(norm(q.trim())))
    : links

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Formularios, documentos y sitios útiles para el día a día.
        </p>
        {links.length > 6 && (
          <label className="relative sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar enlace..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" />
          </label>
        )}
      </div>

      {links.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Link2 size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Todavía no hay enlaces.</p>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Ningún enlace coincide con “{q}”.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map(l => (
            <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
              className="group bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3 hover:border-green-400 hover:shadow-sm transition-all">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
                <Link2 size={16} className="text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 leading-snug">{l.title}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{hostOf(l.url)}</p>
              </div>
              <ExternalLink size={14} className="text-slate-300 group-hover:text-green-600 flex-shrink-0 mt-0.5 transition-colors" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
