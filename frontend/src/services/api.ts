import { Planogram } from '../types'

const API_BASE_URL = '/api'

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
  createdAt?: string
  updatedAt?: string
}

class ApiService {
  // Products API
  async getProducts(): Promise<Product[]> {
    const response = await fetch(`${API_BASE_URL}/products`)
    if (!response.ok) {
      throw new Error('Ошибка загрузки товаров')
    }
    return response.json()
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    })
    if (!response.ok) {
      throw new Error('Ошибка создания товара')
    }
    return response.json()
  }

  async updateProduct(id: string, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    })
    if (!response.ok) {
      throw new Error('Ошибка обновления товара')
    }
    return response.json()
  }

  async deleteProduct(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Ошибка удаления товара')
    }
  }

  // Planograms API
  async getPlanograms(): Promise<Planogram[]> {
    const response = await fetch(`${API_BASE_URL}/planograms`)
    if (!response.ok) {
      throw new Error('Ошибка загрузки планограмм')
    }
    return response.json()
  }

  async getPlanogram(id: string): Promise<Planogram> {
    const response = await fetch(`${API_BASE_URL}/planograms/${id}`)
    if (!response.ok) {
      throw new Error('Ошибка загрузки планограммы')
    }
    return response.json()
  }

  async createPlanogram(planogram: Omit<Planogram, 'id' | 'createdAt' | 'updatedAt'>): Promise<Planogram> {
    const response = await fetch(`${API_BASE_URL}/planograms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(planogram),
    })
    if (!response.ok) {
      throw new Error('Ошибка создания планограммы')
    }
    return response.json()
  }

  async updatePlanogram(id: string, planogram: Omit<Planogram, 'id' | 'createdAt' | 'updatedAt'>): Promise<Planogram> {
    const response = await fetch(`${API_BASE_URL}/planograms/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(planogram),
    })
    if (!response.ok) {
      throw new Error('Ошибка обновления планограммы')
    }
    return response.json()
  }

  async deletePlanogram(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/planograms/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Ошибка удаления планограммы')
    }
  }

  // Upload API
  async uploadImage(file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Ошибка загрузки изображения')
    }

    return response.json()
  }
}

export const apiService = new ApiService()

// Экспорт функций для удобства
export const getProducts = () => apiService.getProducts()
export const createProduct = (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => apiService.createProduct(product)
export const updateProduct = (id: string, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => apiService.updateProduct(id, product)
export const deleteProduct = (id: string) => apiService.deleteProduct(id)
export const getPlanograms = () => apiService.getPlanograms()
export const getPlanogram = (id: string) => apiService.getPlanogram(id)
export const createPlanogram = (planogram: Omit<Planogram, 'id' | 'createdAt' | 'updatedAt'>) => apiService.createPlanogram(planogram)
export const updatePlanogram = (id: string, planogram: Omit<Planogram, 'id' | 'createdAt' | 'updatedAt'>) => apiService.updatePlanogram(id, planogram)
export const deletePlanogram = (id: string) => apiService.deletePlanogram(id)
export const uploadImage = (file: File) => apiService.uploadImage(file)