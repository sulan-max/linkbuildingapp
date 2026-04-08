import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface PlannedLinkbuilding {
  id: string
  user_id: string
  customer_url: string
  web_url: string
  dr: number | null
  score: number
  theme_reason: string
  contacted: boolean
  link_added: boolean
  created_at: string
}

export function usePlannedLinkbuildings() {
  const [items, setItems] = useState<PlannedLinkbuilding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('planned_linkbuildings')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const update = async (id: string, patch: Partial<Pick<PlannedLinkbuilding, 'contacted' | 'link_added'>>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
    await supabase.from('planned_linkbuildings').update(patch).eq('id', id)
  }

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('planned_linkbuildings').delete().eq('id', id)
  }

  return { items, loading, error, update, remove, reload: load }
}
