import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import LessonPlan from './components/LessonPlan'
import AdminPanel from './components/AdminPanel'
import { useStore } from './hooks/useStore'
import { parseISO, differenceInDays } from 'date-fns'

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  plans:     'Plan Semanal',
  admin:     'Panel de Administración',
}

export default function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { events, plans, subjects, loading, error, addEvent, deleteEvent, savePlan, addSubject, deleteSubject } = useStore()

  const navigate = (view) => { setActiveView(view); setSidebarOpen(false) }

  const urgentCount = events.filter(e => {
    try {
      const days = differenceInDays(parseISO(e.date), new Date())
      return days >= 0 && days <= 3 && e.priority === 'high'
    } catch { return false }
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm max-w-sm text-center">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="text-red-600 font-bold mb-2">Error de conexión</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-5 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar activeView={activeView} onNavigate={navigate} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeView={activeView} viewTitles={VIEW_TITLES} onMenuToggle={() => setSidebarOpen(o => !o)} eventCount={urgentCount} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeView === 'dashboard' && <Dashboard events={events} onDelete={deleteEvent} />}
          {activeView === 'plans'     && <LessonPlan plans={plans} subjects={subjects} onSave={savePlan} />}
          {activeView === 'admin'     && (
            <AdminPanel
              events={events} subjects={subjects}
              onAddEvent={addEvent} onDeleteEvent={deleteEvent}
              onAddSubject={addSubject} onDeleteSubject={deleteSubject}
            />
          )}
        </main>
      </div>
    </div>
  )
}
