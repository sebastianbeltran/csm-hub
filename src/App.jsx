import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import LessonPlan from './components/LessonPlan'
import AdminPanel from './components/AdminPanel'
import CollegeCounselor from './components/CollegeCounselor'
import HorarioSemanal from './components/HorarioSemanal'
import Enlaces from './components/Enlaces'
import RoleSwitcher from './components/RoleSwitcher'
import LoginPage from './pages/LoginPage'
import PendingActivationPage from './pages/PendingActivationPage'
import { useStore } from './hooks/useStore'
import { useAuth } from './hooks/useAuth'
import { useNotifications } from './hooks/useNotifications'
import NotificationBell from './components/NotificationBell'
import { supabase, missingConfig } from './lib/supabase'
import { hasFeature } from './lib/schoolFeatures'
import { parseISO, differenceInDays } from 'date-fns'

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  horario:   '¿Cómo va mi horario?',
  plans:     'Plan Semanal',
  counselor: 'College Counseling',
  enlaces:   'Enlaces de interés',
  admin:     'Panel de Administración',
}

const PATH_TO_VIEW = {
  '/':           'dashboard',
  '/horario':    'horario',
  '/planes':     'plans',
  '/counseling': 'counselor',
  '/enlaces':    'enlaces',
  '/admin':      'admin',
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}

