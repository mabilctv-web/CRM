import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Plus, X, Edit2, Check, AlertTriangle, Loader2, Eye, EyeOff, GripVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import clsx from 'clsx'

interface Review {
  id: number
  author_name: string
  text: string
  stars: number
  sort_order: number | null
  visible: boolean
  created_at: string
}

const empty = { author_name: '', text: '', stars: 5 }

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={18}
            className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
          />
        </button>
      ))}
    </div>
  )
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(empty)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('landing_reviews')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    setReviews((data ?? []) as Review[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    const author_name = form.author_name.trim()
    const text = form.text.trim()
    if (!author_name || !text) return
    setSaving(true)
    const maxOrder = reviews.reduce((m, r) => Math.max(m, r.sort_order ?? 0), 0)
    await supabase.from('landing_reviews').insert({
      author_name,
      text,
      stars: form.stars,
      sort_order: maxOrder + 1,
      visible: true,
    })
    setForm(empty)
    setSaving(false)
    load()
  }

  function openEdit(r: Review) {
    setEditId(r.id)
    setEditForm({ author_name: r.author_name, text: r.text, stars: r.stars })
  }

  async function handleEdit() {
    if (!editId) return
    setSaving(true)
    await supabase.from('landing_reviews').update({
      author_name: editForm.author_name.trim(),
      text: editForm.text.trim(),
      stars: editForm.stars,
    }).eq('id', editId)
    setEditId(null)
    setSaving(false)
    load()
  }

  async function toggleVisible(r: Review) {
    await supabase.from('landing_reviews').update({ visible: !r.visible }).eq('id', r.id)
    setReviews(prev => prev.map(x => x.id === r.id ? { ...x, visible: !x.visible } : x))
  }

  async function handleDelete(id: number) {
    setDeleting(true)
    await supabase.from('landing_reviews').delete().eq('id', id)
    setDeleteId(null)
    setDeleting(false)
    load()
  }

  const inp = 'bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-primary-500 transition-all'
  const visibleCount = reviews.filter(r => r.visible).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Отзывы на лендинге</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Управление отзывами, которые отображаются на главной странице сайта
        </p>
      </div>

      {/* Add form */}
      <div className="glass rounded-2xl border border-white/[0.06] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Plus size={14} className="text-primary-400" /> Добавить отзыв
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={form.author_name}
            onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}
            placeholder="Имя автора (напр. Анастасия К.)"
            className={inp}
          />
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 whitespace-nowrap">Оценка:</span>
            <StarPicker value={form.stars} onChange={v => setForm(f => ({ ...f, stars: v }))} />
          </div>
        </div>
        <textarea
          value={form.text}
          onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          placeholder="Текст отзыва..."
          rows={3}
          className={clsx(inp, 'w-full resize-none')}
        />
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={saving || !form.author_name.trim() || !form.text.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Добавить
          </button>
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Отзывы ({reviews.length})
          </h2>
          <span className="text-xs text-slate-500">
            Показывается на сайте: <span className="text-emerald-400 font-medium">{visibleCount}</span>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-primary-400" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-8">Нет отзывов</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            <AnimatePresence>
              {reviews.map(r => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={clsx(
                    'px-5 py-4 transition-colors',
                    !r.visible && 'opacity-50'
                  )}
                >
                  {editId === r.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          value={editForm.author_name}
                          onChange={e => setEditForm(f => ({ ...f, author_name: e.target.value }))}
                          className={inp}
                        />
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 whitespace-nowrap">Оценка:</span>
                          <StarPicker value={editForm.stars} onChange={v => setEditForm(f => ({ ...f, stars: v }))} />
                        </div>
                      </div>
                      <textarea
                        value={editForm.text}
                        onChange={e => setEditForm(f => ({ ...f, text: e.target.value }))}
                        rows={3}
                        className={clsx(inp, 'w-full resize-none')}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setEditId(null)}
                          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] text-sm transition-all">
                          Отмена
                        </button>
                        <button onClick={handleEdit} disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 text-sm transition-all">
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          Сохранить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <GripVertical size={14} className="text-slate-700 flex-shrink-0 mt-1 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <span className="text-sm font-medium text-white">{r.author_name}</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={11}
                                className={i < r.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}
                              />
                            ))}
                          </div>
                          {!r.visible && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500 border border-white/[0.04]">
                              скрыт
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">"{r.text}"</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleVisible(r)}
                          title={r.visible ? 'Скрыть' : 'Показать'}
                          className={clsx(
                            'p-2 rounded-lg transition-all',
                            r.visible
                              ? 'text-emerald-500 hover:bg-emerald-500/10'
                              : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.05]'
                          )}
                        >
                          {r.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                        <button onClick={() => openEdit(r)}
                          className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setDeleteId(r.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-2xl border border-red-500/20 p-6 max-w-sm w-full space-y-4"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
                <p className="text-white text-sm">Удалить этот отзыв с сайта?</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm">
                  Отмена
                </button>
                <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-60">
                  {deleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Удалить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
