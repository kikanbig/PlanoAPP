// Custom types for better Railway compatibility
export interface MulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  destination: string
  filename: string
  path: string
  buffer: Buffer
}

export type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void
export type DestinationCallback = (error: Error | null, destination: string) => void
export type FilenameCallback = (error: Error | null, filename: string) => void

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
  spacing?: number
  createdAt: string
  updatedAt: string
}

export interface Planogram {
  id: string
  name: string
  data: any
  createdAt: string
  updatedAt: string
} 