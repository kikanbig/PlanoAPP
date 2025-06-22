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
  spacing?: number // расстояние между товарами в мм (по умолчанию 2мм)
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
  shelfType?: 'standard' | 'hook' | 'basket' | 'divider' // тип полки
  maxLoad?: number // максимальная нагрузка в кг
}

export interface RackSystem {
  id: string
  name: string
  type: 'gondola' | 'wall' | 'endcap' | 'island'
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
  items: ShelfItem[]
  racks: RackSystem[]
  settings: PlanogramSettings
  createdAt: string
  updatedAt: string
} 