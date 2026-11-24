import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, missingConfig } from '../lib/supabase'
import seedLinks from '../data/enlaces.json'
import { timetableId } from '../lib/schoolTimetable'

// IDs en vigilancias_config — incluyen el slug de escuela cuando está disponible
const linksId       = (slug) => slug ? `enlaces_${slug}` : 'enlaces'
const vigilanciasId = (slug) => slug ? `main_${slug}`    : 'main'

const normalizeCounseling = (s) => ({
  ...s,
  studentName: s.student_name ?? s.studentName ?? '',
  sessionDate: s.session_date ?? s.sessionDate ?? '',
  sessionTime: s.session_time ?? s.sessionTime ?? '',
})

const sortCounseling = (a, b) => {
  const d = new Date(a.sessionDate) - new Date(b.sessionDate)
  return d !== 0 ? d : a.sessionTime.localeCompare(b.sessionTime)
}

// Supabase returns snake_case; normalize to camelCase for the app
const normalizePlan = (p) => ({
  ...p,
  weekStart:         p.week_start         ?? p.weekStart         ?? '',
  subjectId:         p.subject_id         ?? p.subjectId         ?? '',
  compTransversales: p.comp_transversales ?? p.compTransversales ?? [],
  compArea:          p.comp_area          ?? p.compArea          ?? '',
  conexionProyecto:  p.conexion_proyecto  ?? p.conexionProyecto  ?? '',
  evaluacion:        Array.isArray(p.evaluacion) ? p.evaluacion : [],
  diferenciacion:    p.diferenciacion     ?? '',
  diversidad:        p.diversidad         ?? '',
  actividades:       p.actividades        ?? '',
  observaciones:     p.observaciones      ?? '',
  screenMinutes:     p.screen_minutes     ?? p.screenMinutes     ?? 0,
})

// PostgREST devuelve SETOF uuid como ['id', ...] o [{ fn: 'id' }, ...] según la versión
const scalarList = (rows) => (rows ?? []).map(r => (r && typeof r === 'object') ? Object.values(r)[0] : r).filter(Boolean)

