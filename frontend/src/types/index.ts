export type ShelfType = 'standard' | 'hook' | 'basket' | 'divider' | 'slanted' | 'wire' | 'bottle' | 'pegboard'

// Типы для аутентификации
export interface User {
  id: string
  email: string
  name: string
  role: 'manager' | 'admin'
  createdAt: string
  updatedAt: string
}

export interface AuthRequest {
  email: string
  password: string
}

export interface RegisterRequest extends AuthRequest {
  name: string
  role?: 'manager' | 'admin'
}

export interface AuthResponse {
  user: User
  token: string
}

export interface Product {
  id: string
  name: string
  width: number
  height: number
  depth: number
  color: string
  category: string
  barcode?: string
  imageUrl?: string | null
  spacing?: number // расстояние между товарами в мм (по умолчанию 50мм)
}

export interface ShelfItem {
  id: string
  x: number
  y: number
  width: number
  height: number
  depth?: number // глубина полки в мм
  product?: Product
  type: 'shelf' | 'product' | 'hook' | 'divider' | 'rack'
  resizable?: boolean
  shelfType?: ShelfType // тип полки
  maxLoad?: number // максимальная нагрузка в кг
  // Метаданные для полок стеллажей
  rackId?: string // ID стеллажа к которому принадлежит элемент
  level?: number
  isTopShelf?: boolean
  isBottomShelf?: boolean
  // Для товаров: привязка к полке
  shelfId?: string // ID полки на которой размещен товар
}

export interface RackSystem {
  id: string
  name: string
  type: 'gondola' | 'wall' | 'endcap' | 'island'
  x: number // позиция X в пикселях
  y: number // позиция Y в пикселях
  width: number
  height: number
  depth: number
  levels: number // количество уровней
  shelves: ShelfItem[]
}

export interface PlanogramSettings {
  gridSizeMm: number // размер сетки в миллиметрах
  pixelsPerMm: number
  showGrid: boolean
  snapToGrid: boolean
  canvasWidth: number
  canvasHeight: number
  showDimensions: boolean // показывать размеры на холсте
  show3D: boolean // показывать 3D элементы
  defaultShelfDepth: number // глубина полки по умолчанию в мм
}

export interface Planogram {
  id: string
  name: string
  category?: string
  items?: ShelfItem[]
  racks?: RackSystem[]
  settings?: PlanogramSettings
  data?: {
    items?: ShelfItem[]
    racks?: RackSystem[]
    settings?: PlanogramSettings
  } // Поле для хранения данных планограммы как JSON
  userId?: string // ID пользователя-владельца
  createdAt: string
  updatedAt: string
} 