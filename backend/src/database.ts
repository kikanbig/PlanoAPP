// Условные импорты для поддержки разных окружений
let Pool: any, sqlite3: any

try {
  const pg = require('pg')
  Pool = pg.Pool
} catch (e) {
  // pg не установлен
}

try {
  sqlite3 = require('sqlite3')
} catch (e) {
  // sqlite3 не установлен
}

import { User, UserResponse, Product, Planogram } from './types'

// Определяем тип базы данных на основе переменных окружения
const isProduction = process.env.NODE_ENV === 'production'
const databaseUrl = process.env.DATABASE_URL

interface DatabaseAdapter {
  // Пользователи
  getUserByEmail(email: string): Promise<User | null>
  getUserById(id: string): Promise<User | null>
  createUser(user: User): Promise<User>
  updateUser(id: string, updates: Partial<User>): Promise<User | null>
  
  // Товары
  getProducts(): Promise<Product[]>
  addProduct(product: Product): Promise<Product>
  updateProduct(id: string, product: Partial<Product>): Promise<Product | null>
  deleteProduct(id: string): Promise<boolean>
  
  // Планограммы
  getPlanograms(userId?: string): Promise<Planogram[]>
  addPlanogram(planogram: Planogram): Promise<Planogram>
  updatePlanogram(id: string, planogram: Partial<Planogram>): Promise<Planogram | null>
  deletePlanogram(id: string): Promise<boolean>
  getPlanogram(id: string): Promise<Planogram | null>
  
  close(): Promise<void>
}

