import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Простая база данных в памяти
interface Product {
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
  createdAt: string
  updatedAt: string
}

interface Planogram {
  id: string
  name: string
  category?: string
  items: any[]
  racks: any[]
  settings: any
  createdAt: string
  updatedAt: string
}

// Хранилища данных в памяти
let products: Product[] = [
  { 
    id: '1', 
    name: 'Молоко 1л', 
    width: 80, 
    height: 180, 
    depth: 80, 
    color: '#E3F2FD', 
    category: 'Молочные продукты',
    barcode: '1234567890123',
    imageUrl: null,
    spacing: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: '2', 
    name: 'Хлеб белый', 
    width: 120, 
    height: 60, 
    depth: 100, 
    color: '#FFF3E0', 
    category: 'Хлебобулочные изделия',
    barcode: '2345678901234',
    imageUrl: null,
    spacing: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: '3', 
    name: 'Сыр российский', 
    width: 100, 
    height: 40, 
    depth: 150, 
    color: '#FFFDE7', 
    category: 'Молочные продукты',
    barcode: '3456789012345',
    imageUrl: null,
    spacing: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: '4', 
    name: 'Колбаса вареная', 
    width: 150, 
    height: 50, 
    depth: 200, 
    color: '#FCE4EC', 
    category: 'Мясные изделия',
    barcode: '4567890123456',
    imageUrl: null,
    spacing: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

let planograms: Planogram[] = [
  {
    id: '1',
    name: 'Планограмма молочных продуктов',
    category: 'Молочные продукты',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [],
    racks: [],
    settings: {}
  },
  {
    id: '2',
    name: 'Хлебобулочные изделия',
    category: 'Хлебобулочные изделия',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    items: [],
    racks: [],
    settings: {}
  }
]

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'))
    }
  }
})

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
    },
  },
}))
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true
}))
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir))

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'PlanoAPP API is running',
    timestamp: new Date().toISOString()
  })
})

// Planograms routes
app.get('/api/planograms', (req, res) => {
  res.json(planograms)
})

app.get('/api/planograms/:id', (req, res) => {
  const { id } = req.params
  const planogram = planograms.find(p => p.id === id)
  
  if (!planogram) {
    return res.status(404).json({ error: 'Планограмма не найдена' })
  }
  
  res.json(planogram)
})

app.post('/api/planograms', (req, res) => {
  const { name, category, items, racks, settings } = req.body
  
  const newPlanogram: Planogram = {
    id: Date.now().toString(),
    name,
    category,
    items: items || [],
    racks: racks || [],
    settings: settings || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  planograms.push(newPlanogram)
  res.status(201).json(newPlanogram)
})

app.put('/api/planograms/:id', (req, res) => {
  const { id } = req.params
  const { name, category, items, racks, settings } = req.body
  
  const planogramIndex = planograms.findIndex(p => p.id === id)
  if (planogramIndex === -1) {
    return res.status(404).json({ error: 'Планограмма не найдена' })
  }
  
  const updatedPlanogram: Planogram = {
    ...planograms[planogramIndex],
    name,
    category,
    items: items || [],
    racks: racks || [],
    settings: settings || {},
    updatedAt: new Date().toISOString()
  }
  
  planograms[planogramIndex] = updatedPlanogram
  res.json(updatedPlanogram)
})

app.delete('/api/planograms/:id', (req, res) => {
  const { id } = req.params
  
  const planogramIndex = planograms.findIndex(p => p.id === id)
  if (planogramIndex === -1) {
    return res.status(404).json({ error: 'Планограмма не найдена' })
  }
  
  planograms.splice(planogramIndex, 1)
  res.json({ message: 'Планограмма удалена' })
})

// Products routes
app.get('/api/products', (req, res) => {
  res.json(products)
})

app.post('/api/products', (req, res) => {
  const { name, width, height, depth, color, category, barcode, imageUrl } = req.body
  
  const newProduct: Product = {
    id: Date.now().toString(),
    name,
    width,
    height,
    depth,
    color,
    category,
    barcode,
    imageUrl: imageUrl || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  products.push(newProduct)
  res.status(201).json(newProduct)
})

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params
  const { name, width, height, depth, color, category, barcode, imageUrl } = req.body
  
  const productIndex = products.findIndex(p => p.id === id)
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Товар не найден' })
  }
  
  const updatedProduct: Product = {
    ...products[productIndex],
    name,
    width,
    height,
    depth,
    color,
    category,
    barcode,
    imageUrl: imageUrl || null,
    updatedAt: new Date().toISOString()
  }
  
  products[productIndex] = updatedProduct
  res.json(updatedProduct)
})

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params
  
  const productIndex = products.findIndex(p => p.id === id)
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Товар не найден' })
  }
  
  products.splice(productIndex, 1)
  res.json({ message: 'Товар удален' })
})

// Upload image endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  
  const imageUrl = `/uploads/${req.file.filename}`
  res.json({ imageUrl })
})

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📋 API Health: http://localhost:${PORT}/api/health`)
}) 