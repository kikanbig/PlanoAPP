import { useState, useRef, useCallback, useEffect } from 'react'
import { Stage, Layer, Rect, Group } from 'react-konva'
import { 
  TrashIcon, 
  DocumentArrowDownIcon,
  DocumentPlusIcon,
  Cog6ToothIcon,
  CubeIcon,
  RectangleStackIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Product, ShelfItem, PlanogramSettings, RackSystem, ShelfType } from '../types'
import PlanogramItem from '../components/PlanogramItem'
import EnhancedShelf from '../components/EnhancedShelf'
import RackSystem3D from '../components/RackSystem3D'
import { apiService } from '../services/api'

export default function PlanogramEditor() {
  const [items, setItems] = useState<ShelfItem[]>([])
  const [racks, setRacks] = useState<RackSystem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showPropertiesModal, setShowPropertiesModal] = useState(false)
  const [settings, setSettings] = useState<PlanogramSettings>({
    gridSizeMm: 50,
    pixelsPerMm: 0.5,
    showGrid: true,
    snapToGrid: true,
    canvasWidth: 1200,
    canvasHeight: 800,
    showDimensions: true,
    show3D: true,
    defaultShelfDepth: 400
  })
  const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({})
  const [currentPlanogramId, setCurrentPlanogramId] = useState<string | null>(null)
  const [currentPlanogramName, setCurrentPlanogramName] = useState<string>('')
  const stageRef = useRef<any>(null)

  // Загружаем товары при инициализации
  useEffect(() => {
    loadProducts()
    loadPlanogramFromUrl()
  }, [])

  const loadPlanogramFromUrl = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const planogramId = urlParams.get('planogram')
    
    if (planogramId) {
      try {
        const planogram = await apiService.getPlanogram(planogramId)
        
        // Данные планограммы могут быть в поле data или напрямую в объекте
        const planogramData = planogram.data || planogram
        
        console.log('📋 Загружена планограмма:', {
          name: planogram.name,
          itemsCount: planogramData.items?.length || 0,
          racksCount: planogramData.racks?.length || 0,
          hasSettings: !!planogramData.settings
        })
        
        // 🎯 БЛОКИРУЕМ масштабирование при загрузке планограммы
        isScalingInProgress.current = true
        
        // Загружаем все данные одновременно
        setItems(planogramData.items || [])
        setRacks(planogramData.racks || [])
        if (planogramData.settings) {
          setSettings(prev => {
            const newSettings = { ...prev, ...planogramData.settings }
            // Обновляем prevPixelsPerMm чтобы избежать пересчета
            prevPixelsPerMm.current = newSettings.pixelsPerMm
            return newSettings
          })
        }
        
        // Сохраняем информацию о текущей планограмме
        setCurrentPlanogramId(planogram.id)
        setCurrentPlanogramName(planogram.name)
        
        // Разрешаем масштабирование через небольшую задержку
        setTimeout(() => {
          isScalingInProgress.current = false
        }, 100)
        
        toast.success(`Планограмма "${planogram.name}" загружена`)
      } catch (error) {
        console.error('Ошибка загрузки планограммы:', error)
        toast.error('Не удалось загрузить планограмму')
        isScalingInProgress.current = false
      }
    }
  }

  const loadProducts = async () => {
    try {
      setProductsLoading(true)
      const productsData = await apiService.getProducts()
      setProducts(productsData)
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error)
      toast.error('Ошибка загрузки товаров')
    } finally {
      setProductsLoading(false)
    }
  }

  // Получаем уникальные категории товаров
  const categories = ['all', ...new Set(products.map(p => p.category))]
  
  // Фильтруем товары по выбранной категории
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory)

  // Функция для загрузки изображений
  const loadImage = useCallback((imageUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (images[imageUrl]) {
        resolve(images[imageUrl])
        return
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        setImages(prev => ({ ...prev, [imageUrl]: img }))
        resolve(img)
      }
      img.onerror = reject
      img.src = imageUrl
    })
  }, [images])

  // Загружаем изображения товаров при изменении items
  useEffect(() => {
    items.forEach(item => {
      if (item.product?.imageUrl) {
        loadImage(item.product.imageUrl)
      }
    })
  }, [items, loadImage])

  // Функция для преобразования мм в пиксели
  const mmToPixels = useCallback((mm: number) => mm * settings.pixelsPerMm, [settings.pixelsPerMm])

  // Функция для привязки к сетке (в пикселях)
  const snapToGrid = useCallback((value: number) => {
    if (!settings.snapToGrid) return value
    const gridSizePixels = mmToPixels(settings.gridSizeMm)
    return Math.round(value / gridSizePixels) * gridSizePixels
  }, [settings.gridSizeMm, settings.snapToGrid, mmToPixels])

  const addShelf = useCallback((shelfType: ShelfType = 'standard') => {
    const newShelf: ShelfItem = {
      id: `shelf-${Date.now()}`,
      x: snapToGrid(50),
      y: snapToGrid(50),
      width: mmToPixels(800),
      height: mmToPixels(120),
      depth: settings.defaultShelfDepth,
      type: 'shelf',
      shelfType,
      resizable: true,
      maxLoad: shelfType === 'hook' ? 5 : shelfType === 'basket' ? 10 : 20
    }
    setItems(prev => [...prev, newShelf])
    toast.success(`Полка добавлена`)
  }, [snapToGrid, mmToPixels, settings.defaultShelfDepth])

  // Функция для создания полок с правильным позиционированием
  const createRackShelves = useCallback((rack: RackSystem) => {
    const rackWidthPx = mmToPixels(rack.width)
    const rackHeightPx = mmToPixels(rack.height)
    
    // ЕДИНАЯ ЛОГИКА: равномерно делим стеллаж на количество полок
    // Каждая полка занимает 1/levels часть от общей высоты стеллажа
    const shelfHeightPx = rackHeightPx / rack.levels
    
    const shelves: ShelfItem[] = []
    
    for (let level = 0; level < rack.levels; level++) {
      // Полки располагаются снизу вверх
      // Нижняя полка (level=0) начинается от нижнего края стеллажа
      // Каждая следующая полка выше на shelfHeightPx
      const shelfY = rack.y + rackHeightPx - (level + 1) * shelfHeightPx
      
      const shelf: ShelfItem = {
        id: `${rack.id}-shelf-${level}`,
        x: rack.x,
        y: shelfY,
        width: rackWidthPx,
        height: shelfHeightPx,
        depth: rack.depth,
        type: 'shelf',
        shelfType: 'standard',
        resizable: true,
        maxLoad: 20,
        // Метаданные
        rackId: rack.id,
        level,
        isTopShelf: level === rack.levels - 1,
        isBottomShelf: level === 0
      }
      
      shelves.push(shelf)
      
      console.log(`📐 Создана полка ${level} для стеллажа ${rack.id}:`, {
        id: shelf.id,
        level,
        x: shelf.x,
        y: shelf.y,
        width: shelf.width,
        height: shelf.height,
        heightMm: Math.round(shelf.height / settings.pixelsPerMm),
        isTopShelf: shelf.isTopShelf,
        rackHeight: rackHeightPx,
        rackHeightMm: rack.height
      })
    }
    
    console.log(`✅ Создано ${shelves.length} полок для стеллажа ${rack.id} с равномерной высотой ${Math.round(shelfHeightPx / settings.pixelsPerMm)}мм`)
    
    return shelves
  }, [mmToPixels, settings.pixelsPerMm])

  const addRack = useCallback((rackType: 'gondola' | 'wall' | 'endcap' | 'island') => {
    const rackId = `rack-${Date.now()}`
    
    // 🎯 СОЗДАЕМ новые стеллажи в разных позициях чтобы они не накладывались
    const existingRacksCount = racks.length
    const offsetX = (existingRacksCount % 3) * 300 // 3 стеллажа в ряд
    const offsetY = Math.floor(existingRacksCount / 3) * 400 // новый ряд каждые 3 стеллажа
    
    const rackX = snapToGrid(100 + offsetX)
    const rackY = snapToGrid(100 + offsetY)
    
    // Создаем стеллаж
    const newRack: RackSystem = {
      id: rackId,
      name: `Стеллаж`,
      type: rackType,
      x: rackX,
      y: rackY,
      width: 1200,
      height: 1800,
      depth: 400,
      levels: 4,
      shelves: []
    }
    
    // Автоматически создаем полки для стеллажа
    const shelves = createRackShelves(newRack)
    
    // Обновляем стеллаж с полками
    newRack.shelves = shelves
    
    // Добавляем стеллаж (полки НЕ добавляем в items - они хранятся в rack.shelves)
    setRacks(prev => [...prev, newRack])
    // НЕ добавляем полки стеллажей в items
    
    toast.success(`Стеллаж добавлен с ${newRack.levels} полками`)
  }, [snapToGrid, createRackShelves, racks.length])

  // Функция для обновления полок в стеллаже при изменении количества уровней
  const updateRackShelves = useCallback((rackId: string, newLevels: number) => {
    setRacks(prev => prev.map(rack => {
      if (rack.id !== rackId) return rack
      
      // Удаляем старые полки из items
      setItems(prevItems => prevItems.filter(item => !rack.shelves.some(shelf => shelf.id === item.id)))
      
      // Создаем обновленный стеллаж с новым количеством уровней
      const updatedRack = { ...rack, levels: newLevels }
      
      // Создаем новые полки встроенной функцией
      const newShelves: ShelfItem[] = []
      
      // Размеры стеллажа в пикселях
      const rackWidthPx = updatedRack.width * settings.pixelsPerMm
      const rackHeightPx = updatedRack.height * settings.pixelsPerMm
      
      // НОВАЯ ЛОГИКА: равномерно делим стеллаж на количество полок
      // Каждая полка занимает 1/levels часть от общей высоты стеллажа
      const shelfHeightPx = rackHeightPx / newLevels
      
      for (let i = 0; i < newLevels; i++) {
        // Полки располагаются снизу вверх
        // Нижняя полка (i=0) начинается от нижнего края стеллажа
        // Каждая следующая полка выше на shelfHeightPx
        const shelfY = updatedRack.y + rackHeightPx - (i + 1) * shelfHeightPx
        
        const shelf: ShelfItem = {
          id: `shelf-${updatedRack.id}-${i}`,
          type: 'shelf' as const,
          x: updatedRack.x,
          y: shelfY,
          width: rackWidthPx,
          height: shelfHeightPx,
          depth: updatedRack.depth,
          level: i,
          rackId: updatedRack.id
        }
        
        newShelves.push(shelf)
      }
      
      // НЕ добавляем полки стеллажей в items - они хранятся в rack.shelves
      console.log(`📋 Создали полки для стеллажа ${updatedRack.id}:`, newShelves.map(s => ({ 
        id: s.id, 
        level: s.level,
        x: s.x, 
        y: s.y,
        width: s.width,
        height: s.height,
        heightMm: Math.round(s.height / settings.pixelsPerMm),
        rackY: updatedRack.y,
        rackHeight: rackHeightPx,
        rackBottom: updatedRack.y + rackHeightPx
      })))
      
      return {
        ...updatedRack,
        shelves: newShelves
      }
    }))
  }, [settings.pixelsPerMm])

  // Функция для обновления размеров стеллажа и пересчета полок
  const updateRackDimensions = useCallback((rackId: string, newDimensions: Partial<Pick<RackSystem, 'width' | 'height' | 'depth'>>) => {
    setRacks(prev => prev.map(rack => {
      if (rack.id !== rackId) return rack
      
      const updatedRack = { ...rack, ...newDimensions }
      
      // Если изменились размеры, пересчитываем только СУЩЕСТВУЮЩИЕ полки
      if (newDimensions.width || newDimensions.height) {
        // СОХРАНЯЕМ существующие полки и только обновляем их размеры
        const updatedShelves = rack.shelves.map(existingShelf => {
          // Размеры стеллажа в пикселях
          const rackWidthPx = updatedRack.width * settings.pixelsPerMm
          const rackHeightPx = updatedRack.height * settings.pixelsPerMm
          
          // Высота одной полки
          const shelfHeightPx = rackHeightPx / rack.levels
          
          // Пересчитываем позицию полки на основе её уровня
          const shelfY = updatedRack.y + rackHeightPx - (existingShelf.level! + 1) * shelfHeightPx
          
          return {
            ...existingShelf,
            x: updatedRack.x, // обновляем позицию X стеллажа
            y: shelfY, // пересчитываем Y на основе уровня
            width: rackWidthPx, // обновляем ширину
            height: shelfHeightPx, // обновляем высоту
            depth: updatedRack.depth
          }
        })
        
        console.log(`📐 Обновлены размеры для ${updatedShelves.length} существующих полок стеллажа ${rack.id}`)
        
        return {
          ...updatedRack,
          shelves: updatedShelves
        }
      }
      
      return updatedRack
    }))
  }, [settings.pixelsPerMm])

  // Эффект для пересчета полок и товаров при изменении масштаба
  const prevPixelsPerMm = useRef(settings.pixelsPerMm)
  const isScalingInProgress = useRef(false)
  const racksRef = useRef(racks)
  const itemsRef = useRef(items)
  
  // Обновляем refs при изменении данных
  useEffect(() => {
    racksRef.current = racks
  }, [racks])
  
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  
  useEffect(() => {
    // Проверяем реальное изменение масштаба
    if (prevPixelsPerMm.current === settings.pixelsPerMm || isScalingInProgress.current) {
      return
    }
    
    const oldScale = prevPixelsPerMm.current
    const newScale = settings.pixelsPerMm
    const currentRacks = racksRef.current
    const currentItems = itemsRef.current
    
    isScalingInProgress.current = true
    
    console.log('🔄 Изменился масштаб, пересчитываем все элементы...', { 
      oldScale, 
      newScale,
      racksCount: currentRacks.length,
      itemsCount: currentItems.length 
    })
    
    // Пересчитываем все синхронно без таймеров
    const scaleRatio = newScale / oldScale
    
    // Обновляем стеллажи и их полки
    const newRacks = currentRacks.map(rack => {
      // Масштабируем позицию стеллажа
      const newRackX = rack.x * scaleRatio
      const newRackY = rack.y * scaleRatio
      
      // Размеры стеллажа в пикселях с новым масштабом
      const rackWidthPx = rack.width * newScale
      const rackHeightPx = rack.height * newScale
      
      // ОБНОВЛЯЕМ СУЩЕСТВУЮЩИЕ полки вместо создания новых
      const shelfHeightPx = rackHeightPx / rack.levels
      
      const updatedShelves = rack.shelves.map((existingShelf) => {
        const shelfLevel = existingShelf.level ?? 0
        const shelfY = newRackY + rackHeightPx - (shelfLevel + 1) * shelfHeightPx
        
        // 🎯 СОХРАНЯЕМ shelfType и другие свойства при масштабировании
        return {
          ...existingShelf, // ✅ Сохраняем все существующие свойства включая shelfType
          x: newRackX,
          y: shelfY,
          width: rackWidthPx,
          height: shelfHeightPx,
          depth: rack.depth
        }
      })
      
      console.log(`✅ Обновили полки для стеллажа ${rack.id}: ${updatedShelves.length} полок с сохранением типов`, 
        updatedShelves.map(s => ({
          id: s.id,
          level: s.level,
          shelfType: s.shelfType, // Проверяем что типы сохранились
          x: s.x,
          y: s.y,
          width: s.width,
          height: s.height
        }))
      )
      
      return {
        ...rack,
        x: newRackX,
        y: newRackY,
        shelves: updatedShelves
      }
    })
    
    // Обновляем items: НЕ включаем полки стеллажей в items (они хранятся в rack.shelves)
    const newItems = currentItems
      .filter(item => {
        // Оставляем только товары и отдельные полки (НЕ полки стеллажей)
        const shouldKeep = !(item.type === 'shelf' && item.rackId)
        if (!shouldKeep && item.type === 'shelf') {
          console.log('🗑️ Удаляем полку стеллажа из items:', item.id)
        }
        return shouldKeep
      })
      .map(item => {
        if (item.type === 'product' && item.product) {
          // Масштабируем товары
          const newWidth = item.product.width * newScale
          const newHeight = item.product.height * newScale
          
          // Масштабируем позицию товара
          const newX = item.x * scaleRatio
          const newY = item.y * scaleRatio
          
          console.log('📦 Масштабируем товар:', {
            id: item.id,
            name: item.product.name,
            oldPosition: { x: item.x, y: item.y },
            newPosition: { x: newX, y: newY },
            oldSize: { width: item.width, height: item.height },
            newSize: { width: newWidth, height: newHeight },
            scaleRatio
          })
          
          return {
            ...item,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
          }
        }
        
        if (item.type === 'shelf' && !item.rackId) {
          // Масштабируем отдельные полки
          const widthMm = item.width / oldScale
          const heightMm = item.height / oldScale
          const newX = item.x * scaleRatio
          const newY = item.y * scaleRatio
          
          console.log('📋 Масштабируем отдельную полку:', {
            id: item.id,
            oldPosition: { x: item.x, y: item.y },
            newPosition: { x: newX, y: newY },
            oldSize: { width: item.width, height: item.height },
            newSize: { width: widthMm * newScale, height: heightMm * newScale }
          })
          
          return {
            ...item,
            x: newX,
            y: newY,
            width: widthMm * newScale,
            height: heightMm * newScale
          }
        }
        
        return item
      })
    
    console.log('📊 Результат фильтрации items:', {
      originalCount: currentItems.length,
      filteredCount: newItems.length,
      products: newItems.filter(i => i.type === 'product').length,
      independentShelves: newItems.filter(i => i.type === 'shelf' && !i.rackId).length
    })
    
    // Обновляем состояние
    setRacks(newRacks)
    setItems(newItems)
    
    // Обновляем масштаб и сбрасываем флаг
    prevPixelsPerMm.current = newScale
    isScalingInProgress.current = false
    console.log('✅ Масштабирование завершено')
    
  }, [settings.pixelsPerMm]) // ТОЛЬКО pixelsPerMm!

  const addProduct = useCallback((product: Product) => {
    console.log(`🎯 ДОБАВЛЕНИЕ ТОВАРА "${product.name}":`, {
      selectedId,
      hasSelectedId: !!selectedId,
      availableRacks: racks.length,
      availableItems: items.length
    })

    if (!selectedId) {
      toast.error('Сначала выберите полку')
      return
    }

    // Ищем полку сначала в items (отдельные полки), затем в racks (полки стеллажей)
    let shelf = items.find(item => item.id === selectedId && item.type === 'shelf')
    
    console.log(`🔍 Поиск полки в items:`, {
      selectedId,
      foundInItems: !!shelf,
      allItemsIds: items.map(item => ({ id: item.id, type: item.type }))
    })
    
    if (!shelf) {
      // Ищем в полках стеллажей
      for (const rack of racks) {
        const rackShelf = rack.shelves.find(s => s.id === selectedId)
        if (rackShelf) {
          shelf = rackShelf
          console.log(`✅ Полка найдена в стеллаже ${rack.id}:`, {
            shelfId: rackShelf.id,
            shelfLevel: rack.shelves.indexOf(rackShelf),
            rackId: rack.id
          })
          break
        }
      }
    }
    
    if (!shelf) {
      toast.error('Выберите полку для размещения товара')
      return
    }

    // Проверяем ограничения полки (конвертируем размеры полки из пикселей в мм)
    const shelfHeightMm = Math.round(shelf.height / settings.pixelsPerMm)
    const shelfDepthMm = shelf.depth || 400

    // Проверяем высоту только если это НЕ верхняя полка стеллажа (у неё неограниченная высота)
    const isTopShelfOfRack = racks.some(rack => 
      rack.shelves.length > 0 && 
      rack.shelves[rack.shelves.length - 1].id === shelf.id // верхняя полка имеет максимальный level (последняя в массиве)
    )
    
    console.log(`🏷️ Определение типа полки:`, {
      shelfId: shelf.id,
      isTopShelfOfRack,
      racksWithShelves: racks.map(rack => ({
        rackId: rack.id,
        shelvesCount: rack.shelves.length,
        topShelfId: rack.shelves[rack.shelves.length - 1]?.id,
        allShelvesIds: rack.shelves.map(s => s.id)
      }))
    })
    
    if (!isTopShelfOfRack && product.height > shelfHeightMm) {
      toast.error(`Товар слишком высокий для полки (${product.height}мм > ${shelfHeightMm}мм)`)
      return
    }

    if (product.depth > shelfDepthMm) {
      toast.error(`Товар слишком глубокий для полки (${product.depth}мм > ${shelfDepthMm}мм)`)
      return
    }

    // Вычисляем размеры товара в пикселях
    const productWidthPx = mmToPixels(product.width)
    const productHeightPx = mmToPixels(product.height)
    
    // Вычисляем Y координату товара
    const shelfBottomY = shelf.y + shelf.height
    let productY: number
    
    if (isTopShelfOfRack) {
      // Для верхней полки: товар стоит НА полке
      // Товар должен касаться НИЖНЕЙ части полки (низа полки)
      // Низ товара = нижняя граница полки = shelf.y + shelf.height
      // Поэтому Y товара = (shelf.y + shelf.height) - productHeightPx
      productY = shelfBottomY - productHeightPx
      console.log(`📐 ИСПРАВЛЕННЫЙ расчет Y для верхней полки:`, {
        shelfY: shelf.y,
        shelfHeight: shelf.height,
        shelfBottom: shelfBottomY,
        productHeightPx,
        calculatedY: productY,
        productBottom: productY + productHeightPx,
        shouldEqualShelfBottom: shelfBottomY,
        explanation: 'Товар стоит НА НИЖНЕЙ ГРАНИЦЕ полки (как на всех других полках)'
      })
    } else {
      // Для обычных полок: товар размещается ВНУТРИ полки
      productY = shelfBottomY - productHeightPx
      
      // Проверяем, что товар помещается по высоте внутри полки
      if (productHeightPx > shelf.height) {
        const shelfHeightMm = Math.round(shelf.height / settings.pixelsPerMm)
        toast.error(`Товар не помещается по высоте (${product.height}мм > ${shelfHeightMm}мм)`)
        return
      }
    }
    
    // Находим все товары на этой полке
    console.log(`🔍 Поиск товаров для полки ${shelf.id}:`, {
      shelfX: shelf.x,
      shelfWidth: shelf.width,
      shelfY: shelf.y,
      shelfHeight: shelf.height,
      totalItems: items.length,
      products: items.filter(i => i.type === 'product').map(i => ({
        name: i.product?.name,
        x: i.x,
        y: i.y,
        width: i.width,
        height: i.height
      }))
    })

    const productsOnShelf = items.filter(item => {
      if (item.type !== 'product') return false
      
      // Проверяем горизонтальные границы полки (с толерантностью)
      const withinHorizontalBounds = item.x >= shelf.x - 10 && item.x < shelf.x + shelf.width + 10
      
      console.log(`🔍 Проверка товара "${item.product?.name}" для полки ${shelf.id}:`, {
        itemX: item.x,
        itemY: item.y,
        shelfX: shelf.x,
        shelfY: shelf.y,
        shelfWidth: shelf.width,
        shelfHeight: shelf.height,
        withinHorizontalBounds,
        horizontalCheck: `${item.x} >= ${shelf.x - 10} && ${item.x} < ${shelf.x + shelf.width + 10}`
      })
      
      if (!withinHorizontalBounds) return false
      
      // Для верхней полки стеллажа товары могут выступать выше полки
      if (isTopShelfOfRack) {
        // Для верхней полки: товар должен касаться нижней границы полки (может выступать выше)
        // Низ товара должен быть на уровне низа полки (с толерантностью)
        const shelfBottom = shelf.y + shelf.height
        const itemBottom = item.y + item.height
        const standsOnShelfBottom = Math.abs(itemBottom - shelfBottom) <= 10
        
        console.log(`🔍 ИСПРАВЛЕННАЯ проверка товара на верхней полке "${item.product?.name}":`, {
          shelfId: shelf.id,
          itemY: item.y,
          itemHeight: item.height,
          itemBottom: item.y + item.height,
          shelfY: shelf.y,
          shelfHeight: shelf.height,
          shelfBottom: shelf.y + shelf.height,
          standsOnShelfBottom,
          tolerance: Math.abs(itemBottom - shelfBottom),
          isTopShelf: true,
          explanation: 'Товар касается нижней границы полки (может выступать выше)'
        })
        return standsOnShelfBottom
      } else {
        // Для обычных полок: товар должен быть ВНУТРИ полки
        const withinVerticalBounds = item.y >= shelf.y && item.y + item.height <= shelf.y + shelf.height + 10
        console.log(`🔍 Проверка товара на обычной полке "${item.product?.name}":`, {
          shelfId: shelf.id,
          itemY: item.y,
          itemHeight: item.height,
          shelfY: shelf.y,
          shelfHeight: shelf.height,
          withinVerticalBounds,
          isTopShelf: false
        })
        return withinVerticalBounds
      }
    })

    // Создаем отсортированный массив занятых участков на полке
    const occupiedSpaces = productsOnShelf
      .map(item => ({
        start: item.x,
        end: item.x + item.width,
        product: item.product?.name || 'Товар'
      }))
      .sort((a, b) => a.start - b.start)

    console.log(`📋 Найдено товаров на полке ${shelf.id}:`, {
      totalProducts: productsOnShelf.length,
      products: productsOnShelf.map(p => ({
        name: p.product?.name,
        x: p.x,
        width: p.width,
        y: p.y,
        height: p.height
      })),
      occupiedSpaces,
      isTopShelf: isTopShelfOfRack
    })

    // Ищем свободное место для товара
    const spacingPx = mmToPixels(product.spacing || 50) // используем spacing из товара (по умолчанию 50мм)
    let nextX = shelf.x // начинаем от левого края полки

    console.log(`🔍 Начинаем поиск места для товара "${product.name}":`, {
      shelfX: shelf.x,
      shelfWidth: shelf.width,
      productWidth: productWidthPx,
      spacing: spacingPx,
      totalProductsOnShelf: productsOnShelf.length,
      occupiedSpaces: occupiedSpaces.length
    })

    // Проходим по всем занятым участкам и ищем место
    for (const space of occupiedSpaces) {
      console.log(`🔍 Проверяем место: nextX=${nextX}, productWidth=${productWidthPx}, spacing=${spacingPx}, spaceStart=${space.start}`)
      if (nextX + productWidthPx <= space.start) {
        // Товар помещается перед этим участком (без дополнительного spacing)
        console.log(`✅ Товар помещается перед "${space.product}" в позицию X=${nextX}`)
        break
      }
      // Сдвигаем позицию за текущий участок
      const oldNextX = nextX
      nextX = space.end + spacingPx
      console.log(`➡️ Сдвигаем позицию: ${oldNextX} → ${nextX} (за товаром "${space.product}")`)
    }

    // Проверяем, помещается ли товар в оставшееся место на полке
    const shelfRightEdge = shelf.x + shelf.width
    if (nextX + productWidthPx > shelfRightEdge) {
      const availableWidthMm = Math.round((shelfRightEdge - nextX) / settings.pixelsPerMm)
      toast.error(`Недостаточно места на полке (нужно ${product.width}мм, доступно ${availableWidthMm}мм)`)
      return
    }

    // Определяем к какому стеллажу принадлежит полка
    let rackId: string | undefined = undefined
    for (const rack of racks) {
      if (rack.shelves.some(s => s.id === shelf.id)) {
        rackId = rack.id
        break
      }
    }

    // Создаем новый товар
    const newProduct: ShelfItem = {
      id: `product-${Date.now()}`,
      x: snapToGrid(nextX),
      y: snapToGrid(productY),
      width: productWidthPx,
      height: productHeightPx,
      depth: product.depth,
      product,
      type: 'product',
      rackId: rackId,
      shelfId: shelf.id
    }

    console.log(`🎯 Создаем новый товар "${product.name}":`, {
      finalX: snapToGrid(nextX),
      finalY: snapToGrid(productY),
      width: productWidthPx,
      height: productHeightPx,
      shelfId: shelf.id,
      shelfY: shelf.y,
      shelfHeight: shelf.height,
      shelfBottom: shelf.y + shelf.height,
      isTopShelf: isTopShelfOfRack
    })

    setItems(prev => [...prev, newProduct])
    
    // Показываем информацию о размещении
    const remainingWidthMm = Math.round((shelfRightEdge - nextX - productWidthPx) / settings.pixelsPerMm)
    toast.success(`Товар "${product.name}" добавлен. Свободно: ${remainingWidthMm}мм`)
  }, [selectedId, items, racks, snapToGrid, mmToPixels, settings.pixelsPerMm])

  // Функция для перемещения товаров к нижней границе полки
  const repositionProductsOnShelf = useCallback((shelfId: string) => {
    setItems(prev => {
      // Находим полку сначала в items (отдельные полки), затем в racks (полки стеллажей)
      let shelf = prev.find(item => item.id === shelfId)
      
      if (!shelf) {
        // Ищем в полках стеллажей
        for (const rack of racks) {
          const rackShelf = rack.shelves.find(s => s.id === shelfId)
          if (rackShelf) {
            shelf = rackShelf
            break
          }
        }
      }
      
      if (!shelf) return prev

      return prev.map(item => {
        // Проверяем, что это товар на данной полке
        if (item.type === 'product' && 
            item.x >= shelf.x - 10 && // небольшая толерантность слева
            item.x < shelf.x + shelf.width + 10 && // и справа
            item.y >= shelf.y - 50 && // товар находится рядом с полкой (с толерантностью)
            item.y <= shelf.y + shelf.height + 50) { // в пределах полки
          
          // Перемещаем товар ВНУТРИ полки (прижимаем к нижней границе)
          const shelfBottomY = shelf.y + shelf.height
          const newY = shelfBottomY - item.height // товар размещается ВНУТРИ полки
          return {
            ...item,
            y: snapToGrid(newY)
          }
        }
        return item
      })
    })
  }, [snapToGrid, racks])

  // Функция для равномерного распределения товаров на полке
  const distributeProductsEvenly = useCallback((shelfId: string) => {
    setItems(prev => {
      // Находим полку сначала в items (отдельные полки), затем в racks (полки стеллажей)
      let shelf = prev.find(item => item.id === shelfId)
      
      if (!shelf) {
        // Ищем в полках стеллажей
        for (const rack of racks) {
          const rackShelf = rack.shelves.find(s => s.id === shelfId)
          if (rackShelf) {
            shelf = rackShelf
            break
          }
        }
      }
      
      if (!shelf) {
        console.warn('Полка не найдена:', shelfId)
        return prev
      }

      // Находим все товары на этой полке
      const productsOnShelf = prev.filter(item => 
        item.type === 'product' && 
        item.x >= shelf.x - 10 && 
        item.x < shelf.x + shelf.width + 10 && 
        item.y >= shelf.y - 50 && 
        item.y <= shelf.y + shelf.height + 50
      )

      if (productsOnShelf.length === 0) {
        toast.success('На полке нет товаров для распределения')
        return prev
      }

      if (productsOnShelf.length === 1) {
        toast.success('На полке только один товар')
        return prev
      }

      // Сортируем товары по X координате (слева направо)
      const sortedProducts = [...productsOnShelf].sort((a, b) => a.x - b.x)
      
      // Вычисляем общую ширину всех товаров
      const totalProductsWidth = sortedProducts.reduce((sum, product) => sum + product.width, 0)
      
      // Доступная ширина полки (оставляем небольшие отступы от краев)
      const edgeMargin = 10 // отступ от краев полки
      const availableWidth = shelf.width - (edgeMargin * 2)
      
      // Если товары не помещаются на полке, показываем предупреждение
      if (totalProductsWidth > availableWidth) {
        toast.error('Товары слишком широкие для равномерного размещения на полке')
        return prev
      }

      // Вычисляем равномерные промежутки между товарами
      const totalSpacing = availableWidth - totalProductsWidth
      const spacingBetweenProducts = totalSpacing / (sortedProducts.length - 1) // промежутки МЕЖДУ товарами
      
      console.log(`📐 Равномерное распределение ${sortedProducts.length} товаров:`, {
        shelfWidth: shelf.width,
        availableWidth,
        totalProductsWidth,
        totalSpacing,
        spacingBetweenProducts: Math.round(spacingBetweenProducts),
        edgeMargin
      })

      // Обновляем позиции товаров БЕЗ привязки к сетке для точного равномерного распределения
      return prev.map(item => {
        const productIndex = sortedProducts.findIndex(p => p.id === item.id)
        if (productIndex !== -1) {
          // Вычисляем новую X позицию для этого товара
          let newX = shelf.x + edgeMargin // начинаем с отступа от левого края
          
          // Добавляем ширину всех предыдущих товаров и промежутки между ними
          for (let i = 0; i < productIndex; i++) {
            newX += sortedProducts[i].width + spacingBetweenProducts
          }
          
          // Позиционируем товар к нижней границе полки
          const shelfBottomY = shelf.y + shelf.height
          const newY = shelfBottomY - item.height
          
          return {
            ...item,
            x: newX, // БЕЗ snapToGrid для точного позиционирования
            y: newY  // БЕЗ snapToGrid для точного позиционирования
          }
        }
        return item
      })
    })
    
    toast.success('Товары равномерно распределены по полке')
  }, [racks]) // убрал snapToGrid из зависимостей

  const deleteItem = useCallback((id: string) => {
    // Проверяем, удаляется ли стеллаж
    const rackToDelete = racks.find(rack => rack.id === id)
    
    if (rackToDelete) {
      // Удаляем стеллаж и все его полки и товары
      const shelfIds = rackToDelete.shelves.map(shelf => shelf.id)
      
      // Находим все товары на полках этого стеллажа
      const productsToDelete = items.filter(item => 
        item.type === 'product' && 
        shelfIds.some(shelfId => {
          // Ищем полку в стеллажах, а не в items
          const shelf = rackToDelete.shelves.find(s => s.id === shelfId)
          if (!shelf) return false
          return item.x >= shelf.x - 10 && 
                 item.x < shelf.x + shelf.width + 10 && 
                 item.y >= shelf.y && // товар находится ВНУТРИ полки
                 item.y + item.height <= shelf.y + shelf.height + 10 // и помещается по высоте
        })
      )
      
      // Удаляем стеллаж, его полки и товары
      setRacks(prev => prev.filter(rack => rack.id !== id))
      setItems(prev => prev.filter(item => 
        !shelfIds.includes(item.id) && 
        !productsToDelete.some(product => product.id === item.id)
      ))
      
      toast.success(`Стеллаж удален вместе с ${rackToDelete.shelves.length} полками и ${productsToDelete.length} товарами`)
      setSelectedId(null)
      return
    }
    
    // Проверяем, удаляется ли полка стеллажа
    let shelfToDelete = null
    let parentRack = null
    
    for (const rack of racks) {
      const shelfFound = rack.shelves.find(shelf => shelf.id === id)
      if (shelfFound) {
        shelfToDelete = shelfFound
        parentRack = rack
        break
      }
    }
    
    if (shelfToDelete && parentRack) {
      // Удаляем полку из стеллажа БЕЗ перестройки других полок
      console.log(`🗑️ Удаляем полку стеллажа: ${shelfToDelete.id} из стеллажа ${parentRack.id}`)
      
      // Находим товары на этой полке
      const productsToDelete = items.filter(item => 
        item.type === 'product' && 
        item.x >= shelfToDelete.x - 10 && 
        item.x < shelfToDelete.x + shelfToDelete.width + 10 && 
        item.y >= shelfToDelete.y && 
        item.y + item.height <= shelfToDelete.y + shelfToDelete.height + 10
      )
      
      // Просто удаляем полку из стеллажа, не трогая остальные
      setRacks(prev => prev.map(rack => {
        if (rack.id !== parentRack.id) return rack
        
        const remainingShelves = rack.shelves.filter(shelf => shelf.id !== id)
        
        return {
          ...rack,
          shelves: remainingShelves
        }
      }))
      
      // Удаляем товары с этой полки
      setItems(prev => prev.filter(item => 
        !productsToDelete.some(product => product.id === item.id)
      ))
      
      toast.success(`Полка удалена вместе с ${productsToDelete.length} товарами`)
      setSelectedId(null)
      return
    }
    
    // Обычное удаление элемента (отдельные полки, товары)
    const itemToDelete = items.find(item => item.id === id)
    if (itemToDelete) {
      setItems(prev => prev.filter(item => item.id !== id))
      toast.success('Элемент удален')
      setSelectedId(null)
    } else {
      console.warn('Элемент для удаления не найден:', id)
      toast.error('Элемент не найден')
    }
  }, [racks, items, mmToPixels])

  const exportToPNG = useCallback(() => {
    if (stageRef.current) {
      // Получаем текущий размер Stage
      const stage = stageRef.current
      const originalScale = stage.scaleX()
      
      // Увеличиваем разрешение в 2 раза для лучшего качества
      const scale = 2
      
      try {
        // Временно увеличиваем масштаб для экспорта
        stage.scale({ x: originalScale * scale, y: originalScale * scale })
        
        // Экспортируем с высоким качеством
        const dataURL = stage.toDataURL({ 
          mimeType: 'image/png',
          quality: 1,
          pixelRatio: scale // Увеличенное разрешение
        })
        
        // Возвращаем исходный масштаб
        stage.scale({ x: originalScale, y: originalScale })
        
        // Создаем и скачиваем файл
        const link = document.createElement('a')
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        link.download = `planogram-${timestamp}.png`
        link.href = dataURL
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast.success('Планограмма экспортирована в высоком качестве')
      } catch (error) {
        console.error('Ошибка экспорта:', error)
        // Возвращаем исходный масштаб в случае ошибки
        stage.scale({ x: originalScale, y: originalScale })
        toast.error('Ошибка экспорта планограммы')
      }
    }
  }, [])

  const savePlanogram = useCallback(async () => {
    // Если планограмма уже открыта, предлагаем обновить или сохранить как новую
    let planogramName = currentPlanogramName || ''
    let shouldUpdate = false
    
    if (currentPlanogramId && currentPlanogramName) {
      const action = confirm(
        `Планограмма "${currentPlanogramName}" уже открыта.\n\n` +
        'Нажмите "ОК" чтобы ОБНОВИТЬ существующую планограмму,\n' +
        'или "Отмена" чтобы сохранить как новую.'
      )
      
      if (action) {
        shouldUpdate = true
      } else {
        const newName = prompt('Введите название новой планограммы:', `${currentPlanogramName} (копия)`)
        if (!newName) return
        planogramName = newName
      }
    } else {
      const newName = prompt('Введите название планограммы:', `Планограмма ${new Date().toLocaleDateString()}`)
      if (!newName) return
      planogramName = newName
    }

    try {
      const planogramData = {
        name: planogramName,
        category: 'Основная',
        items: items,
        racks: racks,
        settings: settings
      }

      if (shouldUpdate && currentPlanogramId) {
        await apiService.updatePlanogram(currentPlanogramId, planogramData)
        setCurrentPlanogramName(planogramName)
        toast.success(`Планограмма "${planogramName}" обновлена!`)
      } else {
        const newPlanogram = await apiService.createPlanogram(planogramData)
        setCurrentPlanogramId(newPlanogram.id)
        setCurrentPlanogramName(newPlanogram.name)
        toast.success('Планограмма сохранена как новая!')
      }
    } catch (error) {
      console.error('Ошибка сохранения планограммы:', error)
      toast.error('Ошибка сохранения планограммы')
    }
  }, [items, racks, settings, currentPlanogramId, currentPlanogramName])

  const createNewPlanogram = useCallback(() => {
    if (items.length > 0 || racks.length > 0) {
      const shouldClear = confirm(
        'Создать новую планограмму?\n\n' +
        'Текущие данные будут очищены. Убедитесь что вы сохранили изменения.'
      )
      if (!shouldClear) return
    }
    
    // Очищаем все данные
    setItems([])
    setRacks([])
    setSelectedId(null)
    setCurrentPlanogramId(null)
    setCurrentPlanogramName('')
    
    // Сбрасываем настройки к дефолтным
    setSettings({
      gridSizeMm: 50,
      pixelsPerMm: 0.5,
      showGrid: true,
      snapToGrid: true,
      canvasWidth: 1200,
      canvasHeight: 800,
      showDimensions: true,
      show3D: true,
      defaultShelfDepth: 400
    })
    
    toast.success('Новая планограмма создана')
  }, [items.length, racks.length])

  // Обработка клавиатуры
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId) {
        deleteItem(selectedId)
      }
      if (e.key === 'Escape') {
        setSelectedId(null)
        setShowPropertiesModal(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, deleteItem])

  // Получить выбранный элемент
  const selectedItem = (() => {
    if (!selectedId) return null
    
    // Ищем сначала в items (отдельные полки, товары)
    const itemFound = items.find(item => item.id === selectedId)
    if (itemFound) return itemFound
    
    // Ищем среди стеллажей
    const rackFound = racks.find(rack => rack.id === selectedId)
    if (rackFound) return rackFound
    
    // Ищем среди полок стеллажей
    for (const rack of racks) {
      const shelfFound = rack.shelves.find(shelf => shelf.id === selectedId)
      if (shelfFound) return shelfFound
    }
    
    return null
  })()
  
  const isRack = selectedItem && 'levels' in selectedItem
  const isShelf = selectedItem && !isRack && selectedItem.type === 'shelf'

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Редактор планограмм</h1>
          
          {currentPlanogramName && (
            <p className="text-sm text-gray-600 mb-3">
              📋 {currentPlanogramName}
              {currentPlanogramId && <span className="text-green-600 ml-2">● Открыта</span>}
            </p>
          )}
          
          {/* Key Action Buttons */}
          <div className="flex gap-3 mb-3">
            <button
              onClick={savePlanogram}
              className="btn btn-success flex items-center gap-2 text-sm py-2 px-4 shadow-md flex-1"
              title={currentPlanogramId ? `Обновить планограмму "${currentPlanogramName}"` : "Сохранить планограмму"}
            >
              <CloudArrowUpIcon className="w-5 h-5" />
              {currentPlanogramId ? 'Обновить планограмму' : 'Сохранить планограмму'}
            </button>
            <button
              onClick={exportToPNG}
              className="btn btn-secondary flex items-center gap-2 text-sm py-2 px-4 shadow-md"
              title="Экспорт в PNG"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              Экспорт PNG
            </button>
          </div>
          
          {/* Secondary Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={createNewPlanogram}
              className="btn btn-secondary flex items-center gap-1 text-sm py-1 px-2"
              title="Создать новую планограмму"
            >
              <DocumentPlusIcon className="w-4 h-4" />
              Новая
            </button>
            <button
              onClick={() => addShelf()}
              className="btn btn-primary flex items-center gap-1 text-sm py-1 px-2"
              title="Добавить полку"
            >
              <RectangleStackIcon className="w-4 h-4" />
              Полка
            </button>
            <button
              onClick={() => addRack('gondola')}
              className="btn btn-primary flex items-center gap-1 text-sm py-1 px-2"
              title="Добавить стеллаж"
            >
              <CubeIcon className="w-4 h-4" />
              Стеллаж
            </button>
            {selectedId && (
              <button
                onClick={() => deleteItem(selectedId)}
                className="btn btn-danger flex items-center gap-1 text-sm py-1 px-2"
                title="Удалить элемент"
              >
                <TrashIcon className="w-4 h-4" />
                Удалить
              </button>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
            <Cog6ToothIcon className="w-4 h-4 mr-2" />
            Настройки
          </h3>
          
          {/* Смена типа полки */}
          {isShelf && selectedItem && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
              <label className="block text-xs font-medium text-blue-800 mb-1">
                Тип полки:
              </label>
              <select
                value={selectedItem.shelfType || 'standard'}
                onChange={(e) => {
                  const newShelfType = e.target.value as any
                  // Обновляем полку в items или в racks
                  const itemInItems = items.find(item => item.id === selectedId)
                  if (itemInItems) {
                    setItems(prev => prev.map(item => 
                      item.id === selectedId 
                        ? { ...item, shelfType: newShelfType }
                        : item
                    ))
                  } else {
                    // Ищем в полках стеллажей
                    setRacks(prev => prev.map(rack => ({
                      ...rack,
                      shelves: rack.shelves.map(shelf => 
                        shelf.id === selectedId 
                          ? { ...shelf, shelfType: newShelfType }
                          : shelf
                      )
                    })))
                  }
                }}
                className="w-full text-xs p-1 border border-blue-300 rounded bg-white"
              >
                <option value="standard">📋 Стандартная</option>
                <option value="hook">👔 Крючки</option>
                <option value="basket">🧺 Корзина</option>
                <option value="divider">📐 С разделителями</option>
                <option value="slanted">📐 Наклонная</option>
                <option value="wire">🔗 Проволочная</option>
                <option value="bottle">🍾 Для бутылок</option>
                <option value="pegboard">🔩 Перфорированная</option>
              </select>
            </div>
          )}
          
          {/* Быстрое добавление разных типов полок */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Добавить полку:
            </label>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => addShelf('standard')}
                className="text-xs p-1 bg-gray-100 hover:bg-gray-200 rounded border text-left"
                title="Стандартная полка"
              >
                📋 Стандарт
              </button>
              <button
                onClick={() => addShelf('hook')}
                className="text-xs p-1 bg-yellow-100 hover:bg-yellow-200 rounded border text-left"
                title="Полка с крючками"
              >
                👔 Крючки
              </button>
              <button
                onClick={() => addShelf('basket')}
                className="text-xs p-1 bg-blue-100 hover:bg-blue-200 rounded border text-left"
                title="Корзина"
              >
                🧺 Корзина
              </button>
              <button
                onClick={() => addShelf('wire')}
                className="text-xs p-1 bg-gray-100 hover:bg-gray-200 rounded border text-left"
                title="Проволочная полка"
              >
                🔗 Проволочная
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <label className="flex items-center text-xs text-gray-700">
              <input
                type="checkbox"
                checked={settings.showGrid}
                onChange={(e) => setSettings(prev => ({ ...prev, showGrid: e.target.checked }))}
                className="mr-1"
              />
              Сетка
            </label>
            
            <label className="flex items-center text-xs text-gray-700">
              <input
                type="checkbox"
                checked={settings.snapToGrid}
                onChange={(e) => setSettings(prev => ({ ...prev, snapToGrid: e.target.checked }))}
                className="mr-1"
              />
              Привязка
            </label>
            
            <label className="flex items-center text-xs text-gray-700">
              <input
                type="checkbox"
                checked={settings.showDimensions}
                onChange={(e) => setSettings(prev => ({ ...prev, showDimensions: e.target.checked }))}
                className="mr-1"
              />
              Размеры
            </label>
            
            <label className="flex items-center text-xs text-gray-700">
              <input
                type="checkbox"
                checked={settings.show3D}
                onChange={(e) => setSettings(prev => ({ ...prev, show3D: e.target.checked }))}
                className="mr-1"
              />
              3D
            </label>
          </div>
          
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Размер сетки (мм)
              </label>
              <select
                value={settings.gridSizeMm}
                onChange={(e) => setSettings(prev => ({ ...prev, gridSizeMm: Number(e.target.value) }))}
                className="input w-full text-sm h-8"
              >
                <option value={10}>10мм - мелкая</option>
                <option value={25}>25мм - средняя</option>
                <option value={50}>50мм - стандартная</option>
                <option value={100}>100мм - крупная</option>
                <option value={200}>200мм - очень крупная</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Масштаб (px/мм)
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.pixelsPerMm}
                onChange={(e) => setSettings(prev => ({ ...prev, pixelsPerMm: Number(e.target.value) }))}
                className="input w-full text-sm h-8"
                min="0.1"
                max="2"
              />
            </div>
          </div>
        </div>

        {/* Products Catalog */}
        <div className="flex-1 p-3 flex flex-col min-h-0">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Каталог товаров
          </h3>
          
          {/* Category Filter */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Фильтр по категории:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">📦 Все категории ({products.length})</option>
              {categories.slice(1).map(category => {
                const count = products.filter(p => p.category === category).length
                return (
                  <option key={category} value={category}>
                    {category} ({count})
                  </option>
                )
              })}
            </select>
          </div>
          
          <div className="space-y-2 overflow-y-auto flex-1">
            {productsLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                <span className="ml-2 text-sm text-gray-600">Загрузка...</span>
              </div>
            ) : (
              filteredProducts.map((product) => (
              <div
                key={product.id}
                className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => addProduct(product)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.width}×{product.height}×{product.depth}мм
                    </p>
                    <p className="text-xs text-gray-400">
                      {product.category}
                    </p>
                  </div>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-8 h-8 rounded border border-gray-300 object-cover"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: product.color }}
                    />
                  )}
                </div>
              </div>
              ))
            )}
          </div>
          
          {/* Properties Button */}
          {selectedId && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowPropertiesModal(true)}
                className="btn btn-secondary w-full flex items-center justify-center gap-2 text-sm py-2"
                title="Свойства элемента"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                Свойства элемента
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-sm h-full">
          {/* Canvas Info */}
          <div className="p-3 border-b border-gray-200 bg-gray-50 text-xs text-gray-600">
            Размер холста: {Math.round(settings.canvasWidth / settings.pixelsPerMm)}×{Math.round(settings.canvasHeight / settings.pixelsPerMm)}мм 
            | Сетка: {settings.gridSizeMm}мм 
            | Масштаб: {settings.pixelsPerMm}px/мм
            {settings.snapToGrid && ' | Привязка включена'}
            {selectedItem && ` | Выбран: ${isRack ? selectedItem.name : selectedItem.product?.name || 'Элемент'}`}
          </div>
          
          <Stage
            ref={stageRef}
            width={settings.canvasWidth}
            height={settings.canvasHeight}
            onMouseDown={(e) => {
              const clickedOnEmpty = e.target === e.target.getStage()
              if (clickedOnEmpty) {
                setSelectedId(null)
              }
            }}
          >
            {/* Слой сетки */}
            <Layer>
              {/* Grid */}
              {settings.showGrid && (() => {
                const gridSizePixels = mmToPixels(settings.gridSizeMm)
                const verticalLines = Math.ceil(settings.canvasWidth / gridSizePixels)
                const horizontalLines = Math.ceil(settings.canvasHeight / gridSizePixels)
                
                return (
                  <>
                    {Array.from({ length: verticalLines }, (_, i) => (
                      <Group key={`grid-v-${i}`}>
                        <Rect
                          x={i * gridSizePixels}
                          y={0}
                          width={1}
                          height={settings.canvasHeight}
                          fill="#f3f4f6"
                        />
                      </Group>
                    ))}
                    {Array.from({ length: horizontalLines }, (_, i) => (
                      <Group key={`grid-h-${i}`}>
                        <Rect
                          x={0}
                          y={i * gridSizePixels}
                          width={settings.canvasWidth}
                          height={1}
                          fill="#f3f4f6"
                        />
                      </Group>
                    ))}
                  </>
                )
              })()}
            </Layer>

            {/* Слой стеллажей */}
            <Layer>
              {racks.map((rack) => (
                <RackSystem3D
                  key={rack.id}
                  rack={rack}
                  settings={settings}
                  x={rack.x}
                  y={rack.y}
                  isSelected={selectedId === rack.id}
                  onClick={() => setSelectedId(rack.id)}
                  onDragEnd={(e) => {
                    const newX = snapToGrid(e.target.x())
                    const newY = snapToGrid(e.target.y())
                    
                    // Вычисляем смещение
                    const deltaX = newX - rack.x
                    const deltaY = newY - rack.y
                    
                    // Обновляем позицию стеллажа И позиции его полок
                    setRacks(prev => prev.map(r => 
                      r.id === rack.id 
                        ? { 
                            ...r, 
                            x: newX, 
                            y: newY,
                            // 🎯 ОБНОВЛЯЕМ позиции полок внутри стеллажа
                            shelves: r.shelves.map(shelf => ({
                              ...shelf,
                              x: shelf.x + deltaX,
                              y: shelf.y + deltaY
                            }))
                          }
                        : r
                    ))
                    
                    // Также обновляем позиции товаров на полках стеллажа
                    setItems(prev => prev.map(item => {
                      // 🎯 ИСПРАВЛЕНО: проверяем принадлежность товара к стеллажу по rackId
                      if (item.type === 'product' && item.rackId === rack.id) {
                        return { ...item, x: item.x + deltaX, y: item.y + deltaY }
                      }
                      return item
                    }))
                  }}
                />
              ))}
            </Layer>

            {/* Слой полок стеллажей */}
            <Layer>
              {(() => {
                const rackShelves = racks.flatMap(rack => rack.shelves)
                console.log('🏗️ Отрисовка полок стеллажей:', {
                  racksCount: racks.length,
                  totalShelves: rackShelves.length,
                  shelves: rackShelves.map(s => ({
                    id: s.id,
                    x: s.x,
                    y: s.y,
                    width: s.width,
                    height: s.height
                  }))
                })
                return rackShelves.map(shelf => (
                  <EnhancedShelf
                    key={shelf.id}
                    shelf={shelf}
                    settings={settings}
                    isSelected={selectedId === shelf.id}
                    onClick={() => setSelectedId(shelf.id)}
                    onDragEnd={() => {}} // Полки стеллажей не должны перемещаться независимо
                    onTransformEnd={() => {}} // Полки стеллажей не должны изменять размер независимо
                    onDistributeProducts={distributeProductsEvenly}
                  />
                ))
              })()}
            </Layer>

            {/* Слой отдельных полок */}
            <Layer>
              {items.filter(item => item.type === 'shelf').map((item) => (
                  <EnhancedShelf
                    key={item.id}
                    shelf={item}
                    settings={settings}
                    isSelected={selectedId === item.id}
                    onClick={() => setSelectedId(item.id)}
                    onDragEnd={(e) => {
                      const newX = snapToGrid(e.target.x())
                      const newY = snapToGrid(e.target.y())
                      setItems(prev => prev.map(i => 
                        i.id === item.id 
                          ? { ...i, x: newX, y: newY }
                          : i
                      ))
                    }}
                    onTransformEnd={(e) => {
                      console.log('🔄 Transform end:', e)
                      setItems(prev => prev.map(i => 
                        i.id === item.id 
                          ? { 
                              ...i, 
                              width: snapToGrid(e.width), 
                              height: snapToGrid(e.height) 
                            }
                          : i
                      ))
                      // Перемещаем товары к новой нижней границе полки
                      setTimeout(() => repositionProductsOnShelf(item.id), 200)
                    }}
                    onDistributeProducts={distributeProductsEvenly}
                  />
                ))}
            </Layer>

            {/* Слой товаров (поверх всего) */}
            <Layer>
              {items.filter(item => item.type === 'product').map((item) => (
                <PlanogramItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  image={item.product?.imageUrl ? images[item.product.imageUrl] : undefined}
                  onClick={() => setSelectedId(item.id)}
                  onDragEnd={(e) => {
                    const newX = snapToGrid(e.target.x())
                    const newY = snapToGrid(e.target.y())
                    setItems(prev => prev.map(i => 
                      i.id === item.id 
                        ? { ...i, x: newX, y: newY }
                        : i
                    ))
                  }}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Properties Modal */}
      {showPropertiesModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Свойства элемента
              </h3>
              <button
                onClick={() => setShowPropertiesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div>
                <strong>
                  {isRack 
                    ? selectedItem.name 
                    : selectedItem.product?.name || 'Полка'
                  }
                </strong>
              </div>
              
              {isRack ? (
                <>
                  <div className="text-gray-600">
                    Тип: {selectedItem.type === 'gondola' ? 'Гондола' : selectedItem.type === 'wall' ? 'Пристенный' : selectedItem.type === 'endcap' ? 'Торцевой' : 'Островной'}
                  </div>
                  
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium text-gray-800 mb-3">Настройки стеллажа:</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Количество уровней:
                        </label>
                        <input
                          type="number"
                          value={selectedItem.levels}
                          onChange={(e) => {
                            const newLevels = Math.max(1, Math.min(8, Number(e.target.value)))
                            updateRackShelves(selectedItem.id, newLevels)
                          }}
                          className="input w-full text-sm h-8"
                          min="1"
                          max="8"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Ширина (мм):
                        </label>
                        <input
                          type="number"
                          value={selectedItem.width}
                          onChange={(e) => {
                            const newWidth = Number(e.target.value)
                            updateRackDimensions(selectedItem.id, { width: newWidth })
                          }}
                          className="input w-full text-sm h-8"
                          min="400"
                          max="3000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Высота (мм):
                        </label>
                        <input
                          type="number"
                          value={selectedItem.height}
                          onChange={(e) => {
                            const newHeight = Number(e.target.value)
                            updateRackDimensions(selectedItem.id, { height: newHeight })
                          }}
                          className="input w-full text-sm h-8"
                          min="800"
                          max="3000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Глубина (мм):
                        </label>
                        <input
                          type="number"
                          value={selectedItem.depth}
                          onChange={(e) => {
                            const newDepth = Number(e.target.value)
                            updateRackDimensions(selectedItem.id, { depth: newDepth })
                          }}
                          className="input w-full text-sm h-8"
                          min="200"
                          max="800"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-gray-600">
                    Позиция: ({Math.round(selectedItem.x / settings.pixelsPerMm)}, {Math.round(selectedItem.y / settings.pixelsPerMm)})мм
                  </div>
                  
                  {isShelf && (
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium text-gray-800 mb-3">Настройки размеров:</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Ширина (мм):
                          </label>
                          <input
                            type="number"
                            value={Math.round(selectedItem.width / settings.pixelsPerMm)}
                            onChange={(e) => {
                              const newWidthMm = Number(e.target.value)
                              const newWidthPx = newWidthMm * settings.pixelsPerMm
                              setItems(prev => prev.map(item => 
                                item.id === selectedId 
                                  ? { ...item, width: newWidthPx }
                                  : item
                              ))
                            }}
                            onBlur={() => {
                              // Перемещаем товары только после завершения ввода
                              setTimeout(() => repositionProductsOnShelf(selectedId!), 100)
                            }}
                            className="input w-full text-sm h-8"
                            min="50"
                            max="2000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Высота (мм):
                          </label>
                          <input
                            type="number"
                            value={Math.round(selectedItem.height / settings.pixelsPerMm)}
                            onChange={(e) => {
                              const newHeightMm = Number(e.target.value)
                              const newHeightPx = newHeightMm * settings.pixelsPerMm
                              setItems(prev => prev.map(item => 
                                item.id === selectedId 
                                  ? { ...item, height: newHeightPx }
                                  : item
                              ))
                            }}
                            onBlur={() => {
                              // Перемещаем товары только после завершения ввода
                              setTimeout(() => repositionProductsOnShelf(selectedId!), 100)
                            }}
                            className="input w-full text-sm h-8"
                            min="20"
                            max="500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Глубина (мм):
                          </label>
                          <input
                            type="number"
                            value={selectedItem.depth || settings.defaultShelfDepth}
                            onChange={(e) => {
                              const newDepth = Number(e.target.value)
                              setItems(prev => prev.map(item => 
                                item.id === selectedId 
                                  ? { ...item, depth: newDepth }
                                  : item
                              ))
                            }}
                            className="input w-full text-sm h-8"
                            min="100"
                            max="800"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedItem.product && (
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium text-gray-800 mb-2">Информация о товаре:</h4>
                      <div className="text-gray-600">
                        Размер товара: {selectedItem.product.width}×{selectedItem.product.height}×{selectedItem.product.depth}мм
                      </div>
                      <div className="text-gray-600">
                        Категория: {selectedItem.product.category}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowPropertiesModal(false)}
                className="btn btn-secondary"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 