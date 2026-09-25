import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useStore() {
  const [events,   setEvents]   = useState([])
  const [plans,    setPlans]    = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [evtsRes, plnsRes, subsRes] = await Promise.all([
        supabase.from('events').select('*').order('date', { ascending: true }),
        supabase.from('plans').select('*'),
        supabase.from('subjects').select('*').order('grade').order('created_at'),
      ])
      if (evtsRes.error) throw evtsRes.error
      if (plnsRes.error) throw plnsRes.error
      if (subsRes.error) throw subsRes.error
      setEvents(evtsRes.data ?? [])
      setPlans(plnsRes.data ?? [])
      setSubjects(subsRes.data ?? [])
    } catch (err) {
      setError(err.message ?? 'Error al conectar con la base de datos')
    } finally {
      setLoading(false)
    }
  }, [])

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

  const savePlan = async (plan) => {
    const row = { ...plan, saved_at: new Date().toISOString() }
    const { data, error } = await supabase.from('plans').upsert(row).select().single()
    if (!error && data) setPlans(prev => [...prev.filter(p => p.id !== plan.id), data])
  }

  const addSubject = async (subject) => {
    const id = `${subject.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${subject.grade}_${Date.now()}`
    const row = { ...subject, id }
    const { data, error } = await supabase.from('subjects').insert(row).select().single()
    if (!error && data) setSubjects(prev => [...prev, data])
  }

  const deleteSubject = async (id) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (!error) setSubjects(prev => prev.filter(s => s.id !== id))
  }

  return { events, plans, subjects, loading, error, addEvent, deleteEvent, savePlan, addSubject, deleteSubject }
}
