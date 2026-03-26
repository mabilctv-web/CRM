import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GraduationCap, ArrowLeft, Upload, X, Send, Calendar, BookOpen, Building2, Mail, FileText, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

function getMinDeadline() {
  const d = new Date()
  d.setHours(d.getHours() + 1)
  // datetime-local format: YYYY-MM-DDTHH:mm
  return d.toISOString().slice(0, 16)
}

export default function Order() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    email: '',
    subject: '',
    university: '',
    description: '',
    deadline: '',
    telegram: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function addFiles(list: FileList | null) {
    if (!list) return
    setFiles(prev => [...prev, ...Array.from(list)])
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Generate UUID client-side so we don't need to read back the row
      // (anon users can't SELECT orders due to RLS, but can INSERT)
      const orderId = crypto.randomUUID()

      const { error: orderError } = await supabase.from('orders').insert({
        id:              orderId,
        client_email:    form.email.trim(),
        client_telegram: form.telegram.trim() ? form.telegram.trim().replace('@', '') : null,
        subject:         form.subject.trim(),
        university:      form.university.trim() || null,
        description:     form.description.trim(),
        deadline:        form.deadline || null,
        source:          'website',
        order_type:      'one_time',
        status:          'new',
      })

      if (orderError) {
        setError('Ошибка при отправке. Попробуйте ещё раз.')
        setLoading(false)
        return
      }

      // Upload files to storage (anon upload enabled)
      for (const file of files) {
        const ext = file.name.split('.').pop() ?? 'bin'
        const path = `${orderId}/${Date.now()}_${file.name}`
        const { data: uploaded } = await supabase.storage
          .from('order-files')
          .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: true })
        if (uploaded) {
          const { data: { publicUrl } } = supabase.storage.from('order-files').getPublicUrl(path)
          await supabase.from('order_files').insert({ order_id: orderId, file_name: file.name, file_url: publicUrl })
        }
      }

      setDone(true)
    } catch {
      setError('Ошибка при отправке. Попробуйте снова.')
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-navy-900 text-white flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={36} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Заявка отправлена!</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Мы получили вашу заявку и свяжемся с вами в ближайшее время для согласования деталей.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-violet-600 text-white font-semibold px-6 py-3 rounded-xl text-sm"
          >
            На главную
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-navy-900/80 border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Назад
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
              <GraduationCap size={14} className="text-white" />
            </div>
            <span className="font-bold text-white">EduWork</span>
          </div>
        </div>
      </header>

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-bold mb-2">Разовое задание</h1>
            <p className="text-slate-400 mb-8">Заполните форму — мы свяжемся с вами в ближайшее время</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Ваш email *</label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="w-full bg-navy-800 border border-navy-600 text-white placeholder-slate-600 pl-11 pr-4 py-3 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Telegram */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Telegram</label>
              <div className="relative">
                <Send size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={form.telegram}
                  onChange={e => setForm(f => ({ ...f, telegram: e.target.value.replace('@', '') }))}
                  placeholder="@username (необязательно)"
                  className="w-full bg-navy-800 border border-navy-600 text-white placeholder-slate-600 pl-11 pr-4 py-3 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Предмет *</label>
              <div className="relative">
                <BookOpen size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text" required
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Например: Экономика, Математика, Маркетинг"
                  className="w-full bg-navy-800 border border-navy-600 text-white placeholder-slate-600 pl-11 pr-4 py-3 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* University */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Университет</label>
              <div className="relative">
                <Building2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={form.university}
                  onChange={e => setForm(f => ({ ...f, university: e.target.value }))}
                  placeholder="Название вашего вуза"
                  className="w-full bg-navy-800 border border-navy-600 text-white placeholder-slate-600 pl-11 pr-4 py-3 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Описание задания *</label>
              <div className="relative">
                <FileText size={15} className="absolute left-4 top-3.5 text-slate-500" />
                <textarea
                  required
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Подробно опишите задание: тип работы, требования, объём, стиль оформления..."
                  rows={5}
                  className="w-full bg-navy-800 border border-navy-600 text-white placeholder-slate-600 pl-11 pr-4 py-3 rounded-xl focus:border-primary-500 outline-none transition-all text-sm resize-none"
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Дедлайн (минимум через 1 час)</label>
              <div className="relative">
                <Calendar size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  min={getMinDeadline()}
                  className="w-full bg-navy-800 border border-navy-600 text-white pl-11 pr-4 py-3 rounded-xl focus:border-primary-500 outline-none transition-all text-sm [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Files */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Прикрепить файлы</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-navy-600 hover:border-primary-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors group"
              >
                <Upload size={20} className="mx-auto text-slate-600 group-hover:text-primary-400 transition-colors mb-2" />
                <p className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">Нажмите для выбора файлов</p>
                <p className="text-xs text-slate-600 mt-1">PDF, DOC, DOCX, XLSX, JPG, PNG и другие</p>
              </div>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-navy-800 rounded-lg px-3 py-2">
                      <FileText size={14} className="text-primary-400 flex-shrink-0" />
                      <span className="text-sm text-slate-300 flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-slate-600">{(f.size / 1024).toFixed(0)} KB</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-500 hover:to-violet-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-glow disabled:opacity-50 mt-2"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Send size={16} /> Отправить заявку</>}
            </button>
          </motion.form>
        </div>
      </div>
    </div>
  )
}
