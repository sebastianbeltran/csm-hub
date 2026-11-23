import { useState, useEffect, useCallback } from 'react'
import { supabase, missingConfig } from '../lib/supabase'

const LIMIT = 30

// Notificaciones del usuario (las generan triggers en Supabase) + tiempo real
export function useNotifications(userId) {
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    if (missingConfig || !userId) { setItems([]); return }
    const { data, error } = await supabase
      .from('notifications').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(LIMIT)
    if (!error) setItems(data ?? [])
  }, [userId])

  useEffect(() => {
    load()
    if (missingConfig || !userId) return
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setItems(prev => [payload.new, ...prev.filter(n => n.id !== payload.new.id)].slice(0, LIMIT)))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, load])

  const markRead = async (id) => {
    const now = new Date().toISOString()
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: n.read_at ?? now } : n))
    await supabase.from('notifications').update({ read_at: now }).eq('id', id).is('read_at', null)
  }

  const markAllRead = async () => {
    const now = new Date().toISOString()
    setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })))
    await supabase.from('notifications').update({ read_at: now }).eq('user_id', userId).is('read_at', null)
  }

  const unread = items.filter(n => !n.read_at).length

  return { notifications: items, unread, markRead, markAllRead }
}
