import { Menu, Bell } from 'lucide-react'
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

      <div className="flex items-center gap-3">
        {eventCount > 0 && (
          <div className="relative">
            <Bell size={20} className="text-slate-500" />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {eventCount > 9 ? '9+' : eventCount}
            </span>
          </div>
        )}
        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
          <span className="text-indigo-700 text-xs font-bold">AD</span>
        </div>
      </div>
    </header>
  )
}
