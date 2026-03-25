import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, Plus, X, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Category {
  id: number
  name: string
  created_at: string
}

export default function SupplierCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>({})

  async function load() {
    const [{ data: cats }, { data: suppliers }] = await Promise.all([
      supabase.from('supplier_categories').select('*').order('name'),
      supabase.from('suppliers').select('category'),
    ])
    setCategories((cats ?? []) as Category[])
    const c: Record<string, number> = {}
    for (const s of (suppliers ?? [])) {
      if (s.category) c[s.category] = (c[s.category] ?? 0) + 1
    }
    setCounts(c)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addCategory() {
    const name = newName.trim().toUpperCase()
    if (!name) return
    setSaving(true)
    await supabase.from('supplier_categories').insert({ name })
    setNewName('')
    setSaving(false)
    load()
  }

  async function deleteCategory(id: number) {
    await supabase.from('supplier_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Категории поставщиков</h1>
        <p className="text-sm text-slate-400 mt-0.5">{categories.length} категорий</p>
      </div>

      {/* Add */}
      <div className="glass rounded-2xl border border-white/[0.06] p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Добавить категорию</h2>
        <div className="flex gap-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="Название категории..."
            className="flex-1 bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
          />
          <button
            onClick={addCategory}
            disabled={!newName.trim() || saving}
            className="flex items-center gap-2 btn-primary text-sm px-5 disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={14} />}
            Добавить
          </button>
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl shimmer-bg" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            <Tag size={32} className="mx-auto mb-2 opacity-30" />
            Категории не добавлены
          </div>
        ) : (
          <AnimatePresence>
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-center gap-4 px-5 py-3.5 ${i !== 0 ? 'border-t border-white/[0.05]' : ''}`}
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Tag size={14} className="text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{cat.name}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Building2 size={11} />
                  <span>{counts[cat.name] ?? 0} поставщиков</span>
                </div>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
