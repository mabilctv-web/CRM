import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Search, Plus, Phone, Mail, MapPin,
  Edit2, Trash2, ChevronRight, X, Check, Tag,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import Modal from '../components/ui/Modal'
import type { Supplier } from '../types'
import { SUPPLIER_STATUSES, SUPPLIER_CATEGORIES } from '../types'
import clsx from 'clsx'

const emptyForm = { name: '', contact_person: '', email: '', phone: '', address: '', category: '', status: 'active' }

export default function Suppliers() {
  const { isAdmin } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false })
    setSuppliers((data ?? []) as Supplier[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({ name: s.name, contact_person: s.contact_person ?? '', email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '', category: s.category ?? '', status: s.status })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form, updated_at: new Date().toISOString() }
    if (editing) {
      await supabase.from('suppliers').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('suppliers').insert(payload)
    }
    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function handleDelete(id: number) {
    await supabase.from('suppliers').delete().eq('id', id)
    setDeleteId(null)
    load()
  }

  async function toggleStatus(s: Supplier) {
    const next = s.status === 'active' ? 'inactive' : 'active'
    await supabase.from('suppliers').update({ status: next }).eq('id', s.id)
    setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, status: next } : x))
  }

  const categories = useMemo(() => {
    const cats = [...new Set(suppliers.map(s => s.category).filter(Boolean) as string[])]
    return cats.sort()
  }, [suppliers])

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q) || (s.contact_person ?? '').toLowerCase().includes(q)
    const matchCat = filterCategory === 'all' || s.category === filterCategory
    return matchSearch && matchCat
  })

  const grouped = useMemo(() => {
    if (filterCategory !== 'all' || search) return null
    const result: Record<string, Supplier[]> = {}
    for (const s of filtered) {
      const cat = s.category ?? 'Без категории'
      if (!result[cat]) result[cat] = []
      result[cat].push(s)
    }
    return result
  }, [filtered, filterCategory, search])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Поставщики</h1>
          <p className="text-sm text-slate-400 mt-0.5">{suppliers.length} в базе</p>
        </div>
        {isAdmin && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={openAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold px-5 py-2.5 rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-200 text-sm"
          >
            <Plus size={16} />
            Добавить поставщика
          </motion.button>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию, категории, контакту..."
            className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-11 pr-4 py-2.5 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <Tag size={14} className="text-slate-500 flex-shrink-0" />
          {[{ value: 'all', label: 'Все' }, ...categories.map(c => ({ value: c, label: c }))].map(c => (
            <button
              key={c.value}
              onClick={() => setFilterCategory(c.value)}
              className={clsx(
                'text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all',
                filterCategory === c.value
                  ? 'bg-primary-600/30 text-primary-300 border border-primary-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 space-y-3 border border-white/[0.06]">
              <div className="flex gap-3"><div className="w-10 h-10 rounded-xl shimmer-bg" /><div className="flex-1 space-y-2"><div className="h-4 rounded shimmer-bg" /><div className="h-3 w-2/3 rounded shimmer-bg" /></div></div>
              <div className="h-px bg-white/[0.06]" />
              <div className="space-y-2"><div className="h-3 rounded shimmer-bg" /><div className="h-3 w-3/4 rounded shimmer-bg" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mb-4">
            <Building2 size={28} className="text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">Поставщики не найдены</p>
          <p className="text-slate-600 text-sm mt-1">Попробуйте изменить параметры поиска</p>
        </div>
      ) : grouped ? (
        <div className="space-y-8">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'ru')).map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-4">
                <Tag size={14} className="text-cyan-400" />
                <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">{cat}</h2>
                <span className="text-xs text-slate-600 ml-1">{items.length}</span>
                <div className="flex-1 h-px bg-white/[0.06] ml-2" />
              </div>
              <SupplierGrid items={items} isAdmin={isAdmin} onEdit={openEdit} onDelete={id => setDeleteId(id)} onToggle={toggleStatus} />
            </div>
          ))}
        </div>
      ) : (
        <SupplierGrid items={filtered} isAdmin={isAdmin} onEdit={openEdit} onDelete={id => setDeleteId(id)} onToggle={toggleStatus} />
      )}

      {/* Add/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактировать поставщика' : 'Новый поставщик'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Название *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ООО Рога и Копыта" className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Контактное лицо</label>
              <input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="Иван Иванов" className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Телефон</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+7 999 000-00-00" className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@company.ru" className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Категория</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-navy-700 border border-navy-500 text-white px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm">
                <option value="">— Выберите —</option>
                {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Статус</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-navy-700 border border-navy-500 text-white px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm">
                {SUPPLIER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Адрес</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="г. Москва, ул. Примерная, 1" className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
            <button onClick={handleSave} disabled={!form.name || saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Удалить поставщика?" maxWidth="max-w-sm">
        <p className="text-sm text-slate-400 mb-6">Это действие невозможно отменить. Все связанные данные также будут удалены.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 btn-danger text-sm">Удалить</button>
        </div>
      </Modal>
    </div>
  )
}

function SupplierGrid({ items, isAdmin, onEdit, onDelete, onToggle }: {
  items: Supplier[]
  isAdmin: boolean
  onEdit: (s: Supplier) => void
  onDelete: (id: number) => void
  onToggle: (s: Supplier) => void
}) {
  return (
    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {items.map(s => (
          <motion.div
            key={s.id}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover group overflow-hidden"
          >
            <div className="h-[2px] w-full bg-gradient-to-r from-primary-600/60 via-cyan-500/40 to-transparent" />
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center text-primary-400 font-bold text-base flex-shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{s.name}</h3>
                  <p className="text-xs text-slate-500 truncate">{s.category ?? 'Без категории'}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="space-y-2 mb-4">
                {s.contact_person && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-4 h-4 rounded bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px]">👤</span>
                    </div>
                    <span className="truncate">{s.contact_person}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Phone size={12} className="flex-shrink-0 text-slate-600" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail size={12} className="flex-shrink-0 text-slate-600" />
                    <span className="truncate">{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin size={12} className="flex-shrink-0 text-slate-600" />
                    <span className="truncate">{s.address}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                <Link
                  to={`/suppliers/${s.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] py-2 rounded-lg transition-all"
                >
                  Подробнее <ChevronRight size={12} />
                </Link>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => onToggle(s)}
                      title={s.status === 'active' ? 'Деактивировать' : 'Активировать'}
                      className={clsx('p-2 rounded-lg transition-all', s.status === 'active' ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-white/[0.05]')}
                    >
                      <Check size={14} />
                    </button>
                    <button onClick={() => onEdit(s)} className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => onDelete(s.id)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
