import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, GraduationCap, ChevronRight, Edit2, Trash2, Users, BookOpen, Wallet, ToggleLeft, ToggleRight, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import type { AcademicClient } from '../../types/academic'
import clsx from 'clsx'

const emptyForm = {
  last_name: '', first_name: '', patronymic: '', university: '', faculty: '', year_of_study: '', semester: '', notes: '',
}

function fullName(c: { last_name?: string | null; first_name?: string | null; patronymic?: string | null; name: string }) {
  const parts = [c.last_name, c.first_name, c.patronymic].filter(Boolean)
  return parts.length ? parts.join(' ') : c.name
}

export default function ClientList() {
  const { isAdmin, allowedAcademicClients } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState<AcademicClient[]>([])
  const [stats, setStats] = useState<Record<number, { assignments: number; pending: number; debt: number; income: number }>>({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicClient | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  async function load() {
    let query = supabase.from('academic_clients').select('*').order('created_at', { ascending: false })
    // Filter by allowed clients if non-admin with restricted access
    if (!isAdmin && allowedAcademicClients.length > 0) {
      query = query.in('id', allowedAcademicClients)
    }
    const { data } = await query
    const clients = (data ?? []) as AcademicClient[]
    setClients(clients)

    // Load stats for each client
    if (clients.length > 0) {
      const ids = clients.map(c => c.id)
      const [asgn, fin] = await Promise.all([
        supabase.from('academic_assignments').select('client_id, status').in('client_id', ids),
        supabase.from('academic_finances').select('client_id, debt, income').in('client_id', ids),
      ])
      const statsMap: typeof stats = {}
      for (const cl of clients) {
        const a = (asgn.data ?? []).filter(x => x.client_id === cl.id)
        const f = (fin.data ?? []).filter(x => x.client_id === cl.id)
        statsMap[cl.id] = {
          assignments: a.length,
          pending: a.filter(x => x.status === 'queue' || x.status === 'in_progress').length,
          debt: f.reduce((s, x) => s + (x.debt || 0), 0),
          income: f.reduce((s, x) => s + (x.income || 0), 0),
        }
      }
      setStats(statsMap)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [isAdmin, allowedAcademicClients.join(',')])

  function openAdd() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(c: AcademicClient) {
    setEditing(c)
    setForm({
      last_name:    c.last_name   ?? '',
      first_name:   c.first_name  ?? '',
      patronymic:   c.patronymic  ?? '',
      university:   c.university  ?? '',
      faculty:      c.faculty     ?? '',
      year_of_study: String(c.year_of_study ?? ''),
      semester:     c.semester    ?? '',
      notes:        c.notes       ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const computedName = [form.last_name, form.first_name, form.patronymic].filter(s => s.trim()).join(' ').trim()
    const payload = {
      last_name:    form.last_name.trim()   || null,
      first_name:   form.first_name.trim()  || null,
      patronymic:   form.patronymic.trim()  || null,
      name:         computedName,
      university:   form.university.trim()  || null,
      faculty:      form.faculty.trim()     || null,
      year_of_study: form.year_of_study ? parseInt(form.year_of_study) : null,
      semester:     form.semester.trim()    || null,
      notes:        form.notes.trim()       || null,
    }
    if (editing) {
      await supabase.from('academic_clients').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('academic_clients').insert(payload)
    }
    setSaving(false); setModalOpen(false); load()
  }

  async function handleDelete(id: number) {
    await supabase.from('academic_clients').delete().eq('id', id)
    setDeleteId(null)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  async function toggleActive(c: AcademicClient) {
    await supabase.from('academic_clients').update({ active: !c.active }).eq('id', c.id)
    setClients(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x))
  }

  const balance = (id: number) => {
    const s = stats[id]
    if (!s) return 0
    return s.debt - s.income
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Учебные услуги</h1>
          <p className="text-sm text-slate-400 mt-0.5">Управление заданиями и успеваемостью клиентов</p>
        </div>
        {isAdmin && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={openAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold px-5 py-2.5 rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-200 text-sm">
            <Plus size={16} /> Добавить клиента
          </motion.button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl border border-white/[0.06] p-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl shimmer-bg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 rounded shimmer-bg" />
                  <div className="h-3 w-64 rounded shimmer-bg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="glass rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mb-4">
            <GraduationCap size={28} className="text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">Клиентов пока нет</p>
          <p className="text-slate-600 text-sm mt-1">Добавьте первого клиента</p>
          {isAdmin && (
            <button onClick={openAdd} className="mt-4 btn-primary text-sm flex items-center gap-2">
              <Plus size={14} /> Добавить клиента
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {clients.map((c, i) => {
              const s = stats[c.id]
              const bal = balance(c.id)
              return (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.25, ease: 'easeOut', delay: i * 0.05 }}
                  className={clsx(
                    'glass rounded-2xl border transition-all duration-200 p-5 group',
                    c.active ? 'border-white/[0.06] hover:border-white/10' : 'border-white/[0.03] opacity-60',
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg text-lg font-bold text-white">
                      {(c.last_name || c.name).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{fullName(c)}</span>
                        {c.telegram_chat_id && (
                          <span title="Telegram подключён" className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-sky-500/10 text-sky-400 rounded-md border border-sky-500/20">
                            <Send size={9} /> TG
                          </span>
                        )}
                        {!c.active && <span className="text-[10px] px-1.5 py-0.5 bg-slate-500/15 text-slate-500 rounded-md">Архив</span>}
                        {s?.pending > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 rounded-md border border-blue-500/20">
                            {s.pending} в работе
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-500">
                        {c.university && <span>{c.university}</span>}
                        {c.faculty && <span>• {c.faculty}</span>}
                        {c.year_of_study && <span>• {c.year_of_study} курс</span>}
                        {c.semester && <span>• {c.semester}</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <BookOpen size={11} /> {s?.assignments ?? 0} заданий
                        </span>
                        <span className={clsx('flex items-center gap-1 text-xs font-medium',
                          bal > 0 ? 'text-amber-400' : bal < 0 ? 'text-emerald-400' : 'text-slate-500')}>
                          <Wallet size={11} />
                          {bal > 0 ? `Долг: ${bal.toLocaleString('ru')} ₽` : bal < 0 ? `Переплата: ${Math.abs(bal).toLocaleString('ru')} ₽` : 'Расчёт закрыт'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isAdmin && (
                        <>
                          <button onClick={() => toggleActive(c)}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-all" title={c.active ? 'Архивировать' : 'Активировать'}>
                            {c.active ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                          </button>
                          <button onClick={() => openEdit(c)}
                            className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setDeleteId(c.id)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      <button onClick={() => navigate(`/academic/clients/${c.id}`)}
                        className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600/15 text-primary-400 hover:bg-primary-600/25 transition-all text-xs font-medium">
                        Открыть <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                  {c.notes && (
                    <p className="mt-3 text-xs text-slate-500 border-t border-white/[0.04] pt-3">{c.notes}</p>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактировать клиента' : 'Новый клиент'} maxWidth="max-w-md">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Фамилия *</label>
            <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Иванов"
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Имя *</label>
              <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Михаил"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Отчество</label>
              <input value={form.patronymic} onChange={e => setForm(f => ({ ...f, patronymic: e.target.value }))} placeholder="Дмитриевич"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Университет</label>
            <input value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))} placeholder="НИУ ВШЭ"
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Факультет / Специальность</label>
            <input value={form.faculty} onChange={e => setForm(f => ({ ...f, faculty: e.target.value }))} placeholder="Управление проектами"
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Курс</label>
              <input type="number" min="1" max="6" value={form.year_of_study} onChange={e => setForm(f => ({ ...f, year_of_study: e.target.value }))} placeholder="3"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Семестр</label>
              <input value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} placeholder="Весенний 2026"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Заметки</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Дополнительная информация..."
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
            <button onClick={handleSave} disabled={(!form.last_name.trim() && !form.first_name.trim()) || saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={14} />}
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Удалить клиента?" maxWidth="max-w-sm">
        <p className="text-sm text-slate-400 mb-6">Все задания, оценки, явки и финансы этого клиента будут удалены безвозвратно.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 btn-danger text-sm">Удалить</button>
        </div>
      </Modal>
    </div>
  )
}
