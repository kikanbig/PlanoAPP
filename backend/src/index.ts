import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'
import * as ExcelJS from 'exceljs'
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

// Настройка папки для загруженных файлов
// В production на Railway используем Volume mount
// В development используем локальную папку
const uploadsDir = process.env.NODE_ENV === 'production' 
  ? '/app/uploads'  // Railway Volume mount point
  : path.join(__dirname, '../uploads')  // Локальная разработка

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log(`📁 Created uploads directory: ${uploadsDir}`)
}

console.log(`📁 Using uploads directory: ${uploadsDir}`)
console.log(`📁 Directory exists: ${fs.existsSync(uploadsDir)}`)

// Configure multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req: Request, file: MulterFile, cb: DestinationCallback) => {
    cb(null, uploadsDir)
  },
  filename: (req: Request, file: MulterFile, cb: FilenameCallback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

// Multer для изображений
const imageUpload = multer({ 
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

// Multer для Excel файлов (только в памяти, не сохраняем на диск)
const excelUpload = multer({ 
  storage: multer.memoryStorage(), // Храним в памяти для обработки
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit для больших Excel файлов
  },
  fileFilter: (req: Request, file: MulterFile, cb: FileFilterCallback) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.xlsx') ||
        file.originalname.toLowerCase().endsWith('.xls')) {
      cb(null, true)
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'))
    }
  }
})

// Для обратной совместимости
const upload = imageUpload

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

// Serve uploaded files с проверкой существования
app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
  const filePath = path.join(uploadsDir, req.path)
  
  // Проверяем существует ли файл
  if (fs.existsSync(filePath)) {
    // Файл существует, обслуживаем его
    express.static(uploadsDir)(req, res, next)
  } else {
    // Файл не существует, возвращаем 404 с информативным сообщением
    console.log(`❌ Файл не найден: ${filePath}`)
    console.log(`📁 Доступные файлы:`, fs.readdirSync(uploadsDir).slice(0, 5))
    res.status(404).json({ 
      error: 'Image not found',
      message: 'File was uploaded to Railway but lost during redeployment',
      suggestion: 'Please re-upload the image'
    })
  }
})

// Serve static files from frontend build (для production)
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '../../frontend/dist')
  console.log('Looking for frontend dist at:', frontendDistPath)
  console.log('Dist path exists:', fs.existsSync(frontendDistPath))
  
  if (fs.existsSync(frontendDistPath)) {
    console.log('Serving static files from:', frontendDistPath)
    app.use(express.static(frontendDistPath))
    
    // Handle React Router - все неизвестные маршруты отдаем index.html
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      // Исключаем API маршруты
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next()
      }
      console.log('Serving React app for path:', req.path)
      res.sendFile(path.join(frontendDistPath, 'index.html'))
    })
  } else {
    console.error('Frontend dist directory not found at:', frontendDistPath)
    console.log('Current __dirname:', __dirname)
    
    // Fallback: serve a basic response for root
    app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'PlanoAPP API is running',
        status: 'Frontend not built or not found',
        api_health: '/api/health'
      })
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
    timestamp: new Date().toISOString(),
    uploadsDir: uploadsDir,
    uploadsExists: fs.existsSync(uploadsDir)
  })
})