class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: any

  constructor() {
    const { Pool } = require('pg')
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
    this.initTables()
  }

  private async initTables() {
    const client = await this.pool.connect()
    try {
      // Создаем таблицу пользователей
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'manager',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Создаем таблицу товаров
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          depth INTEGER NOT NULL,
          color VARCHAR(7) NOT NULL,
          category VARCHAR(255),
          barcode VARCHAR(255),
          image_url TEXT,
          spacing INTEGER DEFAULT 2,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Создаем таблицу планограмм с привязкой к пользователю
      await client.query(`
        CREATE TABLE IF NOT EXISTS planograms (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          data JSONB NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)

      console.log('✅ PostgreSQL tables initialized')
    } catch (error) {
      console.error('❌ Error initializing PostgreSQL tables:', error)
    } finally {
      client.release()
    }
  }

  // Методы для работы с пользователями
  async getUserByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT * FROM users WHERE email = $1', [email])
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        email: row.email,
        password: row.password,
        name: row.name,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } finally {
      client.release()
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [id])
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        email: row.email,
        password: row.password,
        name: row.name,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } finally {
      client.release()
    }
  }

  async createUser(user: User): Promise<User> {
    const client = await this.pool.connect()
    try {
      await client.query(`
        INSERT INTO users (id, email, password, name, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        user.id, user.email, user.password, user.name, user.role,
        user.createdAt, user.updatedAt
      ])
      return user
    } finally {
      client.release()
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const client = await this.pool.connect()
    try {
      const setClause = []
      const values = []
      let paramIndex = 1

      if (updates.email !== undefined) {
        setClause.push(`email = $${paramIndex++}`)
        values.push(updates.email)
      }
      if (updates.password !== undefined) {
        setClause.push(`password = $${paramIndex++}`)
        values.push(updates.password)
      }
      if (updates.name !== undefined) {
        setClause.push(`name = $${paramIndex++}`)
        values.push(updates.name)
      }
      if (updates.role !== undefined) {
        setClause.push(`role = $${paramIndex++}`)
        values.push(updates.role)
      }

      setClause.push(`updated_at = $${paramIndex++}`)
      values.push(new Date().toISOString())
      values.push(id)

      const result = await client.query(`
        UPDATE users SET ${setClause.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *
      `, values)

      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        email: row.email,
        password: row.password,
        name: row.name,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } finally {
      client.release()
    }
  }

  // Методы для работы с товарами
  async getProducts(): Promise<Product[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT * FROM products ORDER BY created_at DESC')
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        width: row.width,
        height: row.height,
        depth: row.depth,
        color: row.color,
        category: row.category,
        barcode: row.barcode,
        imageUrl: row.image_url,
        spacing: row.spacing || 2,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    } finally {
      client.release()
    }
  }

  async addProduct(product: Product): Promise<Product> {
    const client = await this.pool.connect()
    try {
      await client.query(`
        INSERT INTO products (id, name, width, height, depth, color, category, barcode, image_url, spacing, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        product.id, product.name, product.width, product.height, product.depth,
        product.color, product.category, product.barcode, product.imageUrl, 
        product.spacing || 2, product.createdAt, product.updatedAt
      ])
      return product
    } finally {
      client.release()
    }
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const client = await this.pool.connect()
    try {
      const setClause = []
      const values = []
      let paramIndex = 1

      if (updates.name !== undefined) {
        setClause.push(`name = $${paramIndex++}`)
        values.push(updates.name)
      }
      if (updates.width !== undefined) {
        setClause.push(`width = $${paramIndex++}`)
        values.push(updates.width)
      }
      if (updates.height !== undefined) {
        setClause.push(`height = $${paramIndex++}`)
        values.push(updates.height)
      }
      if (updates.depth !== undefined) {
        setClause.push(`depth = $${paramIndex++}`)
        values.push(updates.depth)
      }
      if (updates.color !== undefined) {
        setClause.push(`color = $${paramIndex++}`)
        values.push(updates.color)
      }
      if (updates.category !== undefined) {
        setClause.push(`category = $${paramIndex++}`)
        values.push(updates.category)
      }
      if (updates.barcode !== undefined) {
        setClause.push(`barcode = $${paramIndex++}`)
        values.push(updates.barcode)
      }
      if (updates.imageUrl !== undefined) {
        setClause.push(`image_url = $${paramIndex++}`)
        values.push(updates.imageUrl)
      }
      if (updates.spacing !== undefined) {
        setClause.push(`spacing = $${paramIndex++}`)
        values.push(updates.spacing)
      }

      setClause.push(`updated_at = $${paramIndex++}`)
      values.push(new Date().toISOString())
      values.push(id)

      const result = await client.query(`
        UPDATE products SET ${setClause.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *
      `, values)

      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        width: row.width,
        height: row.height,
        depth: row.depth,
        color: row.color,
        category: row.category,
        barcode: row.barcode,
        imageUrl: row.image_url,
        spacing: row.spacing || 2,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } finally {
      client.release()
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('DELETE FROM products WHERE id = $1', [id])
      return result.rowCount > 0
    } finally {
      client.release()
    }
  }

  // Методы для работы с планограммами
  async getPlanograms(userId?: string): Promise<Planogram[]> {
    const client = await this.pool.connect()
    try {
      let query = 'SELECT * FROM planograms'
      let params: any[] = []
      
      if (userId) {
        query += ' WHERE user_id = $1'
        params = [userId]
      }
      
      query += ' ORDER BY created_at DESC'
      
      const result = await client.query(query, params)
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        data: row.data,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    } finally {
      client.release()
    }
  }

  async addPlanogram(planogram: Planogram): Promise<Planogram> {
    const client = await this.pool.connect()
    try {
      await client.query(`
        INSERT INTO planograms (id, name, data, user_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [planogram.id, planogram.name, JSON.stringify(planogram.data), 
          planogram.userId, planogram.createdAt, planogram.updatedAt])
      return planogram
    } finally {
      client.release()
    }
  }

  async updatePlanogram(id: string, updates: Partial<Planogram>): Promise<Planogram | null> {
    const client = await this.pool.connect()
    try {
      const setClause = []
      const values = []
      let paramIndex = 1

      if (updates.name !== undefined) {
        setClause.push(`name = $${paramIndex++}`)
        values.push(updates.name)
      }
      if (updates.data !== undefined) {
        setClause.push(`data = $${paramIndex++}`)
        values.push(JSON.stringify(updates.data))
      }
      if (updates.userId !== undefined) {
        setClause.push(`user_id = $${paramIndex++}`)
        values.push(updates.userId)
      }

      setClause.push(`updated_at = $${paramIndex++}`)
      values.push(new Date().toISOString())
      values.push(id)

      const result = await client.query(`
        UPDATE planograms SET ${setClause.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *
      `, values)

      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        data: row.data,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } finally {
      client.release()
    }
  }

  async deletePlanogram(id: string): Promise<boolean> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('DELETE FROM planograms WHERE id = $1', [id])
      return result.rowCount > 0
    } finally {
      client.release()
    }
  }

  async getPlanogram(id: string): Promise<Planogram | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT * FROM planograms WHERE id = $1', [id])
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        data: row.data,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } finally {
      client.release()
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

class SQLiteAdapter implements DatabaseAdapter {
  private users: User[] = []
  private products: Product[] = []
  private planograms: Planogram[] = []

  constructor() {
    console.log('📱 Using SQLite for local development')
  }

  // Методы для работы с пользователями
  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null
  }

  async createUser(user: User): Promise<User> {
    this.users.push(user)
    return user
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex(u => u.id === id)
    if (index === -1) return null

    this.users[index] = { ...this.users[index], ...updates, updatedAt: new Date().toISOString() }
    return this.users[index]
  }

  // Методы для работы с товарами
  async getProducts(): Promise<Product[]> {
    return this.products
  }

  async addProduct(product: Product): Promise<Product> {
    this.products.push(product)
    return product
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const index = this.products.findIndex(p => p.id === id)
    if (index === -1) return null

    this.products[index] = { ...this.products[index], ...updates, updatedAt: new Date().toISOString() }
    return this.products[index]
  }

  async deleteProduct(id: string): Promise<boolean> {
    const index = this.products.findIndex(p => p.id === id)
    if (index === -1) return false

    this.products.splice(index, 1)
    return true
  }

  // Методы для работы с планограммами
  async getPlanograms(userId?: string): Promise<Planogram[]> {
    if (userId) {
      return this.planograms.filter(p => p.userId === userId)
    }
    return this.planograms
  }

  async addPlanogram(planogram: Planogram): Promise<Planogram> {
    this.planograms.push(planogram)
    return planogram
  }

  async updatePlanogram(id: string, updates: Partial<Planogram>): Promise<Planogram | null> {
    const index = this.planograms.findIndex(p => p.id === id)
    if (index === -1) return null

    this.planograms[index] = { ...this.planograms[index], ...updates, updatedAt: new Date().toISOString() }
    return this.planograms[index]
  }

  async deletePlanogram(id: string): Promise<boolean> {
    const index = this.planograms.findIndex(p => p.id === id)
    if (index === -1) return false

    this.planograms.splice(index, 1)
    return true
  }

  async getPlanogram(id: string): Promise<Planogram | null> {
    return this.planograms.find(p => p.id === id) || null
  }

  async close(): Promise<void> {
    // Ничего не делаем для SQLite в памяти
  }
}

// Экспортируем адаптер базы данных
export const createDatabaseAdapter = (): DatabaseAdapter => {
  if (isProduction && databaseUrl) {
    console.log('🐘 Using PostgreSQL for production')
    return new PostgreSQLAdapter()
  } else {
    console.log('📱 Using SQLite for local development')
    return new SQLiteAdapter()
  }
} 