function AppInner() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { user, profile, role, fullName, authLoading, login, logout,
    isSuperAdmin, previewRole, setPreviewRole, schoolId, previewSchoolId, setPreviewSchoolId,
  } = useAuth()

  // Schools se carga antes de useStore para derivar schoolSlug
  const [schools, setSchools] = useState([])
  const userId = user?.id ?? null
  useEffect(() => {
    if (missingConfig || !userId) return
    supabase.from('schools').select('id, name, slug').eq('active', true).order('sort_order').order('name')
      .then(({ data }) => setSchools(data ?? []))
  }, [userId])

  const schoolSlug = userId ? (schools.find(s => s.id === schoolId)?.slug ?? null) : null
  const homeSlug   = userId ? (schools.find(s => s.id === profile?.school_id)?.slug ?? null) : null

  const { events, plans, subjects, counselingSessions, scheduleEvents, links, loading, error,
    timetable, homeTimetable, mySchedule, mySubjectIds,
    scopeSchoolIds, schoolLinks,
    listUsers, saveUser,
    saveTimetable, listSchoolTeachers, loadTeacherSchedule, saveTeacherSchedule,
    saveLinks,
    addEvent, updateEvent, deleteEvent,
    savePlan, loadScreenUsage,
    addSubject, deleteSubject,
    addScheduleEvent, updateScheduleEvent, deleteScheduleEvent,
    addCounselingSession, deleteCounselingSession, updateCounselingAttendance,
    loadVigilancias, saveVigilancias,
  } = useStore({ userId, schoolId, schoolSlug, homeSlug, previewSchoolId, schools })

  // Escuelas visibles (un docente puede dictar en varias): se ve todo lo de todas
  const scopeSchools = schools.filter(s => scopeSchoolIds.includes(s.id))
  const scopeSlugs   = scopeSchools.map(s => s.slug)
  const anyFeature   = (f) => (scopeSlugs.length ? scopeSlugs : [schoolSlug]).some(sl => hasFeature(sl, f))

  // Vistas personales (Dashboard, Plan, Horario...): siempre todas mis escuelas,
  // sin importar la escuela que se administra en "Ver como"
  const mine         = (row) => !row.school_id || scopeSchoolIds.includes(row.school_id)
  const myEvents     = events.filter(mine)
  const mySchedEvts  = scheduleEvents.filter(mine)

  const { notifications, unread, markRead, markAllRead } = useNotifications(userId)

  const features = {
    vigilancias: anyFeature('vigilancias'),
    counseling:  anyFeature('counseling'),
    screenTime:  anyFeature('screenTime'),
  }

  const urgentCount = myEvents.filter(e => {
    try {
      const days = differenceInDays(parseISO(e.date), new Date())
      return days >= 0 && days <= 3 && e.priority === 'high'
    } catch { return false }
  }).length

  const activeView = PATH_TO_VIEW[location.pathname] || 'dashboard'

  // ── Pantallas de carga y error ─────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-sm text-center">
          <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-bold mb-2">Error de conexión</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button onClick={() => window.location.reload()}
            className="mt-5 px-5 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ── Sin sesión → login ─────────────────────────────────────────────────────

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage onLogin={login} />} />
      </Routes>
    )
  }

  // ── Cuenta pendiente de activación (solo docentes) ─────────────────────────

  if (profile && profile.active === false && role === 'docente') {
    return (
      <Routes>
        <Route path="*" element={<PendingActivationPage onLogout={logout} />} />
      </Routes>
    )
  }

  // ── App principal ──────────────────────────────────────────────────────────

  const switcher = isSuperAdmin && (
    <RoleSwitcher
      previewRole={previewRole}
      onChangeRole={setPreviewRole}
      schools={schools}
      schoolId={schoolId}
      onChangeSchool={setPreviewSchoolId}
    />
  )

  // El panel de administración trabaja solo sobre la escuela principal (o la de "Ver como")
  const ownSchool = (row) => !schoolId || row.school_id === schoolId
  const adminPanel = (
    <AdminPanel
      events={events.filter(e => !e.school_id || ownSchool(e))} subjects={subjects.filter(ownSchool)}
      onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent}
      onAddSubject={addSubject} onDeleteSubject={deleteSubject}
      scheduleEvents={scheduleEvents.filter(ownSchool)}
      onAddScheduleEvent={addScheduleEvent} onUpdateScheduleEvent={updateScheduleEvent} onDeleteScheduleEvent={deleteScheduleEvent}
      onSaveVigilancias={saveVigilancias} onLoadVigilancias={loadVigilancias}
      links={schoolLinks} onSaveLinks={saveLinks}
      showVigilancias={hasFeature(schoolSlug, 'vigilancias')}
      schoolSlug={schoolSlug}
      role={role}
      onRequestLogin={() => {}}
      timetable={timetable} onSaveTimetable={saveTimetable}
      onListTeachers={listSchoolTeachers} onLoadTeacherSchedule={loadTeacherSchedule} onSaveTeacherSchedule={saveTeacherSchedule}
      onListUsers={listUsers} onSaveUser={saveUser}
      schools={schools} schoolId={schoolId} isSuperAdmin={isSuperAdmin} currentUserId={userId}
    />
  )

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        role={role}
        features={features}
        fullName={fullName}
        onLogout={logout}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {switcher}
        <Header
          activeView={activeView}
          viewTitles={VIEW_TITLES}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          eventCount={urgentCount}
          rightSlot={<NotificationBell notifications={notifications} unread={unread} onRead={markRead} onReadAll={markAllRead} />}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Routes>
            <Route path="/"           element={<Dashboard events={myEvents} scheduleEvents={mySchedEvts} showVigilancias={features.vigilancias} />} />
            <Route path="/horario"    element={<HorarioSemanal scheduleEvents={mySchedEvts} timetable={homeTimetable} schedule={mySchedule} schoolSlug={homeSlug ?? schoolSlug} />} />
            <Route path="/planes"     element={<LessonPlan plans={plans.filter(mine)} subjects={subjects.filter(mine)} onSave={savePlan} schools={scopeSchools.length ? scopeSchools : schools.filter(s => s.id === schoolId)} userId={userId}
              role={role} mySubjectIds={mySubjectIds}
              showScreenTime={features.screenTime} onLoadScreenUsage={loadScreenUsage} />} />
            <Route path="/counseling" element={
              features.counseling
                ? <CollegeCounselor sessions={counselingSessions.filter(mine)} role={role} onAdd={addCounselingSession} onDelete={deleteCounselingSession} onUpdateAttendance={updateCounselingAttendance} />
                : <Navigate to="/" replace />
            } />
            <Route path="/enlaces"    element={<Enlaces links={links} />} />
            <Route path="/admin"      element={
              ['admin', 'super_admin', 'director'].includes(role)
                ? adminPanel
                : <Navigate to="/" replace />
            } />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
