import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Edit2, Users, Shield, UserCheck, UserX,
  Building2, GraduationCap, ChevronDown, ChevronUp, Mail, Key,
  ToggleLeft, ToggleRight, Save, X, Eye, EyeOff, Lock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import type { UserPermissions } from '../../types'
import type { AcademicClient } from '../../types/academic'
import clsx from 'clsx'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'user' | 'client'
  disabled: boolean
  permissions: UserPermissions
  password_plain: string | null
  created_at: string
  last_sign_in_at: string | null
}

const defaultPerms: UserPermissions = { suppliers: false, academic: false, academic_clients: [] }

async function callEdgeFn(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-manage-users', { body })
  if (error) return { error: error.message }
  return data ?? {}
}

export default function UsersAdmin() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [tab, setTab] = useState<'crm' | 'landing'>('crm')
  const [academicClients, setAcademicClients] = useState<AcademicClient[]>([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: 'user' as 'admin' | 'user' | 'client', disabled: false, permissions: defaultPerms })
  const [showClientsExpanded, setShowClientsExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: usersData }, { data: clientsData }] = await Promise.all([
      supabase.rpc('admin_list_users'),
      supabase.from('academic_clients').select('id, name').order('name'),
    ])
    setUsers((usersData ?? []) as AdminUser[])
    setAcademicClients((clientsData ?? []) as AcademicClient[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openEdit(u: AdminUser) {
    setEditUser(u)
    setEditForm({
      full_name: u.full_name ?? '',
      role: u.role,
      disabled: u.disabled,
      permissions: u.permissions ?? defaultPerms,
    })
    setShowClientsExpanded(false)
    setNewPassword('')
    setShowNewPassword(false)
    setShowCurrentPassword(false)
    setPasswordError('')
    setPasswordSuccess(false)
  }

  function toggleClientAccess(clientId: number) {
    setEditForm(f => {
      const current = f.permissions.academic_clients ?? []
      const has = current.includes(clientId)
      return {
        ...f,
        permissions: {
          ...f.permissions,
          academic_clients: has ? current.filter(id => id !== clientId) : [...current, clientId],
        },
      }
    })
  }

  async function handleSave() {
    if (!editUser) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name.trim() || null,
        role: editForm.role,
        disabled: editForm.disabled,
        permissions: editForm.permissions,
      })
      .eq('id', editUser.id)

    setSaving(false)
    if (!error) {
      setEditUser(null)
      await load()
    }
  }

  async function handlePasswordSave() {
    if (!editUser || !newPassword) return
    setPasswordSaving(true)
    setPasswordError('')
    setPasswordSuccess(false)
    const { error: rpcError } = await supabase.rpc('admin_update_password', {
      target_user_id: editUser.id,
      new_password: newPassword,
    })
    if (rpcError) {
      setPasswordError(rpcError.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      // Update local editUser so current password shows immediately
      setEditUser(u => u ? { ...u, password_plain: newPassword } : u)
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, password_plain: newPassword } : u))
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
    setPasswordSaving(false)
  }

  async function handleCreate() {
    setCreating(true)
    setCreateError('')
    const { error: rpcError } = await supabase.rpc('admin_create_user', {
      user_email: createForm.email.trim(),
      user_password: createForm.password,
      user_full_name: createForm.full_name.trim(),
    })
    if (rpcError) {
      setCreateError(rpcError.message)
    } else {
      setCreateOpen(false)
      setCreateForm({ email: '', password: '', full_name: '' })
      await load()
    }
    setCreating(false)
  }

  async function handleDelete(userId: string) {
    setDeleting(true)
    setUsers(prev => prev.filter(u => u.id !== userId))
    setDeleteId(null)
    await supabase.rpc('admin_delete_user', { target_user_id: userId })
    setDeleting(false)
    await load()
  }

  const allClientsAllowed = (editForm.permissions.academic_clients ?? []).length === 0

  const crmUsers = users.filter(u => u.role === 'admin' || u.role === 'user')
  const landingUsers = users.filter(u => u.role === 'client')
  const visibleUsers = tab === 'crm' ? crmUsers : landingUsers

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Пользователи</h1>
          <p className="text-sm text-slate-400 mt-0.5">Управление аккаунтами и правами доступа</p>
        </div>
        {tab === 'crm' && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold px-5 py-2.5 rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-200 text-sm">
            <Plus size={16} /> Добавить пользователя
          </motion.button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-navy-700 rounded-xl p-1 w-fit">
        {([['crm', `CRM (${crmUsers.length})`, Users], ['landing', `Лендинг (${landingUsers.length})`, GraduationCap]] as [typeof tab, string, React.ElementType][]).map(([t, label, Icon]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl border border-white/[0.06] p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl shimmer-bg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded shimmer-bg" />
                <div className="h-3 w-56 rounded shimmer-bg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {visibleUsers.map((u, i) => {
              const isMe = u.id === currentUser?.id
              const perms = u.permissions ?? defaultPerms
              return (
                <motion.div key={u.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: i * 0.04 }}
                  className={clsx(
                    'glass rounded-2xl border p-5 transition-all duration-200',
                    u.disabled ? 'border-white/[0.03] opacity-60' : 'border-white/[0.06] hover:border-white/10',
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={clsx(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white',
                        u.role === 'admin'
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                          : 'bg-gradient-to-br from-primary-600 to-cyan-600',
                      )}>
                        {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                      {u.role === 'admin' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                          <Shield size={9} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{u.full_name || '—'}</span>
                        {isMe && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-primary-500/15 text-primary-400 rounded-md border border-primary-500/20">Вы</span>
                        )}
                        {u.disabled && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded-md">Отключён</span>
                        )}
                        <span className={clsx(
                          'text-[10px] px-1.5 py-0.5 rounded-md',
                          u.role === 'admin' ? 'bg-amber-500/15 text-amber-400' :
                          u.role === 'client' ? 'bg-violet-500/15 text-violet-400' :
                          'bg-slate-500/15 text-slate-400',
                        )}>
                          {u.role === 'admin' ? 'Администратор' : u.role === 'client' ? 'Клиент' : 'Пользователь'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                      {u.role !== 'client' && (
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <PermBadge allowed={perms.suppliers} icon={<Building2 size={10} />} label="Поставщики" />
                          <PermBadge allowed={perms.academic} icon={<GraduationCap size={10} />} label={
                            perms.academic
                              ? perms.academic_clients?.length
                                ? `Учёба (${perms.academic_clients.length} студ.)`
                                : 'Учёба (все)'
                              : 'Учёба'
                          } />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(u)}
                        className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                        <Edit2 size={14} />
                      </button>
                      {!isMe && (
                        <button onClick={() => setDeleteId(u.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Редактировать пользователя" maxWidth="max-w-lg">
        {editUser && (
          <div className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Mail size={12} /> Email
              </label>
              <div className="w-full bg-navy-800 border border-navy-600 text-slate-500 px-4 py-2.5 rounded-xl text-sm">
                {editUser.email}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Имя</label>
              <input
                value={editForm.full_name}
                onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Иван Петров"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
              />
            </div>

            {/* Role & Disabled */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Shield size={12} /> Роль
                </label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value as 'admin' | 'user' | 'client' }))}
                  className="w-full bg-navy-700 border border-navy-500 text-white px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
                >
                  <option value="user">Пользователь</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <UserX size={12} /> Статус
                </label>
                <button
                  onClick={() => setEditForm(f => ({ ...f, disabled: !f.disabled }))}
                  className={clsx(
                    'w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                    editForm.disabled
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                  )}
                >
                  {editForm.disabled ? (
                    <><UserX size={14} /> Отключён</>
                  ) : (
                    <><UserCheck size={14} /> Активен</>
                  )}
                  {editForm.disabled
                    ? <ToggleLeft size={18} className="text-red-400" />
                    : <ToggleRight size={18} className="text-emerald-400" />}
                </button>
              </div>
            </div>

            {/* Permissions — only meaningful for non-admin */}
            {editForm.role !== 'admin' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Доступ к разделам</p>

                {/* Suppliers */}
                <PermToggle
                  icon={<Building2 size={14} />}
                  label="Поставщики"
                  description="Раздел /поставщики"
                  enabled={editForm.permissions.suppliers}
                  onChange={v => setEditForm(f => ({ ...f, permissions: { ...f.permissions, suppliers: v } }))}
                />

                {/* Academic */}
                <PermToggle
                  icon={<GraduationCap size={14} />}
                  label="Учебные услуги"
                  description="Раздел /учёба"
                  enabled={editForm.permissions.academic}
                  onChange={v => setEditForm(f => ({ ...f, permissions: { ...f.permissions, academic: v, academic_clients: v ? f.permissions.academic_clients : [] } }))}
                />

                {/* Academic clients sub-permission */}
                {editForm.permissions.academic && (
                  <div className="ml-6 rounded-xl border border-white/[0.07] bg-navy-800/60 overflow-hidden">
                    <button
                      onClick={() => setShowClientsExpanded(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:text-white transition-colors"
                    >
                      <span>
                        {allClientsAllowed
                          ? 'Доступны все студенты'
                          : `Доступны студенты: ${editForm.permissions.academic_clients.length} из ${academicClients.length}`}
                      </span>
                      {showClientsExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                    </button>
                    <AnimatePresence>
                      {showClientsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-white/[0.06]"
                        >
                          <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
                            {/* "All" option */}
                            <label className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allClientsAllowed}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setEditForm(f => ({ ...f, permissions: { ...f.permissions, academic_clients: [] } }))
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-primary-500"
                              />
                              <span className="text-sm text-slate-300 font-medium">Все студенты</span>
                            </label>
                            <div className="h-px bg-white/[0.06] my-1" />
                            {academicClients.map(c => {
                              const checked = !allClientsAllowed && editForm.permissions.academic_clients.includes(c.id)
                              return (
                                <label key={c.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      if (allClientsAllowed) {
                                        setEditForm(f => ({ ...f, permissions: { ...f.permissions, academic_clients: [c.id] } }))
                                      } else {
                                        toggleClientAccess(c.id)
                                      }
                                    }}
                                    className="w-3.5 h-3.5 accent-primary-500"
                                  />
                                  <span className="text-sm text-slate-400">{c.name}</span>
                                </label>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

            {/* Password */}
            <div className="rounded-xl border border-white/[0.07] bg-navy-800/40 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Lock size={11} /> Пароль
              </p>

              {/* Current password */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Текущий пароль</label>
                <div className="flex items-center gap-2 bg-navy-700 border border-navy-500 rounded-xl px-4 py-2.5">
                  <span className="flex-1 text-sm font-mono text-slate-300 select-all">
                    {editUser.password_plain
                      ? (showCurrentPassword ? editUser.password_plain : '•'.repeat(editUser.password_plain.length))
                      : <span className="text-slate-600 italic font-sans">не сохранён</span>}
                  </span>
                  {editUser.password_plain && (
                    <button type="button" onClick={() => setShowCurrentPassword(v => !v)}
                      className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
                      {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Новый пароль</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setPasswordError(''); setPasswordSuccess(false) }}
                    placeholder="Новый пароль (мин. 6 символов)"
                    className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 pr-10 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  onClick={handlePasswordSave}
                  disabled={!newPassword || newPassword.length < 6 || passwordSaving}
                  className="px-4 py-2.5 rounded-xl bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 border border-primary-500/20 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                  {passwordSaving ? <div className="w-3.5 h-3.5 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" /> : <Key size={13} />}
                  Сохранить
                </button>
              </div>
              {passwordError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{passwordError}</p>}
              {passwordSuccess && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">Пароль успешно изменён</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditUser(null)} className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2">
                <X size={14} /> Отмена
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                Сохранить
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setCreateError('') }} title="Новый пользователь" maxWidth="max-w-sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5"><Users size={12} /> Имя</label>
            <input
              value={createForm.full_name}
              onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Иван Петров"
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5"><Mail size={12} /> Email</label>
            <input
              type="email"
              value={createForm.email}
              onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5"><Key size={12} /> Пароль</label>
            <input
              type="password"
              value={createForm.password}
              onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Минимум 6 символов"
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
            />
          </div>
          {createError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{createError}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setCreateOpen(false); setCreateError('') }} className="flex-1 btn-secondary text-sm">Отмена</button>
            <button
              onClick={handleCreate}
              disabled={!createForm.email.trim() || !createForm.password || creating}
              className="flex-1 btn-primary text-sm flex items-center justify-center gap-2"
            >
              {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={14} />}
              Создать
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Удалить пользователя?" maxWidth="max-w-sm">
        <p className="text-sm text-slate-400 mb-6">
          Аккаунт и все данные пользователя будут удалены безвозвратно.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button
            onClick={() => deleteId && handleDelete(deleteId)}
            disabled={deleting}
            className="flex-1 btn-danger text-sm flex items-center justify-center gap-2"
          >
            {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={14} />}
            Удалить
          </button>
        </div>
      </Modal>
    </div>
  )
}

function PermBadge({ allowed, icon, label }: { allowed: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span className={clsx(
      'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md',
      allowed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-600 line-through',
    )}>
      {icon} {label}
    </span>
  )
}

function PermToggle({ icon, label, description, enabled, onChange }: {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
        enabled
          ? 'bg-emerald-500/[0.07] border-emerald-500/20 hover:border-emerald-500/30'
          : 'bg-navy-800/50 border-white/[0.06] hover:border-white/10',
      )}
    >
      <div className={clsx('flex-shrink-0', enabled ? 'text-emerald-400' : 'text-slate-600')}>
        {icon}
      </div>
      <div className="flex-1">
        <p className={clsx('text-sm font-medium', enabled ? 'text-white' : 'text-slate-500')}>{label}</p>
        <p className="text-xs text-slate-600">{description}</p>
      </div>
      {enabled
        ? <ToggleRight size={18} className="text-emerald-400 flex-shrink-0" />
        : <ToggleLeft size={18} className="text-slate-600 flex-shrink-0" />}
    </button>
  )
}
