import { useState } from 'react'
import { Search, Download, Trash2, FileText, Database } from 'lucide-react'
import { CATEGORY_STYLES } from '../data/constants'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const FILE_ICONS = {
  pdf: { icon: '📄', color: 'text-red-500' },
  xlsx: { icon: '📊', color: 'text-green-600' },
  docx: { icon: '📝', color: 'text-blue-600' },
  pptx: { icon: '📋', color: 'text-orange-500' },
  default: { icon: '📁', color: 'text-slate-500' },
}

export default function FilesHub({ files, onDelete }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const categories = ['all', ...Object.keys(CATEGORY_STYLES)]

  const filtered = files.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.description || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'all' || f.category === activeCategory
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-5">
      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar archivos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => {
          const style = cat === 'all' ? null : CATEGORY_STYLES[cat]
          const active = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                active
                  ? cat === 'all'
                    ? 'bg-indigo-600 text-white'
                    : `${style.bg} ${style.text} ring-2 ring-offset-1`
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
              style={active && cat !== 'all' ? { ringColor: style?.accent } : {}}
            >
              {cat === 'all' ? 'Todos' : style?.label}
            </button>
          )
        })}
      </div>

      {/* Backend notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <Database size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          <strong>Modo demo:</strong> Los archivos se descargarán desde el servidor una vez conectado Supabase.
          Por ahora se muestra solo la información registrada.
        </span>
      </div>

      {/* Files grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No se encontraron archivos</p>
          <p className="text-sm mt-1">Prueba cambiando los filtros o ve al panel de administración</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(file => <FileCard key={file.id} file={file} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  )
}

function FileCard({ file, onDelete }) {
  const style = CATEGORY_STYLES[file.category] || CATEGORY_STYLES.academico
  const fileIcon = FILE_ICONS[file.type] || FILE_ICONS.default
  let dateLabel = ''
  try { dateLabel = format(parseISO(file.addedAt), "d MMM yyyy", { locale: es }) } catch {}

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <span className="text-3xl">{fileIcon.icon}</span>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>

      <div className="flex-1">
        <p className="font-semibold text-slate-800 text-sm leading-snug">{file.name}</p>
        {file.description && (
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">{file.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{file.size || '—'}</span>
        <span>{dateLabel}</span>
      </div>

      <div className="flex gap-2 pt-1 border-t border-slate-100">
        {file.fileUrl ? (
          <a
            href={file.fileUrl}
            download={file.name}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            <Download size={13} />
            Descargar
          </a>
        ) : (
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-medium cursor-not-allowed"
            title="Disponible cuando se conecte el servidor"
          >
            <Download size={13} />
            Pendiente
          </button>
        )}
        <button
          onClick={() => onDelete(file.id)}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          title="Eliminar"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
