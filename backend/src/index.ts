import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { createDatabaseAdapter } from './database'

// Import custom types
import { 
  MulterFile, 
  FileFilterCallback, 
  DestinationCallback, 
  FilenameCallback,
  Product,
  Planogram 
} from './types'

// Load environment variables
dotenv.config()

// Инициализируем адаптер базы данных
const db = createDatabaseAdapter()

const app = express()
const PORT = process.env.PORT || 4000

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: Request, file: MulterFile, cb: DestinationCallback) => {
    cb(null, uploadsDir)
  },
  filename: (req: Request, file: MulterFile, cb: FilenameCallback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: Request, file: MulterFile, cb: FileFilterCallback) => {
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
      "img-src": ["'self'", "data:", "blob:", "*"],
    },
  },
}))

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:3002',
  'http://localhost:3003',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
]

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Логирование запросов
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir))

// Serve static files from frontend build (для production)
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '../frontend/dist')
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath))
    
    // Handle React Router - все неизвестные маршруты отдаем index.html
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      // Исключаем API маршруты
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next()
      }
      res.sendFile(path.join(frontendDistPath, 'index.html'))
    })
  }
}

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    message: 'PlanoAPP API is running',
    version: '1.1.0',
    database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
    timestamp: new Date().toISOString()
  })
})

// Products routes
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const products = await db.getProducts()
    res.json(products)
  } catch (error) {
    console.error('Error getting products:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/products', async (req: Request, res: Response) => {
  try {
    const { name, width, height, depth, color, category, barcode, imageUrl, spacing } = req.body
    
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
      spacing: spacing || 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const product = await db.addProduct(newProduct)
    res.status(201).json(product)
  } catch (error) {
    console.error('Error creating product:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.put('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, width, height, depth, color, category, barcode, imageUrl, spacing } = req.body
    
    const updatedProduct = await db.updateProduct(id, {
      name,
      width,
      height,
      depth,
      color,
      category,
      barcode,
      imageUrl,
      spacing,
      updatedAt: new Date().toISOString()
    })
    
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Товар не найден' })
    }
    
    res.json(updatedProduct)
  } catch (error) {
    console.error('Error updating product:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.delete('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const deleted = await db.deleteProduct(id)
    
    if (!deleted) {
      return res.status(404).json({ error: 'Товар не найден' })
    }
    
    res.json({ message: 'Товар удален успешно' })
  } catch (error) {
    console.error('Error deleting product:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// File upload route
app.post('/api/upload', upload.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const fileUrl = `/uploads/${req.file.filename}`
    res.json({ 
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    res.status(500).json({ error: 'File upload failed' })
  }
})

// Planograms routes
app.get('/api/planograms', async (req: Request, res: Response) => {
  try {
    const planograms = await db.getPlanograms()
    res.json(planograms)
  } catch (error) {
    console.error('Error getting planograms:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/planograms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const planogram = await db.getPlanogram(id)
    
    if (!planogram) {
      return res.status(404).json({ error: 'Планограмма не найдена' })
    }
    
    res.json(planogram)
  } catch (error) {
    console.error('Error getting planogram:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/planograms', async (req: Request, res: Response) => {
  try {
    const { name, data } = req.body
    
    const newPlanogram: Planogram = {
      id: Date.now().toString(),
      name,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const planogram = await db.addPlanogram(newPlanogram)
    res.status(201).json(planogram)
  } catch (error) {
    console.error('Error creating planogram:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.put('/api/planograms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, data } = req.body
    
    const updatedPlanogram = await db.updatePlanogram(id, {
      name,
      data,
      updatedAt: new Date().toISOString()
    })
    
    if (!updatedPlanogram) {
      return res.status(404).json({ error: 'Планограмма не найдена' })
    }
    
    res.json(updatedPlanogram)
  } catch (error) {
    console.error('Error updating planogram:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.delete('/api/planograms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const deleted = await db.deletePlanogram(id)
    
    if (!deleted) {
      return res.status(404).json({ error: 'Планограмма не найдена' })
    }
    
    res.json({ message: 'Планограмма удалена успешно' })
  } catch (error) {
    console.error('Error deleting planogram:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Error handling middleware
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error)
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  })
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...')
  await db.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...')
  await db.close()
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📋 API Health: http://localhost:${PORT}/api/health`)
}) 