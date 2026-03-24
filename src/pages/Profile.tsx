import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Shield, Calendar, Save, Check, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import clsx from 'clsx'

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="glass rounded-2xl border border-white/[0.06] overflow-hidden"
    >
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center">
          <Icon size={15} className="text-primary-400" />
        </div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  )
}

function SaveButton({ loading, saved }: { loading: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || saved}
      className={clsx(
        'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
        saved
          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white shadow-glow hover:shadow-glow-lg',
      )}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : saved ? (
        <Check size={15} />
      ) : (
        <Save size={15} />
      )}
      {saved ? 'Сохранено' : 'Сохранить'}
    </button>
  )
}

export default function Profile() {
  const { user, profile, isAdmin, updateProfile, updateEmail, updatePassword } = useAuth()

  // Name form
  const [name, setName] = useState(profile?.full_name ?? '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState('')

  // Email form
  const [email, setEmail] = useState(user?.email ?? '')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  const initials = (profile?.full_name ?? user?.email ?? 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setNameSaving(true)
    setNameError('')
    const { error } = await updateProfile(name.trim())
    setNameSaving(false)
    if (error) {
      setNameError(error.message)
    } else {
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2500)
    }
  }

  async function handleEmailSave(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setEmailSaving(true)
    setEmailError('')
    const { error } = await updateEmail(email.trim())
    setEmailSaving(false)
    if (error) {
      setEmailError(error.message)
    } else {
      setEmailSaved(true)
      setTimeout(() => setEmailSaved(false), 2500)
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPwError('Пароли не совпадают')
      return
    }
    if (newPassword.length < 6) {
      setPwError('Минимум 6 символов')
      return
    }
    setPwSaving(true)
    setPwError('')
    const { error } = await updatePassword(newPassword)
    setPwSaving(false)
    if (error) {
      setPwError(error.message)
    } else {
      setPwSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwSaved(false), 2500)
    }
  }

  const passwordStrength = (() => {
    if (!newPassword) return 0
    let s = 0
    if (newPassword.length >= 6) s++
    if (newPassword.length >= 10) s++
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) s++
    if (/\d/.test(newPassword)) s++
    if (/[^A-Za-z0-9]/.test(newPassword)) s++
    return s
  })()

  const strengthLabel = ['', 'Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Отличный'][passwordStrength]
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-green-500'][passwordStrength]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-600 flex items-center justify-center text-2xl font-bold text-white shadow-glow">
            {initials}
          </div>
          {isAdmin && (
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg">
              <Shield size={12} className="text-white" />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{profile?.full_name ?? 'Профиль'}</h1>
          <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
            {isAdmin
              ? <><Shield size={12} className="text-amber-400" /> Администратор</>
              : <><User size={12} /> Пользователь</>
            }
          </p>
        </div>
      </motion.div>

      {/* Personal info */}
      <Section title="Личная информация" icon={User}>
        <form onSubmit={handleNameSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Полное имя</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setNameSaved(false) }}
              placeholder="Иван Иванов"
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
            />
          </div>
          {nameError && (
            <p className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle size={13} /> {nameError}
            </p>
          )}
          <div className="flex justify-end">
            <SaveButton loading={nameSaving} saved={nameSaved} />
          </div>
        </form>
      </Section>

      {/* Email */}
      <Section title="Электронная почта" icon={Mail}>
        <form onSubmit={handleEmailSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email-адрес</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailSaved(false) }}
              placeholder="you@example.com"
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              После изменения на новый адрес придёт письмо с подтверждением.
            </p>
          </div>
          {emailError && (
            <p className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle size={13} /> {emailError}
            </p>
          )}
          <div className="flex justify-end">
            <SaveButton loading={emailSaving} saved={emailSaved} />
          </div>
        </form>
      </Section>

      {/* Password */}
      <Section title="Изменить пароль" icon={Lock}>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Новый пароль</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPwSaved(false) }}
                placeholder="Минимум 6 символов"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 pr-10 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'h-1 flex-1 rounded-full transition-all duration-300',
                        i < passwordStrength ? strengthColor : 'bg-navy-600',
                      )}
                    />
                  ))}
                </div>
                {strengthLabel && (
                  <p className="text-[11px] text-slate-500">{strengthLabel}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Повторите пароль</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPwSaved(false) }}
                placeholder="Повторите новый пароль"
                className={clsx(
                  'w-full bg-navy-700 border text-white placeholder-slate-600 px-4 py-2.5 pr-10 rounded-xl focus:border-primary-500 outline-none transition-all text-sm',
                  confirmPassword && confirmPassword !== newPassword
                    ? 'border-red-500/50'
                    : 'border-navy-500',
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {pwError && (
            <p className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle size={13} /> {pwError}
            </p>
          )}
          <div className="flex justify-end">
            <SaveButton loading={pwSaving} saved={pwSaved} />
          </div>
        </form>
      </Section>

      {/* Account info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
        className="glass rounded-2xl border border-white/[0.06] overflow-hidden"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center">
            <Calendar size={15} className="text-primary-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Информация об аккаунте</h2>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Роль</p>
            <p className="text-sm font-medium text-white flex items-center gap-1.5">
              {isAdmin
                ? <><Shield size={13} className="text-amber-400" /> Администратор</>
                : <><User size={13} className="text-primary-400" /> Пользователь</>
              }
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">ID аккаунта</p>
            <p className="text-xs font-mono text-slate-400 truncate">{user?.id?.slice(0, 18)}…</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Дата регистрации</p>
            <p className="text-sm font-medium text-white">
              {profile?.created_at
                ? format(new Date(profile.created_at), 'd MMMM yyyy', { locale: ru })
                : '—'
              }
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Последний вход</p>
            <p className="text-sm font-medium text-white">
              {user?.last_sign_in_at
                ? format(new Date(user.last_sign_in_at), 'd MMM yyyy, HH:mm', { locale: ru })
                : '—'
              }
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
