import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, GraduationCap, BookOpen, CalendarCheck, AlertTriangle, Wallet, Edit2, Shield, Library, CalendarDays, Send, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { AcademicClient, AcademicSubject } from '../../types/academic'
import AssignmentsTab from './tabs/AssignmentsTab'
import GradesTab from './tabs/GradesTab'
import AttendanceTab from './tabs/AttendanceTab'
import MistakesTab from './tabs/MistakesTab'
import FinancesTab from './tabs/FinancesTab'
import SubjectsTab from './tabs/SubjectsTab'
import ScheduleTab from './tabs/ScheduleTab'
import Modal from '../../components/ui/Modal'
import clsx from 'clsx'

const TABS = [
  { key: 'assignments', label: 'Задания',       icon: BookOpen },
  { key: 'grades',      label: 'Успеваемость',  icon: GraduationCap },
  { key: 'attendance',  label: 'Явки',          icon: CalendarCheck },
  { key: 'subjects',    label: 'Предметы',      icon: Library },
  { key: 'schedule',    label: 'Расписание',    icon: CalendarDays },
  { key: 'mistakes',    label: 'Ошибки',        icon: AlertTriangle },
  { key: 'finances',    label: 'Финансы',       icon: Wallet },
]

const emptyForm = { last_name: '', first_name: '', patronymic: '', university: '', faculty: '', year_of_study: '', semester: '', notes: '' }

function fullName(c: { last_name?: string | null; first_name?: string | null; patronymic?: string | null; name: string }) {
  const parts = [c.last_name, c.first_name, c.patronymic].filter(Boolean)
  return parts.length ? parts.join(' ') : c.name
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin, allowedAcademicClients } = useAuth()
  const clientId = parseInt(id!)

  // Non-admin with restricted client list: block access to unauthorized clients
  if (!isAdmin && allowedAcademicClients.length > 0 && !allowedAcademicClients.includes(clientId)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <span className="text-2xl">🔒</span>
        </div>
        <p className="text-white font-semibold">Нет доступа</p>
        <p className="text-slate-500 text-sm mt-1">У вас нет доступа к данному студенту</p>
        <button onClick={() => navigate('/academic/clients')} className="mt-4 btn-secondary text-sm">Назад</button>
      </div>
    )
  }

  const [client, setClient] = useState<AcademicClient | null>(null)
  const [subjects, setSubjects] = useState<AcademicSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('assignments')
  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [tgCopied, setTgCopied] = useState(false)

  function copyTelegramLink() {
    const link = `https://t.me/studyDB_bot?start=client_${clientId}`
    navigator.clipboard.writeText(link)
    setTgCopied(true)
    setTimeout(() => setTgCopied(false), 2500)
  }

  async function loadClient() {
    const { data } = await supabase.from('academic_clients').select('*').eq('id', clientId).single()
    setClient(data as AcademicClient)
    setLoading(false)
  }

  async function loadSubjects() {
    const { data } = await supabase.from('academic_subjects').select('*').eq('client_id', clientId).order('created_at')
    setSubjects((data ?? []) as AcademicSubject[])
  }

  useEffect(() => {
    loadClient()
    loadSubjects()
  }, [clientId])

  function openEdit() {
    if (!client) return
    setForm({
      last_name:    client.last_name   ?? '',
      first_name:   client.first_name  ?? '',
      patronymic:   client.patronymic  ?? '',
      university:   client.university  ?? '',
      faculty:      client.faculty     ?? '',
      year_of_study: String(client.year_of_study ?? ''),
      semester:     client.semester    ?? '',
      notes:        client.notes       ?? '',
    })
    setEditModal(true)
  }

  async function handleSave() {
    if (!client) return
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
    await supabase.from('academic_clients').update(payload).eq('id', client.id)
    setSaving(false)
    setEditModal(false)
    loadClient()
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-6 w-40 rounded shimmer-bg" />
        <div className="glass rounded-2xl border border-white/[0.06] p-6 space-y-3">
          <div className="h-8 w-64 rounded shimmer-bg" />
          <div className="h-4 w-48 rounded shimmer-bg" />
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-slate-400">Клиент не найден</p>
        <button onClick={() => navigate('/academic/clients')} className="mt-4 btn-secondary text-sm">← Назад</button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/academic/clients')}
          className="mt-1 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.07] transition-all flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-lg flex-shrink-0">
              {(client.last_name || client.name).charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{fullName(client)}</h1>
                {!client.active && <span className="text-[10px] px-1.5 py-0.5 bg-slate-500/15 text-slate-500 rounded-md">Архив</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mt-0.5">
                {client.university && <span>{client.university}</span>}
                {client.faculty && <span>• {client.faculty}</span>}
                {client.year_of_study && <span>• {client.year_of_study} курс</span>}
                {client.semester && <span>• {client.semester}</span>}
              </div>
            </div>
          </div>
          {client.notes && <p className="mt-2 text-xs text-slate-500 ml-[52px]">{client.notes}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {client.telegram_chat_id ? (
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-emerald-400 bg-emerald-500/10 text-xs font-medium">
              <CheckCircle2 size={13} /> Telegram
            </span>
          ) : (
            <button onClick={copyTelegramLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-all text-sm flex-shrink-0">
              {tgCopied
                ? <><CheckCircle2 size={14} className="text-emerald-400" /> <span className="text-emerald-400 text-xs">Скопировано!</span></>
                : <><Send size={14} /> <span className="text-xs">Telegram</span></>
              }
            </button>
          )}
          {isAdmin && (
            <button onClick={openEdit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all text-sm">
              <Edit2 size={14} /> Изменить
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-800/60 rounded-xl p-1 border border-white/[0.06] overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 relative',
              activeTab === key
                ? 'text-white bg-primary-600/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]',
            )}
          >
            {activeTab === key && (
              <motion.div layoutId="activeTab"
                className="absolute inset-0 bg-primary-600/20 rounded-lg border border-primary-500/20"
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              />
            )}
            <Icon size={14} className="relative z-10" />
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div key={activeTab} className="page-enter">
        {activeTab === 'assignments' && (
          <AssignmentsTab clientId={clientId} subjects={subjects} isAdmin={isAdmin} />
        )}
        {activeTab === 'grades' && (
          <GradesTab clientId={clientId} subjects={subjects} isAdmin={isAdmin} onSubjectsChange={loadSubjects} />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTab clientId={clientId} subjects={subjects} isAdmin={isAdmin} client={client} />
        )}
        {activeTab === 'subjects' && (
          <SubjectsTab clientId={clientId} subjects={subjects} client={client} />
        )}
        {activeTab === 'schedule' && (
          <ScheduleTab client={client} subjects={subjects} isAdmin={isAdmin} onClientChange={loadClient} />
        )}
        {activeTab === 'mistakes' && (
          <MistakesTab clientId={clientId} isAdmin={isAdmin} />
        )}
        {activeTab === 'finances' && (
          <FinancesTab clientId={clientId} isAdmin={isAdmin} />
        )}
      </div>

      {/* Edit modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Редактировать клиента" maxWidth="max-w-md">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
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
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Университет</label>
            <input value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))}
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Факультет / Специальность</label>
            <input value={form.faculty} onChange={e => setForm(f => ({ ...f, faculty: e.target.value }))}
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Курс</label>
              <input type="number" min="1" max="6" value={form.year_of_study} onChange={e => setForm(f => ({ ...f, year_of_study: e.target.value }))}
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Семестр</label>
              <input value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Заметки</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setEditModal(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
            <button onClick={handleSave} disabled={(!form.last_name.trim() && !form.first_name.trim()) || saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Сохранить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
