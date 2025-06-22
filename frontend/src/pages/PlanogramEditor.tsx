import { useState, useRef, useCallback, useEffect } from 'react'
import { Stage, Layer, Rect, Text, Group, Image as KonvaImage, Transformer } from 'react-konva'
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  CubeIcon,
  RectangleStackIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Product, ShelfItem, PlanogramSettings, RackSystem } from '../types'
import PlanogramItem from '../components/PlanogramItem'
import EnhancedShelf from '../components/EnhancedShelf'
import RackSystem3D from '../components/RackSystem3D'
import { apiService } from '../services/api'

export default function PlanogramEditor() {
  const [items, setItems] = useState<ShelfItem[]>([])
  const [racks, setRacks] = useState<RackSystem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
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
        setItems(planogram.items || [])
        setRacks(planogram.racks || [])
        setSettings(prev => ({ ...prev, ...planogram.settings }))
        toast.success(`Планограмма "${planogram.name}" загружена`)
      } catch (error) {
        console.error('Ошибка загрузки планограммы:', error)
        toast.error('Не удалось загрузить планограмму')
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
      img.src = imageUrl.startsWith('/') ? `http://localhost:4000${imageUrl}` : imageUrl
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

  const addShelf = useCallback((shelfType: 'standard' | 'hook' | 'basket' | 'divider' = 'standard') => {
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

  const addRack = useCallback((rackType: 'gondola' | 'wall' | 'endcap' | 'island') => {
    const newRack: RackSystem = {
      id: `rack-${Date.now()}`,
      name: `Стеллаж`,
      type: rackType,
      width: 1200,
      height: 1800,
      depth: 400,
      levels: 4,
      shelves: []
    }
    setRacks(prev => [...prev, newRack])
    toast.success('Стеллаж добавлен')
  }, [])

  const addProduct = useCallback((product: Product) => {
    if (!selectedId) {
      toast.error('Сначала выберите полку')
      return
    }

    const shelf = items.find(item => item.id === selectedId && item.type === 'shelf')
    if (!shelf) {
      toast.error('Выберите полку для размещения товара')
      return
    }

    // Проверяем ограничения полки (конвертируем размеры полки из пикселей в мм)
    const shelfHeightMm = Math.round(shelf.height / settings.pixelsPerMm)
    const shelfDepthMm = shelf.depth || 400

    if (product.height > shelfHeightMm) {
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
    
    // Вычисляем Y координату товара (внизу полки)
    const productY = shelf.y + shelf.height - productHeightPx - 5 // 5px отступ от дна полки
    
    // Находим все товары на этой полке (в пределах одной линии по Y)
    const POSITION_TOLERANCE = 20 // пикселей
    const productsOnShelf = items.filter(item => 
      item.type === 'product' && 
      Math.abs(item.y - productY) <= POSITION_TOLERANCE &&
      item.x >= shelf.x - 10 && // небольшая толерантность слева 
      item.x <= shelf.x + shelf.width + 10 // и справа от полки
    )

    console.log('🔍 DEBUG addProduct:')
    console.log('Полка:', { x: shelf.x, y: shelf.y, width: shelf.width, height: shelf.height })
    console.log('Товары на полке:', productsOnShelf.map(p => ({ 
      name: p.product?.name, 
      x: p.x, 
      y: p.y, 
      width: p.width, 
      height: p.height 
    })))
    console.log('Новый товар Y:', productY)

    // Создаем отсортированный массив занятых участков на полке
    const occupiedSpaces = productsOnShelf
      .map(item => ({
        start: item.x,
        end: item.x + item.width,
        product: item.product?.name || 'Товар'
      }))
      .sort((a, b) => a.start - b.start)

    console.log('Занятые участки:', occupiedSpaces)

    // Ищем свободное место для товара
    const GAP = 5 // зазор между товарами в пикселях
    let nextX = shelf.x + 5 // начальный отступ от левого края полки

    // Проходим по всем занятым участкам и ищем место
    for (const space of occupiedSpaces) {
      if (nextX + productWidthPx + GAP <= space.start) {
        // Товар помещается перед этим участком
        console.log(`✅ Место найдено перед товаром ${space.product}, позиция X: ${nextX}`)
        break
      }
      // Сдвигаем позицию за текущий участок
      nextX = space.end + GAP
      console.log(`➡️ Сдвигаем позицию за товар ${space.product}, новая позиция X: ${nextX}`)
    }

    // Проверяем, помещается ли товар в оставшееся место на полке
    const shelfRightEdge = shelf.x + shelf.width
    if (nextX + productWidthPx > shelfRightEdge) {
      const availableWidthMm = Math.round((shelfRightEdge - nextX) / settings.pixelsPerMm)
      toast.error(`Недостаточно места на полке (нужно ${product.width}мм, доступно ${availableWidthMm}мм)`)
      return
    }

    console.log('🎯 Финальная позиция товара X:', nextX, 'Y:', productY)

    // Создаем новый товар
    const newProduct: ShelfItem = {
      id: `product-${Date.now()}`,
      x: snapToGrid(nextX),
      y: snapToGrid(productY),
      width: productWidthPx,
      height: productHeightPx,
      depth: product.depth,
      product,
      type: 'product'
    }

    setItems(prev => [...prev, newProduct])
    
    // Показываем информацию о размещении
    const remainingWidthMm = Math.round((shelfRightEdge - nextX - productWidthPx) / settings.pixelsPerMm)
    toast.success(`Товар "${product.name}" добавлен. Свободно: ${remainingWidthMm}мм`)
  }, [selectedId, items, snapToGrid, mmToPixels, settings.pixelsPerMm])

  // Функция для перемещения товаров к нижней границе полки
  const repositionProductsOnShelf = useCallback((shelfId: string) => {
    const shelf = items.find(item => item.id === shelfId)
    if (!shelf) return

    setItems(prev => prev.map(item => {
      // Проверяем, что это товар на данной полке
      if (item.type === 'product' && 
          item.x >= shelf.x && 
          item.x < shelf.x + shelf.width &&
          item.y >= shelf.y && 
          item.y < shelf.y + shelf.height + 100) { // 100px толерантность
        
        // Перемещаем товар к нижней границе полки
        const newY = shelf.y + shelf.height - item.height - 5 // 5px отступ от дна
        return {
          ...item,
          y: snapToGrid(newY)
        }
      }
      return item
    }))
  }, [items, snapToGrid])

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
    setRacks(prev => prev.filter(rack => rack.id !== id))
    setSelectedId(null)
    toast.success('Элемент удален')
  }, [])

  const exportToPNG = useCallback(() => {
    if (stageRef.current) {
      const dataURL = stageRef.current.toDataURL({ mimeType: 'image/png', quality: 1 })
      const link = document.createElement('a')
      link.download = `planogram-${Date.now()}.png`
      link.href = dataURL
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Планограмма экспортирована')
    }
  }, [])

  const savePlanogram = useCallback(async () => {
    const planogramName = prompt('Введите название планограммы:', `Планограмма ${new Date().toLocaleDateString()}`)
    if (!planogramName) return

    try {
      const planogramData = {
        name: planogramName,
        category: 'Основная',
        items: items,
        racks: racks,
        settings: settings
      }

      await apiService.createPlanogram(planogramData)
      toast.success('Планограмма сохранена успешно!')
    } catch (error) {
      console.error('Ошибка сохранения планограммы:', error)
      toast.error('Ошибка сохранения планограммы')
    }
  }, [items, racks, settings])

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
  const selectedItem = selectedId ? (items.find(item => item.id === selectedId) || racks.find(rack => rack.id === selectedId)) : null
  const isRack = selectedItem && 'levels' in selectedItem
  const isShelf = selectedItem && !isRack && selectedItem.type === 'shelf'

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Редактор планограмм</h1>
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2 mb-3">
            <p className="text-xs text-green-700">
              📐 Фото товаров теперь растягиваются по размерам товара для точной планограммы
            </p>
          </div>
          <div className="flex gap-2 mt-3">
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
            <button
              onClick={savePlanogram}
              className="btn btn-success flex items-center gap-1 text-sm py-1 px-2"
              title="Сохранить планограмму"
            >
              <CloudArrowUpIcon className="w-4 h-4" />
              Сохранить
            </button>
            <button
              onClick={exportToPNG}
              className="btn btn-secondary flex items-center gap-1 text-sm py-1 px-2"
              title="Экспорт в PNG"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              PNG
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
          <div className="space-y-2 overflow-y-auto flex-1">
            {productsLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                <span className="ml-2 text-sm text-gray-600">Загрузка...</span>
              </div>
            ) : (
              products.map((product) => (
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
                      src={product.imageUrl.startsWith('/') ? `http://localhost:4000${product.imageUrl}` : product.imageUrl}
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

              {/* 3D Racks */}
              {settings.show3D && racks.map((rack) => (
                <RackSystem3D
                  key={rack.id}
                  rack={rack}
                  settings={settings}
                  x={50}
                  y={50}
                  isSelected={selectedId === rack.id}
                  onClick={() => setSelectedId(rack.id)}
                />
              ))}

              {/* Items */}
              {items.map((item) => {
                if (item.type === 'shelf') {
                  return (
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
                    />
                  )
                } else {
                  return (
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
                  )
                }
              })}
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
                            setRacks(prev => prev.map(rack => 
                              rack.id === selectedId 
                                ? { ...rack, levels: newLevels }
                                : rack
                            ))
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
                            setRacks(prev => prev.map(rack => 
                              rack.id === selectedId 
                                ? { ...rack, width: newWidth }
                                : rack
                            ))
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
                            setRacks(prev => prev.map(rack => 
                              rack.id === selectedId 
                                ? { ...rack, height: newHeight }
                                : rack
                            ))
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
                            setRacks(prev => prev.map(rack => 
                              rack.id === selectedId 
                                ? { ...rack, depth: newDepth }
                                : rack
                            ))
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
                              // Автоматически перемещаем товары к нижней границе полки
                              setTimeout(() => repositionProductsOnShelf(selectedId!), 0)
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