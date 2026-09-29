import { Menu } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Header({ activeView, viewTitles = {}, onMenuToggle, eventCount }) {
  const VIEW_TITLES = viewTitles
  const today = new Date()
  const dateStr = format(today, "EEEE d 'de' MMMM", { locale: es })
  const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu size={20} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{VIEW_TITLES[activeView]}</h2>
          <p className="text-sm text-slate-400 hidden sm:block">{dateCapitalized}</p>
        </div>
      </div>

    </header>
  )
}
