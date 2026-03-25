export type UserRole = 'admin' | 'user' | 'client'

export interface UserPermissions {
  suppliers: boolean
  academic: boolean
  academic_clients: number[] // empty = all, non-empty = only these IDs
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  suppliers: false,
  academic: false,
  academic_clients: [],
}

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  created_at: string
  disabled: boolean
  permissions: UserPermissions
  email?: string
}

export interface Supplier {
  id: number
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  category: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface PriceList {
  id: number
  supplier_id: number
  file_name: string
  url: string | null
  uploaded_by: string | null
  created_at: string
}

export interface SupplierCriteria {
  id: number
  name: string
  field_type: 'text' | 'number' | 'boolean' | 'date' | 'select'
  options: string[] | null
  required: boolean
  sort_order: number
  created_at: string
}

export interface SupplierCriteriaValue {
  id: number
  supplier_id: number
  criteria_id: number
  value: string | null
  created_at: string
}

export interface SupplierRisk {
  id: number
  supplier_id: number
  text: string
  created_at: string
}

export interface SupplierCall {
  id: number
  supplier_id: number
  call_date: string
  summary: string | null
  result: string | null
  created_at: string
}

export interface SupplierTask {
  id: number
  supplier_id: number
  title: string
  deadline: string | null
  done: boolean
  created_at: string
}

export const SUPPLIER_STATUSES = [
  { value: 'active', label: 'Активный', color: 'green' },
  { value: 'inactive', label: 'Неактивный', color: 'gray' },
  { value: 'pending', label: 'На рассмотрении', color: 'yellow' },
  { value: 'verified', label: 'Проверенный', color: 'blue' },
  { value: 'blocked', label: 'Заблокирован', color: 'red' },
] as const

export const SUPPLIER_CATEGORIES = [
  'Электроника',
  'Одежда и обувь',
  'Продукты питания',
  'Строительные материалы',
  'Химия и бытовая химия',
  'Оборудование',
  'Мебель',
  'Автозапчасти',
  'Медикаменты',
  'Другое',
]
