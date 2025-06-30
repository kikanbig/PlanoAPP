import { Planogram, Product, User, AuthRequest, RegisterRequest, AuthResponse } from '../types'

const API_BASE_URL = '/api'

// Сервис для управления токенами
class AuthTokenService {
  private static TOKEN_KEY = 'planogram_auth_token'
  private static USER_KEY = 'planogram_user'

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token)
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  }

  static setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user))
  }

  static isAuthenticated(): boolean {
    return !!this.getToken()
  }
}

class ApiService {
  // Приватный метод для получения заголовков с авторизацией
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    const token = AuthTokenService.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    return headers
  }

  // Приватный метод для обработки ошибок авторизации
  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      // Токен недействителен, удаляем его
      AuthTokenService.removeToken()
      window.location.href = '/login'
      throw new Error('Требуется авторизация')
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

  // Auth API
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    const authResponse = await this.handleResponse<AuthResponse>(response)
    
    // Сохраняем токен и пользователя
    AuthTokenService.setToken(authResponse.token)
    AuthTokenService.setUser(authResponse.user)
    
    return authResponse
  }

  async login(data: AuthRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    const authResponse = await this.handleResponse<AuthResponse>(response)
    
    // Сохраняем токен и пользователя
    AuthTokenService.setToken(authResponse.token)
    AuthTokenService.setUser(authResponse.user)
    
    return authResponse
  }

  async logout(): Promise<void> {
    // Удаляем токен и данные пользователя
    AuthTokenService.removeToken()
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    })
    
    return this.handleResponse<User>(response)
  }

  // Products API
  async getProducts(): Promise<Product[]> {
    const response = await fetch(`${API_BASE_URL}/products`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<Product[]>(response)
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(product),
    })
    return this.handleResponse<Product>(response)
  }

  async updateProduct(id: string, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(product),
    })
    return this.handleResponse<Product>(response)
  }

  async deleteProduct(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<void>(response)
  }

  // Planograms API
  async getPlanograms(): Promise<Planogram[]> {
    const response = await fetch(`${API_BASE_URL}/planograms`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<Planogram[]>(response)
  }

  async getPlanogram(id: string): Promise<Planogram> {
    const response = await fetch(`${API_BASE_URL}/planograms/${id}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<Planogram>(response)
  }

  async createPlanogram(planogram: Omit<Planogram, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Planogram> {
    const response = await fetch(`${API_BASE_URL}/planograms`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(planogram),
    })
    return this.handleResponse<Planogram>(response)
  }

  async updatePlanogram(id: string, planogram: Omit<Planogram, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Planogram> {
    const response = await fetch(`${API_BASE_URL}/planograms/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(planogram),
    })
    return this.handleResponse<Planogram>(response)
  }

  async deletePlanogram(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/planograms/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<void>(response)
  }

  // Upload API
  async uploadImage(file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData()
    formData.append('image', file)

    const headers: Record<string, string> = {}
    const token = AuthTokenService.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    return this.handleResponse<{ imageUrl: string }>(response)
  }
}

export const apiService = new ApiService()

// Экспорт AuthTokenService для использования в компонентах
export { AuthTokenService }

// Экспорт функций для удобства
export const register = (data: RegisterRequest) => apiService.register(data)
export const login = (data: AuthRequest) => apiService.login(data)
export const logout = () => apiService.logout()
export const getCurrentUser = () => apiService.getCurrentUser()
export const getProducts = () => apiService.getProducts()
export const createProduct = (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => apiService.createProduct(product)
export const updateProduct = (id: string, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => apiService.updateProduct(id, product)
export const deleteProduct = (id: string) => apiService.deleteProduct(id)
export const getPlanograms = () => apiService.getPlanograms()
export const getPlanogram = (id: string) => apiService.getPlanogram(id)
export const createPlanogram = (planogram: Omit<Planogram, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => apiService.createPlanogram(planogram)
export const updatePlanogram = (id: string, planogram: Omit<Planogram, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => apiService.updatePlanogram(id, planogram)
export const deletePlanogram = (id: string) => apiService.deletePlanogram(id)
export const uploadImage = (file: File) => apiService.uploadImage(file)