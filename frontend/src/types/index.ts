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
  category?: string
  barcode?: string
  imageUrl?: string | null
  spacing?: number // расстояние между товарами в мм (по умолчанию 50мм)
  userId: string  // связь с пользователем-владельцем
  createdAt: string
  updatedAt: string
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

export interface PlanogramData {
  name: string
  category: string
  items: PlanogramItem[]
  racks: RackItem[]
  settings: any
}

export interface Planogram {
  id: string
  name: string
  data: PlanogramData | string
  userId: string  // связь с пользователем
  createdAt: string
  updatedAt: string
}

export interface PlanogramItem {
  id: string
  productId: string
  x: number
  y: number
  rackId?: string
  level?: number
  product?: Product
}

export interface RackItem {
  id: string
  x: number
  y: number
  width: number
  height: number
  levels: number
  name?: string
} 