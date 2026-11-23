import { useState, useEffect, useCallback } from 'react'
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
})

export function useStore({ userId = null, schoolId = null, schoolSlug = null } = {}) {
  const [events,             setEvents]             = useState([])
  const [plans,              setPlans]              = useState([])
  const [subjects,           setSubjects]           = useState([])
  const [counselingSessions, setCounselingSessions] = useState([])
  const [scheduleEvents,     setScheduleEvents]     = useState([])
  const [links,              setLinks]              = useState(seedLinks)
  const [timetable,          setTimetable]          = useState(null)   // { slots, courses } de la escuela
  const [mySchedule,         setMySchedule]         = useState(null)   // horario del usuario
  const [loading,           setLoading]            = useState(true)
  const [error,              setError]              = useState(null)

  const loadAll = useCallback(async () => {
    if (missingConfig) {
      setError('Faltan las variables de entorno de Supabase. Configúralas en Vercel → Settings → Environment Variables y redesplega.')
      setLoading(false)
      return
    }
    if (!userId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const [evtsRes, plnsRes, subsRes, counselRes, linksRes, schedEvtsRes, ttRes, mySchedRes] = await Promise.all([
        supabase.from('events').select('*').order('date', { ascending: true }),
        supabase.from('plans').select('*'),
        supabase.from('subjects').select('*').order('grade').order('created_at'),
        supabase.from('counseling_sessions').select('*').order('session_date').order('session_time'),
        supabase.from('vigilancias_config').select('data').eq('id', linksId(schoolSlug)).maybeSingle(),
        supabase.from('schedule_events').select('*').order('date').order('time_start'),
        schoolSlug
          ? supabase.from('vigilancias_config').select('data').eq('id', timetableId(schoolSlug)).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('teacher_schedules').select('schedule').eq('teacher_id', userId).maybeSingle(),
      ])
      if (evtsRes.error)   throw evtsRes.error
      if (plnsRes.error)   throw plnsRes.error
      if (subsRes.error)   throw subsRes.error
      // El RLS filtra por la escuela del perfil, pero el super_admin ve todo:
      // filtrar también en el cliente por la escuela activa (incluye "Ver como").
      const inSchool    = (row) => !schoolId || row.school_id === schoolId
      const inSchoolOrGlobal = (row) => !schoolId || !row.school_id || row.school_id === schoolId
      setEvents((evtsRes.data ?? []).filter(inSchoolOrGlobal))
      setPlans((plnsRes.data ?? []).filter(inSchoolOrGlobal).map(normalizePlan))
      setSubjects((subsRes.data ?? []).filter(inSchool))
      setTimetable(!ttRes.error && Array.isArray(ttRes.data?.data?.slots) ? ttRes.data.data : null)
      setMySchedule(!mySchedRes.error ? (mySchedRes.data?.schedule ?? null) : null)
      if (!counselRes.error) setCounselingSessions((counselRes.data ?? []).filter(inSchool).map(normalizeCounseling))
      if (!linksRes.error && Array.isArray(linksRes.data?.data)) setLinks(linksRes.data.data)
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
  }, [userId, schoolId, schoolSlug])

  useEffect(() => { loadAll() }, [loadAll])

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
      school_id:          schoolId,
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
      saved_at:           new Date().toISOString(),
    }
    const existing = plans.find(p =>
      p.teacher_id === userId && p.subjectId === plan.subjectId && p.weekStart === plan.weekStart)
    const query = existing
      ? supabase.from('plans').update(row).eq('id', existing.id)
      : supabase.from('plans').insert(row)
    const { data, error } = await query.select().single()
    if (error) return false
    setPlans(prev => [...prev.filter(p => p.id !== data.id), normalizePlan(data)])
    return true
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
    if (!error) setLinks(next)
    return !error
  }

  // ── Timbre y horarios ────────────────────────────────────────────────────

  const saveTimetable = async (next) => {
    if (!schoolSlug) return false
    const { error } = await supabase
      .from('vigilancias_config')
      .upsert({ id: timetableId(schoolSlug), data: next, updated_at: new Date().toISOString() })
    if (!error) setTimetable(next)
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

  return {
    events, plans, subjects, counselingSessions, scheduleEvents, links, loading, error,
    timetable, mySchedule,
    saveTimetable, listSchoolTeachers, loadTeacherSchedule, saveTeacherSchedule,
    saveLinks,
    addEvent, updateEvent, deleteEvent,
    savePlan,
    addSubject, deleteSubject,
    addScheduleEvent, updateScheduleEvent, deleteScheduleEvent,
    addCounselingSession, deleteCounselingSession, updateCounselingAttendance,
    loadVigilancias, saveVigilancias,
  }
}