const dedupeLinks = (list) => {
  const seen = new Set()
  return list.filter(l => { const k = (l.url || l.title || '').toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}

// schoolId/schoolSlug = escuela que se ADMINISTRA (la principal, o la elegida en "Ver como").
// homeSlug = escuela principal del perfil (timbre del horario personal).
// Las vistas personales usan siempre todas las escuelas del usuario (scopeSchoolIds).
export function useStore({ userId = null, schoolId = null, schoolSlug = null, homeSlug = null, previewSchoolId = null, schools = [] } = {}) {
  const [events,             setEvents]             = useState([])
  const [plans,              setPlans]              = useState([])
  const [subjects,           setSubjects]           = useState([])
  const [counselingSessions, setCounselingSessions] = useState([])
  const [scheduleEvents,     setScheduleEvents]     = useState([])
  const [linksBySlug,        setLinksBySlug]        = useState({})     // { slug: [enlaces] }
  const [memberSchoolIds,    setMemberSchoolIds]    = useState([])     // escuelas del usuario (principal + materias)
  const [timetable,          setTimetable]          = useState(null)   // { slots, courses } de la escuela administrada
  const [homeTimetable,      setHomeTimetable]      = useState(null)   // timbre de la escuela principal (mi horario)
  const [mySchedule,         setMySchedule]         = useState(null)   // horario del usuario
  const [mySubjectIds,       setMySubjectIds]       = useState([])     // materias asignadas (teacher_subjects)
  const [loading,           setLoading]            = useState(true)
  const [error,              setError]              = useState(null)

  // quiet = recargar sin la pantalla de "Cargando..." (no desmonta la vista actual)
  const loadAll = useCallback(async ({ quiet = false } = {}) => {
    if (missingConfig) {
      setError('Faltan las variables de entorno de Supabase. Configúralas en Vercel → Settings → Environment Variables y redesplega.')
      setLoading(false)
      return
    }
    if (!userId) { setLoading(false); return }
    if (!quiet) setLoading(true)
    setError(null)
    try {
      // Escuelas del usuario: la principal + las de sus materias asignadas
      const myRes  = await supabase.rpc('get_my_school_ids')
      const member = [...new Set([schoolId, ...(myRes.error ? [] : scalarList(myRes.data))].filter(Boolean))]
      setMemberSchoolIds(member)
      // Datos: mis escuelas + la que se administra (las vistas filtran después)
      const scope      = [...new Set([...member, previewSchoolId, schoolId].filter(Boolean))]
      const scopeSlugs = scope.map(id => schools.find(sc => sc.id === id)?.slug).filter(Boolean)
      const linkIds    = [...new Set([...scopeSlugs, schoolSlug].filter(Boolean))].map(linksId)

      const [evtsRes, plnsRes, subsRes, counselRes, linksRes, schedEvtsRes, ttRes, mySchedRes, mySubsRes, homeTtRes] = await Promise.all([
        supabase.from('events').select('*').order('date', { ascending: true }),
        supabase.from('plans').select('*'),
        supabase.from('subjects').select('*').order('grade').order('created_at'),
        supabase.from('counseling_sessions').select('*').order('session_date').order('session_time'),
        linkIds.length
          ? supabase.from('vigilancias_config').select('id, data').in('id', linkIds)
          : supabase.from('vigilancias_config').select('id, data').eq('id', linksId(null)),
        supabase.from('schedule_events').select('*').order('date').order('time_start'),
        schoolSlug
          ? supabase.from('vigilancias_config').select('data').eq('id', timetableId(schoolSlug)).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('teacher_schedules').select('schedule').eq('teacher_id', userId).maybeSingle(),
        supabase.from('teacher_subjects').select('subject_id').eq('teacher_id', userId),
        homeSlug && homeSlug !== schoolSlug
          ? supabase.from('vigilancias_config').select('data').eq('id', timetableId(homeSlug)).maybeSingle()
          : Promise.resolve({ data: null, error: null, same: true }),
      ])
      if (evtsRes.error)   throw evtsRes.error
      if (plnsRes.error)   throw plnsRes.error
      if (subsRes.error)   throw subsRes.error
      // El RLS filtra por las escuelas del usuario, pero el super_admin ve todo:
      // filtrar también en el cliente por las escuelas visibles (incluye "Ver como").
      const scopeSet         = new Set(scope)
      const inSchool         = (row) => scope.length === 0 || scopeSet.has(row.school_id)
      const inSchoolOrGlobal = (row) => scope.length === 0 || !row.school_id || scopeSet.has(row.school_id)
      setEvents((evtsRes.data ?? []).filter(inSchoolOrGlobal))
      setPlans((plnsRes.data ?? []).filter(inSchoolOrGlobal).map(normalizePlan))
      setSubjects((subsRes.data ?? []).filter(inSchool))
      const tt = !ttRes.error && Array.isArray(ttRes.data?.data?.slots) ? ttRes.data.data : null
      setTimetable(tt)
      setHomeTimetable(homeTtRes.same ? tt : (!homeTtRes.error && Array.isArray(homeTtRes.data?.data?.slots) ? homeTtRes.data.data : null))
      setMySchedule(!mySchedRes.error ? (mySchedRes.data?.schedule ?? null) : null)
      setMySubjectIds(!mySubsRes.error ? (mySubsRes.data ?? []).map(r => r.subject_id) : [])
      if (!counselRes.error) setCounselingSessions((counselRes.data ?? []).filter(inSchool).map(normalizeCounseling))
      if (!linksRes.error) {
        const bySlug = {}
        for (const row of linksRes.data ?? []) {
          if (!Array.isArray(row.data)) continue
          const slug = row.id === 'enlaces' ? '' : row.id.replace(/^enlaces_/, '')
          bySlug[slug] = row.data
        }
        setLinksBySlug(bySlug)
      }
      if (!schedEvtsRes.error) {
        const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
        // Limpiar eventos pasados (fire-and-forget; solo funciona para admin por RLS)
        supabase.from('schedule_events').delete().lt('date', today).then(() => {})
        setScheduleEvents((schedEvtsRes.data ?? []).filter(e => e.date >= today && inSchool(e)))
      }
    } catch (err) {
      setError(err.message ?? 'Error al conectar con la base de datos')
    } finally {
      setLoading(false)
    }
  }, [userId, schoolId, schoolSlug, homeSlug, previewSchoolId, schools]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll() }, [loadAll])

  // Escuelas de las vistas personales: siempre todas las del usuario
  const scopeSchoolIds = useMemo(
    () => memberSchoolIds.length ? memberSchoolIds : [schoolId].filter(Boolean),
    [memberSchoolIds, schoolId])

  // Enlaces: unión de las escuelas visibles (para leer) y los de la escuela principal (para editar)
  const links = useMemo(() => {
    const slugs  = scopeSchoolIds.map(id => schools.find(sc => sc.id === id)?.slug).filter(Boolean)
    const merged = slugs.flatMap(sl => linksBySlug[sl] ?? [])
    return merged.length ? dedupeLinks(merged) : (linksBySlug[schoolSlug] ?? linksBySlug[''] ?? seedLinks)
  }, [scopeSchoolIds, schools, linksBySlug, schoolSlug])
  const schoolLinks = linksBySlug[schoolSlug ?? ''] ?? linksBySlug[''] ?? seedLinks

  // id lo genera Supabase (UUID). El evento queda asociado a la escuela activa.
  const addEvent = async (event) => {
    const { id: _ignored, ...fields } = event
    const row = { ...fields, school_id: schoolId }
    const { data, error } = await supabase.from('events').insert(row).select().single()
    if (!error && data) setEvents(prev => [...prev, data].sort((a, b) => new Date(a.date) - new Date(b.date)))
    return !error
  }

  const deleteEvent = async (id) => {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) setEvents(prev => prev.filter(e => e.id !== id))
  }

  const updateEvent = async (event) => {
    const { data, error } = await supabase.from('events').update(event).eq('id', event.id).select().single()
    if (!error && data) setEvents(prev => prev.map(e => e.id === event.id ? data : e).sort((a, b) => new Date(a.date) - new Date(b.date)))
  }

  // Un plan por docente + materia + semana. Si ya existe uno propio se actualiza;
  // si no, se inserta y Supabase genera el id (UUID).
  const savePlan = async (plan) => {
    const row = {
      teacher_id:         userId,
      // El plan es de la escuela de la materia (un docente puede dictar en varias)
      school_id:          subjects.find(s => s.id === plan.subjectId)?.school_id ?? schoolId,
      subject_id:         plan.subjectId,
      week_start:         plan.weekStart,
      grade:              plan.grade,
      comp_transversales: plan.compTransversales ?? [],
      comp_area:          plan.compArea          ?? '',
      conexion_proyecto:  plan.conexionProyecto  ?? '',
      evaluacion:         plan.evaluacion        ?? [],
      diferenciacion:     plan.diferenciacion    ?? '',
      diversidad:         plan.diversidad        ?? '',
      actividades:        plan.actividades       ?? '',
      observaciones:      plan.observaciones     ?? '',
      screen_minutes:     Math.max(0, Math.round(Number(plan.screenMinutes) || 0)),
      saved_at:           new Date().toISOString(),
    }
    const existing = plans.find(p =>
      p.teacher_id === userId && p.subjectId === plan.subjectId && p.weekStart === plan.weekStart)
    const query = existing
      ? supabase.from('plans').update(row).eq('id', existing.id)
      : supabase.from('plans').insert(row)
    const { data, error } = await query.select().single()
    // Devuelve true o el mensaje de error (p. ej. el límite de pantallas que valida Supabase)
    if (error) return error.message || 'Error al guardar'
    setPlans(prev => [...prev.filter(p => p.id !== data.id), normalizePlan(data)])
    return true
  }

  // Minutos de pantalla ya planeados en un grado/semana (todas las materias, todos los docentes)
  const loadScreenUsage = async (grade, weekStart, planSchoolId = schoolId) => {
    if (!planSchoolId) return []
    const { data, error } = await supabase.rpc('get_screen_usage', { p_school: planSchoolId, p_grade: grade, p_week: weekStart })
    return error ? null : (data ?? [])
  }

  const addSubject = async (subject) => {
    const id = `${subject.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${subject.grade}_${Date.now()}`
    const row = { ...subject, id, school_id: schoolId }
    const { data, error } = await supabase.from('subjects').insert(row).select().single()
    if (!error && data) setSubjects(prev => [...prev, data])
  }

  const deleteSubject = async (id) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (!error) setSubjects(prev => prev.filter(s => s.id !== id))
  }

  const addScheduleEvent = async (evt) => {
    const row = { ...evt, school_id: schoolId, created_by: userId }
    const { data, error } = await supabase.from('schedule_events').insert(row).select().single()
    if (!error && data) setScheduleEvents(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start)))
    return !error
  }

  const updateScheduleEvent = async (evt) => {
    const { id, ...fields } = evt
    const { data, error } = await supabase.from('schedule_events').update(fields).eq('id', id).select().single()
    if (!error && data) setScheduleEvents(prev => prev.map(e => e.id === id ? data : e).sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start)))
    return !error
  }

  const deleteScheduleEvent = async (id) => {
    const { error } = await supabase.from('schedule_events').delete().eq('id', id)
    if (!error) setScheduleEvents(prev => prev.filter(e => e.id !== id))
  }

  const addCounselingSession = async (session) => {
    const row = {
      student_name: session.studentName,
      grade:        session.grade,
      session_date: session.sessionDate,
      session_time: session.sessionTime,
      attended:     null,
      notes:        session.notes || null,
      school_id:    schoolId,
    }
    const { data, error } = await supabase.from('counseling_sessions').insert(row).select().single()
    if (!error && data) setCounselingSessions(prev => [...prev, normalizeCounseling(data)].sort(sortCounseling))
    return !error
  }

  const deleteCounselingSession = async (id) => {
    const { error } = await supabase.from('counseling_sessions').delete().eq('id', id)
    if (!error) setCounselingSessions(prev => prev.filter(s => s.id !== id))
  }

  const updateCounselingAttendance = async (id, attended) => {
    const { data, error } = await supabase.from('counseling_sessions').update({ attended }).eq('id', id).select().single()
    if (!error && data) setCounselingSessions(prev => prev.map(s => s.id === id ? normalizeCounseling(data) : s))
  }

  const loadVigilancias = async () => {
    if (missingConfig) return null
    const { data, error } = await supabase
      .from('vigilancias_config')
      .select('data, updated_at')
      .eq('id', vigilanciasId(schoolSlug))
      .single()
    if (error) return null
    return data
  }

  const saveVigilancias = async (parsedData) => {
    const { error } = await supabase
      .from('vigilancias_config')
      .upsert({ id: vigilanciasId(schoolSlug), data: parsedData, updated_at: new Date().toISOString() })
    return !error
  }

  const saveLinks = async (next) => {
    const { error } = await supabase
      .from('vigilancias_config')
      .upsert({ id: linksId(schoolSlug), data: next, updated_at: new Date().toISOString() })
    if (!error) setLinksBySlug(prev => ({ ...prev, [schoolSlug ?? '']: next }))
    return !error
  }

  // ── Timbre y horarios ────────────────────────────────────────────────────

  const saveTimetable = async (next) => {
    if (!schoolSlug) return false
    const { error } = await supabase
      .from('vigilancias_config')
      .upsert({ id: timetableId(schoolSlug), data: next, updated_at: new Date().toISOString() })
    if (!error) { setTimetable(next); if (schoolSlug === homeSlug) setHomeTimetable(next) }
    return !error
  }

  // Docentes (y demás usuarios) de la escuela activa, para asignarles horario
  const listSchoolTeachers = async () => {
    if (!schoolId) return []
    const { data, error } = await supabase
      .from('profiles').select('id, full_name, email, role')
      .eq('school_id', schoolId).order('full_name')
    return error ? [] : (data ?? [])
  }

  const loadTeacherSchedule = async (teacherId) => {
    const { data, error } = await supabase
      .from('teacher_schedules').select('schedule').eq('teacher_id', teacherId).maybeSingle()
    if (error) return { schedule: null, error: error.message }
    return { schedule: data?.schedule ?? {}, error: null }
  }

  const saveTeacherSchedule = async (teacherId, schedule) => {
    const { error } = await supabase.from('teacher_schedules').upsert({
      teacher_id: teacherId, school_id: schoolId, schedule,
      updated_by: userId, updated_at: new Date().toISOString(),
    })
    if (!error && teacherId === userId) setMySchedule(schedule)
    return !error
  }

  // ── Usuarios (Admin → "Usuarios") ─────────────────────────────────────────

  // Usuarios de la escuela activa: los de esa escuela principal, los que dictan materias ahí
  // y los pendientes (recién registrados, sin escuela). Cada uno con sus materias y escuelas.
  const listUsers = async () => {
    const { data, error } = await supabase.from('profiles')
      .select('id, full_name, email, role, school_id, active, last_login, created_at')
      .order('full_name')
    if (error) return { users: [], error: error.message }
    const all = data ?? []
    const ids = all.map(u => u.id)
    const subsRes = ids.length
      ? await supabase.from('teacher_subjects').select('teacher_id, subject_id, subjects(school_id)').in('teacher_id', ids)
      : { data: [] }
    const subs = {}, extra = {}
    for (const r of subsRes.data ?? []) {
      (subs[r.teacher_id] ??= []).push(r.subject_id)
      if (r.subjects?.school_id) (extra[r.teacher_id] ??= new Set()).add(r.subjects.school_id)
    }
    const users = all
      .map(u => ({
        ...u,
        subjectIds: subs[u.id] ?? [],
        schoolIds:  [...new Set([u.school_id, ...(extra[u.id] ?? [])].filter(Boolean))],
        // De esta escuela (principal o dicta aquí) o pendiente; el resto solo lo ve el super_admin
        inSchool:   !u.school_id || !schoolId || u.school_id === schoolId || (extra[u.id]?.has(schoolId) ?? false),
      }))
    return { users, error: null }
  }

  // Perfil + materias en una sola operación (RPC admin_save_user valida permisos en Supabase)
  const saveUser = async ({ id, fullName, role, schoolId: userSchool, active, subjectIds }) => {
    const { error } = await supabase.rpc('admin_save_user', {
      p_user: id, p_full_name: fullName ?? '', p_role: role,
      p_school: userSchool || null, p_active: !!active, p_subjects: subjectIds ?? [],
      p_scope: schoolId,
    })
    if (error) return error.message || 'Error al guardar'
    // Mis propias materias cambian mis escuelas visibles: recargar todo
    if (id === userId) loadAll({ quiet: true })
    return true
  }

  return {
    events, plans, subjects, counselingSessions, scheduleEvents, links, loading, error,
    timetable, homeTimetable, mySchedule, mySubjectIds,
    scopeSchoolIds, memberSchoolIds, schoolLinks,
    listUsers, saveUser,
    saveTimetable, listSchoolTeachers, loadTeacherSchedule, saveTeacherSchedule,
    saveLinks,
    addEvent, updateEvent, deleteEvent,
    savePlan, loadScreenUsage,
    addSubject, deleteSubject,
    addScheduleEvent, updateScheduleEvent, deleteScheduleEvent,
    addCounselingSession, deleteCounselingSession, updateCounselingAttendance,
    loadVigilancias, saveVigilancias,
  }
}