// Debug endpoint for checking uploads directory
app.get('/api/debug/uploads', (req: Request, res: Response) => {
  try {
    const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []
    const fileDetails = files.slice(0, 20).map(file => {
      try {
        const filePath = path.join(uploadsDir, file)
        const stats = fs.statSync(filePath)
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          isFile: stats.isFile()
        }
      } catch (err) {
        return { name: file, error: 'Cannot read stats' }
      }
    })

    res.json({
      uploadsDir,
      exists: fs.existsSync(uploadsDir),
      totalFiles: files.length,
      files: fileDetails,
      diskUsage: process.env.NODE_ENV === 'production' ? 'Volume mounted' : 'Local storage'
    })
  } catch (error) {
    res.status(500).json({
      error: 'Cannot read uploads directory',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
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

    // Railway Volume: используем относительный путь для всех сред
    const fileUrl = `/uploads/${req.file.filename}`
    console.log(`📸 File uploaded to Railway Volume: ${fileUrl}`)
    console.log(`📁 File path: ${req.file.path}`)
    console.log(`📊 File size: ${(req.file.size / 1024).toFixed(2)} KB`)
    
    res.json({ 
      imageUrl: fileUrl,
      url: fileUrl, // Для обратной совместимости
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      storage: process.env.NODE_ENV === 'production' ? 'railway-volume' : 'local'
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
    
    // Парсим JSON данные планограммы
    try {
      const parsedData = JSON.parse(planogram.data)
      
      console.log(`📋 Отправляем планограмму "${planogram.name}" с данными:`, {
        itemsCount: parsedData.items?.length || 0,
        racksCount: parsedData.racks?.length || 0,
        hasSettings: !!parsedData.settings
      })
      
      res.json({
        id: planogram.id,
        name: planogram.name,
        createdAt: planogram.createdAt,
        updatedAt: planogram.updatedAt,
        data: parsedData // Данные планограммы в поле data
      })
    } catch (parseError) {
      // Если не удается распарсить, отправляем как есть
      console.warn('Unable to parse planogram data:', parseError)
      res.json(planogram)
    }
  } catch (error) {
    console.error('Error getting planogram:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/planograms', async (req: Request, res: Response) => {
  try {
    const { name, category, items, racks, settings } = req.body
    
    // Создаем объект планограммы совместимый с типами
    const planogramData = {
      name,
      category: category || 'Основная',
      items: items || [],
      racks: racks || [],
      settings: settings || {}
    }
    
    const newPlanogram: Planogram = {
      id: Date.now().toString(),
      name,
      data: JSON.stringify(planogramData), // Сохраняем как JSON строку
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    console.log(`💾 Сохраняем планограмму "${name}" с данными:`, {
      itemsCount: items?.length || 0,
      racksCount: racks?.length || 0,
      hasSettings: !!settings
    })
    
    const planogram = await db.addPlanogram(newPlanogram)
    res.status(201).json(planogram)
  } catch (error) {
    console.error('Error creating planogram:', error)
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

app.put('/api/planograms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, category, items, racks, settings } = req.body
    
    // Создаем объект планограммы совместимый с типами (аналогично POST)
    const planogramData = {
      name,
      category: category || 'Основная',
      items: items || [],
      racks: racks || [],
      settings: settings || {}
    }
    
    console.log(`🔄 Обновляем планограмму "${name}" (ID: ${id}) с данными:`, {
      itemsCount: items?.length || 0,
      racksCount: racks?.length || 0,
      hasSettings: !!settings
    })
    
    const updatedPlanogram = await db.updatePlanogram(id, {
      name,
      data: JSON.stringify(planogramData), // Сохраняем как JSON строку
      updatedAt: new Date().toISOString()
    })
    
    if (!updatedPlanogram) {
      return res.status(404).json({ error: 'Планограмма не найдена' })
    }
    
    console.log(`✅ Планограмма "${name}" успешно обновлена`)
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

// Excel Import route
app.post('/api/import-excel', excelUpload.single('excelFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file uploaded' })
    }

    console.log(`📊 Processing Excel file: ${req.file.originalname}`)
    console.log(`📄 File size: ${(req.file.size / 1024).toFixed(2)} KB`)

    // Используем ExcelJS для обработки изображений
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(req.file.buffer)
    
    const worksheet = workbook.getWorksheet(1) // Берем первый лист
    
    if (!worksheet) {
      return res.status(400).json({ error: 'Excel файл не содержит листов' })
    }

    console.log(`📋 Excel sheet "${worksheet.name}" loaded with ${worksheet.rowCount} rows`)

    if (worksheet.rowCount < 2) {
      return res.status(400).json({ error: 'Excel файл должен содержать минимум 2 строки (заголовок + данные)' })
    }

    const products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = []
    const errors: string[] = []
    let processedImages = 0

    // Извлекаем изображения из листа
    const imagesMap = new Map<string, Buffer>()
    
    if (worksheet.getImages) {
      const images = worksheet.getImages()
      console.log(`🖼️  Найдено изображений в Excel: ${images.length}`)
      
      // Сначала сортируем изображения по строкам для правильного порядка
      const sortedImages = images.sort((a, b) => {
        const rowA = a.range?.tl?.row || 0
        const rowB = b.range?.tl?.row || 0
        return rowA - rowB
      })
      
      console.log(`📋 Детали изображений:`)
      for (let i = 0; i < sortedImages.length; i++) {
        const image = sortedImages[i]
        try {
          const media = (workbook.model as any).media
          const imageBuffer = media && media[image.imageId]
          if (imageBuffer && imageBuffer.buffer) {
            const reportedRow = image.range?.tl?.row || 0
            const reportedCol = image.range?.tl?.col || 0
            
            // Используем более надежное сопоставление:
            // 1. Если reportedRow > 1, используем его
            // 2. Иначе используем последовательный порядок начиная с строки 2
            let targetRow = reportedRow
            if (reportedRow < 2) {
              targetRow = 2 + i // Начинаем с строки 2 (после заголовка)
            }
            
            const cellRef = `E${targetRow}`
            imagesMap.set(cellRef, imageBuffer.buffer)
            
            console.log(`  🖼️  Изображение ${i + 1}:`)
            console.log(`    - Reported row: ${reportedRow}, col: ${reportedCol}`)
            console.log(`    - Target row: ${targetRow}`)
            console.log(`    - Cell ref: ${cellRef}`)
            console.log(`    - Buffer size: ${imageBuffer.buffer.length} bytes`)
          }
        } catch (err) {
          console.warn(`⚠️  Ошибка извлечения изображения ${i + 1}:`, err)
        }
      }
    }

    console.log(`📊 Карта изображений создана: ${imagesMap.size} изображений`)
    console.log(`📋 Ячейки с изображениями: [${Array.from(imagesMap.keys()).join(', ')}]`)

    // Начинаем с второй строки (индекс 2), пропуская заголовок
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber)
      
      try {
        // Извлекаем данные согласно структуре:
        // A - категория, B - название, E - изображение, J - ширина, K - глубина, L - высота
        const category = row.getCell(1).text?.trim() || 'Без категории' // Столбец A
        const name = row.getCell(2).text?.trim() // Столбец B
        const width = parseFloat(row.getCell(10).text) || 200 // Столбец J
        const depth = parseFloat(row.getCell(11).text) || 200 // Столбец K  
        const height = parseFloat(row.getCell(12).text) || 200 // Столбец L

        if (!name) {
          errors.push(`Строка ${rowNumber}: пустое название товара`)
          continue
        }

        console.log(`📝 Обрабатываем строку ${rowNumber}: "${name}" (категория: "${category}")`)

        let imageUrl: string | null = null

        // Проверяем наличие изображения в ячейке E
        const imageCellRef = `E${rowNumber}`
        const imageBuffer = imagesMap.get(imageCellRef)
        
        console.log(`🔍 Ищем изображение для строки ${rowNumber}:`)
        console.log(`  - Ячейка: ${imageCellRef}`)
        console.log(`  - Найдено: ${imageBuffer ? 'ДА' : 'НЕТ'}`)
        
        if (imageBuffer) {
          try {
            // Создаем уникальное имя файла БЕЗ русских символов (только латиница и цифры)
            const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)
            const fileName = `import_${safeName}_${rowNumber}_${Date.now()}.png`
            const uploadPath = path.join(uploadsDir, fileName)
            
            // Сохраняем файл
            fs.writeFileSync(uploadPath, imageBuffer)
            imageUrl = `/uploads/${fileName}`
            processedImages++
            
            console.log(`✅ Изображение сохранено: ${fileName} (размер: ${imageBuffer.length} bytes)`)
          } catch (imageError) {
            console.warn(`⚠️  Ошибка сохранения изображения в строке ${rowNumber}:`, imageError)
            errors.push(`Строка ${rowNumber}: ошибка сохранения изображения`)
          }
        } else {
          console.log(`❌ Изображение НЕ найдено для строки ${rowNumber}`)
        }

        const product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
          name,
          category,
          width,
          height,
          depth,
          color: '#E5E7EB', // Цвет по умолчанию
          barcode: '', // Штрихкод пустой по умолчанию
          imageUrl,
          spacing: 2 // Отступ по умолчанию
        }

        products.push(product)
        
      } catch (rowError) {
        console.error(`Ошибка обработки строки ${rowNumber}:`, rowError)
        errors.push(`Строка ${rowNumber}: ${rowError instanceof Error ? rowError.message : 'Неизвестная ошибка'}`)
      }
    }

    console.log(`✅ Обработано товаров: ${products.length}`)
    console.log(`🖼️  Обработано изображений: ${processedImages}`)
    console.log(`⚠️  Ошибок: ${errors.length}`)

    // Сохраняем товары в базу данных
    const savedProducts: Product[] = []
    for (const productData of products) {
      try {
        const savedProduct = await db.addProduct({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          ...productData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        savedProducts.push(savedProduct)
      } catch (saveError) {
        console.error('Ошибка сохранения товара:', saveError)
        errors.push(`Ошибка сохранения товара "${productData.name}"`)
      }
    }

    // Отправляем результат
    res.json({
      success: true,
      message: `Импорт завершен успешно!`,
      statistics: {
        totalRows: worksheet.rowCount - 1, // Исключаем заголовок
        processedProducts: savedProducts.length,
        processedImages,
        errors: errors.length
      },
      products: savedProducts,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error importing Excel file:', error)
    res.status(500).json({ 
      error: 'Ошибка импорта Excel файла',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Default route for non-production environment
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'PlanoAPP API is running',
      status: 'Development mode',
      api_health: '/api/health',
      available_endpoints: [
        'GET /api/health',
        'GET /api/products',
        'POST /api/products',
        'GET /api/planograms',
        'POST /api/planograms'
      ]
    })
  })
}

// 404 handler
app.use('*', (req: Request, res: Response) => {
  console.log('404 for path:', req.path)
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