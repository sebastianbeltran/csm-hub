import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarClock, CalendarDays, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const KIND_ICON = {
  schedule_event:   <CalendarClock size={15} className="text-teal-600" />,
  teacher_schedule: <CalendarDays size={15} className="text-green-600" />,
}

export default function NotificationBell({ notifications, unread, onRead, onReadAll }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const openItem = (n) => {
    if (!n.read_at) onRead(n.id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} aria-label="Notificaciones"
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
        <Bell size={19} className="text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Notificaciones</span>
            {unread > 0 && (
              <button onClick={onReadAll} className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800">
                <CheckCheck size={13} /> Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-10">No tienes notificaciones</p>
            )}
            {notifications.map(n => (
              <button key={n.id} onClick={() => openItem(n)}
                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors ${n.read_at ? '' : 'bg-green-50/40'}`}>
                <div className="mt-0.5 shrink-0">{KIND_ICON[n.kind] ?? <Bell size={15} className="text-slate-400" />}</div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${n.read_at ? 'text-slate-600' : 'text-slate-800 font-semibold'}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                {!n.read_at && <span className="w-2 h-2 rounded-full bg-green-600 mt-1.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
