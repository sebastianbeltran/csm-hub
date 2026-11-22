import { useState, useEffect, useCallback } from 'react'
import { supabase, missingConfig } from '../lib/supabase'
import seedLinks from '../data/enlaces.json'

// Los enlaces se guardan como una lista en vigilancias_config (id = 'enlaces').
// Mientras no exista ese registro, se muestran los de src/data/enlaces.json.
const LINKS_ROW_ID = 'enlaces'

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
  subjectId:         p.subject_id         ?? p.subjectId         ?? '',
  weekStart:         p.week_start         ?? p.weekStart         ?? '',
  compTransversales: p.comp_transversales ?? p.compTransversales ?? [],
  compArea:          p.comp_area          ?? p.compArea          ?? '',
  conexionProyecto:  p.conexion_proyecto  ?? p.conexionProyecto  ?? '',
  evaluacion:        Array.isArray(p.evaluacion) ? p.evaluacion : [],
  diferenciacion:    p.diferenciacion     ?? '',
  diversidad:        p.diversidad         ?? '',
  actividades:       p.actividades        ?? '',
  observaciones:     p.observaciones      ?? '',
})

export function useStore({ userId = null, schoolId = null } = {}) {
  const [events,             setEvents]             = useState([])
  const [plans,              setPlans]              = useState([])
  const [subjects,           setSubjects]           = useState([])
  const [counselingSessions, setCounselingSessions] = useState([])
  const [scheduleEvents,     setScheduleEvents]     = useState([])
  const [links,              setLinks]              = useState(seedLinks)
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
      const [evtsRes, plnsRes, subsRes, counselRes, linksRes, schedEvtsRes] = await Promise.all([
        supabase.from('events').select('*').order('date', { ascending: true }),
        supabase.from('plans').select('*'),
        supabase.from('subjects').select('*').order('grade').order('created_at'),
        supabase.from('counseling_sessions').select('*').order('session_date').order('session_time'),
        supabase.from('vigilancias_config').select('data').eq('id', LINKS_ROW_ID).maybeSingle(),
        supabase.from('schedule_events').select('*').order('date').order('time_start'),
      ])
      if (evtsRes.error)   throw evtsRes.error
      if (plnsRes.error)   throw plnsRes.error
      if (subsRes.error)   throw subsRes.error
      setEvents(evtsRes.data ?? [])
      setPlans((plnsRes.data ?? []).map(normalizePlan))
      setSubjects(subsRes.data ?? [])
      if (!counselRes.error) setCounselingSessions((counselRes.data ?? []).map(normalizeCounseling))
      if (!linksRes.error && Array.isArray(linksRes.data?.data)) setLinks(linksRes.data.data)
      if (!schedEvtsRes.error) {
        const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
        // Limpiar eventos pasados (fire-and-forget; solo funciona para admin por RLS)
        supabase.from('schedule_events').delete().lt('date', today).then(() => {})
        setScheduleEvents((schedEvtsRes.data ?? []).filter(e => e.date >= today))
      }
    } catch (err) {
      setError(err.message ?? 'Error al conectar con la base de datos')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadAll() }, [loadAll])

  const addEvent = async (event) => {
    const row = { ...event, id: Date.now().toString() }
    const { data, error } = await supabase.from('events').insert(row).select().single()
    if (!error && data) setEvents(prev => [...prev, data].sort((a, b) => new Date(a.date) - new Date(b.date)))
  }

  const deleteEvent = async (id) => {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) setEvents(prev => prev.filter(e => e.id !== id))
  }

  const updateEvent = async (event) => {
    const { data, error } = await supabase.from('events').update(event).eq('id', event.id).select().single()
    if (!error && data) setEvents(prev => prev.map(e => e.id === event.id ? data : e).sort((a, b) => new Date(a.date) - new Date(b.date)))
  }

  const savePlan = async (plan) => {
    const row = { ...plan, teacher_id: userId, school_id: schoolId, saved_at: new Date().toISOString() }
    const { data, error } = await supabase.from('plans').upsert(row).select().single()
    if (!error && data) setPlans(prev => [...prev.filter(p => p.id !== plan.id), normalizePlan(data)])
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
      .eq('id', 'main')
      .single()
    if (error) return null
    return data
  }

  const saveVigilancias = async (parsedData) => {
    const { error } = await supabase
      .from('vigilancias_config')
      .upsert({ id: 'main', data: parsedData, updated_at: new Date().toISOString() })
    return !error
  }

  // Guarda la lista completa de enlaces (agregar, editar, borrar y reordenar pasan por aquí)
  const saveLinks = async (next) => {
    const { error } = await supabase
      .from('vigilancias_config')
      .upsert({ id: LINKS_ROW_ID, data: next, updated_at: new Date().toISOString() })
    if (!error) setLinks(next)
    return !error
  }

  return {
    events, plans, subjects, counselingSessions, scheduleEvents, links, loading, error,
    saveLinks,
    addEvent, updateEvent, deleteEvent,
    savePlan,
    addSubject, deleteSubject,
    addScheduleEvent, updateScheduleEvent, deleteScheduleEvent,
    addCounselingSession, deleteCounselingSession, updateCounselingAttendance,
    loadVigilancias, saveVigilancias,
  }
}
