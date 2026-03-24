export interface AcademicClient {
  id: number
  name: string           // computed: last_name + first_name + patronymic
  last_name: string | null
  first_name: string | null
  patronymic: string | null
  university: string | null
  faculty: string | null
  year_of_study: number | null
  semester: string | null
  notes: string | null
  active: boolean
  schedule_group: string | null
  telegram_chat_id: string | null
  created_at: string
}

export interface AcademicSubject {
  id: number
  client_id: number
  name: string
  created_at: string
}

export interface AcademicAssignment {
  id: number
  client_id: number
  subject_id: number | null
  name: string
  type: string
  deadline: string | null
  platform: string | null
  status: 'queue' | 'in_progress' | 'done' | 'overdue'
  completed_at: string | null
  comment: string | null
  price: number | null
  created_at: string
}

export interface AcademicGrade {
  id: number
  client_id: number
  subject_id: number
  kt1: number | null
  kt2: number | null
  kt3: number | null
  accumulated: number | null
  exam: number | null
  grade_status: 'passed' | 'question' | 'debt' | 'upcoming'
  created_at: string
}

export interface AcademicAttendance {
  id: number
  client_id: number
  subject_id: number | null
  attendance_date: string
  time_slot: string | null
  type: string | null
  room: string | null
  building: string | null
  notified_student: boolean
  status: 'came' | 'didnt_come' | 'cancelled' | 'upcoming'
  comment: string | null
  created_at: string
}

export interface AcademicMistake {
  id: number
  client_id: number
  mistake_date: string | null
  situation: string | null
  what_went_wrong: string | null
  how_resolved: string | null
  created_at: string
}

export interface AcademicFinance {
  id: number
  client_id: number
  finance_date: string | null
  description: string
  debt: number
  income: number
  comment: string | null
  created_at: string
}

export interface PaymentContact {
  id: number
  method: string
  details: string
  comment: string | null
  sort_order: number
  created_at: string
}

export const ASSIGNMENT_TYPES = [
  'Практика', 'Лабораторная', 'Контрольная',
  'Реферат', 'Курсовая', 'Тест', 'Эссе', 'Другое',
]

export const ASSIGNMENT_STATUSES = [
  { value: 'queue',       label: 'В очереди',  color: 'bg-slate-500/15 text-slate-400',   border: 'border-slate-500/30' },
  { value: 'in_progress', label: 'В работе',   color: 'bg-blue-500/15 text-blue-400',     border: 'border-blue-500/30' },
  { value: 'done',        label: 'Выполнено',  color: 'bg-emerald-500/15 text-emerald-400', border: 'border-emerald-500/30' },
  { value: 'overdue',     label: 'Просрочено', color: 'bg-red-500/15 text-red-400',       border: 'border-red-500/30' },
] as const

export const GRADE_STATUSES = [
  { value: 'passed',   label: '✅ Зачтено',       color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { value: 'question', label: '⚠️ Под вопросом',  color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { value: 'debt',     label: '❌ Долг',           color: 'text-red-400',     bg: 'bg-red-500/10' },
  { value: 'upcoming', label: '🔜 Впереди',        color: 'text-slate-400',   bg: 'bg-slate-500/10' },
] as const

export const ATTENDANCE_STATUSES = [
  { value: 'came',       label: '✅ Приехал',   color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { value: 'didnt_come', label: '❌ Не приехал', color: 'text-red-400',     bg: 'bg-red-500/10' },
  { value: 'cancelled',  label: '⚠️ Отмена',    color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { value: 'upcoming',   label: '🔜 Предстоит', color: 'text-slate-400',   bg: 'bg-slate-500/10' },
] as const
