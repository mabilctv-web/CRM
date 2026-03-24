import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, Save, CreditCard } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import type { PaymentContact } from '../../types/academic'

const emptyForm = { method: '', details: '', comment: '' }

export default function PaymentContacts() {
  const [contacts, setContacts] = useState<PaymentContact[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentContact | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase.from('payment_contacts').select('*').order('sort_order')
    setContacts((data ?? []) as PaymentContact[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(c: PaymentContact) {
    setEditing(c)
    setForm({ method: c.method, details: c.details, comment: c.comment ?? '' })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      method: form.method.trim(),
      details: form.details.trim(),
      comment: form.comment.trim() || null,
      sort_order: editing ? editing.sort_order : contacts.length,
    }
    if (editing) {
      await supabase.from('payment_contacts').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('payment_contacts').insert(payload)
    }
    setSaving(false); setModalOpen(false); load()
  }

  async function handleDelete(id: number) {
    await supabase.from('payment_contacts').delete().eq('id', id)
    setDeleteId(null)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Реквизиты для оплаты</h1>
          <p className="text-sm text-slate-400 mt-0.5">Контакты и реквизиты для получения оплаты от клиентов</p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={openAdd}
          className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold px-5 py-2.5 rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-200 text-sm">
          <Plus size={16} /> Добавить реквизит
        </motion.button>
      </div>

      <div className="glass rounded-xl border border-primary-500/20 p-4 flex items-start gap-3 bg-primary-600/5">
        <CreditCard size={18} className="text-primary-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-slate-400">
          Реквизиты отображаются на вкладке «Финансы» каждого клиента. Клиент может скопировать нужный способ оплаты.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl border border-white/[0.06] p-5">
              <div className="h-4 w-48 rounded shimmer-bg mb-2" />
              <div className="h-3 w-32 rounded shimmer-bg" />
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="glass rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mb-4">
            <CreditCard size={28} className="text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">Реквизитов нет</p>
          <p className="text-slate-600 text-sm mt-1">Добавьте способы оплаты для клиентов</p>
          <button onClick={openAdd} className="mt-4 btn-primary text-sm flex items-center gap-2">
            <Plus size={14} /> Добавить реквизит
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {contacts.map((c, i) => (
              <motion.div key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
                transition={{ duration: 0.25, ease: 'easeOut', delay: i * 0.04 }}
                className="glass rounded-2xl border border-white/[0.06] hover:border-white/10 transition-all duration-200 p-5 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard size={16} className="text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary-400 uppercase tracking-wide">{c.method}</p>
                    <p className="text-base font-mono text-white mt-0.5">{c.details}</p>
                    {c.comment && <p className="text-xs text-slate-500 mt-1">{c.comment}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteId(c.id)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактировать реквизит' : 'Новый реквизит'} maxWidth="max-w-sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Способ оплаты *</label>
            <input value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} placeholder="СБП, Карта Сбербанк, USDT..."
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Реквизиты *</label>
            <input value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} placeholder="+7 999 123 45 67 или номер карты"
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Комментарий</label>
            <input value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} placeholder="Иванов И.И. / Тинькофф"
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
            <button onClick={handleSave} disabled={!form.method.trim() || !form.details.trim() || saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editing ? <Save size={14} /> : <Plus size={14} />)}
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Удалить реквизит?" maxWidth="max-w-sm">
        <p className="text-sm text-slate-400 mb-6">Реквизит будет удалён из профилей всех клиентов.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 btn-danger text-sm">Удалить</button>
        </div>
      </Modal>
    </div>
  )
}
