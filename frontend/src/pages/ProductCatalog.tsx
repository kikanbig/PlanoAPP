import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, DocumentArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Product } from '../types'
import ImageUpload from '../components/ImageUpload'
import ExcelImport from '../components/ExcelImport'
import { apiService } from '../services/api'



export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)

  // Загружаем товары при инициализации
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      console.log('Загружаем товары...')
      const productsData = await apiService.getProducts()
      console.log('Получены товары:', productsData)
      setProducts(productsData)
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error)
      toast.error('Ошибка загрузки товаров')
    } finally {
      setLoading(false)
    }
  }

  const categories = Array.from(new Set(products.map(p => p.category)))

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode?.includes(searchTerm)
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleAddProduct = () => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      await apiService.deleteProduct(productId)
      setProducts(prev => prev.filter(p => p.id !== productId))
      toast.success('Товар удален')
    } catch (error) {
      console.error('Ошибка удаления товара:', error)
      toast.error('Ошибка удаления товара')
    }
  }

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      if (editingProduct) {
        const updatedProduct = await apiService.updateProduct(editingProduct.id, productData)
        setProducts(prev => prev.map(p => 
          p.id === editingProduct.id ? updatedProduct : p
        ))
        toast.success('Товар обновлен')
      } else {
        const newProduct = await apiService.createProduct(productData)
        setProducts(prev => [...prev, newProduct])
        toast.success('Товар добавлен')
      }
      setIsModalOpen(false)
    } catch (error) {
      console.error('Ошибка сохранения товара:', error)
      toast.error('Ошибка сохранения товара')
    }
  }

  const handleImportComplete = () => {
    loadProducts() // Перезагружаем товары после импорта
    setShowImportModal(false)
  }

  const handleDeleteAllProducts = async () => {
    try {
      // Удаляем все товары
      for (const product of products) {
        await apiService.deleteProduct(product.id)
      }
      setProducts([])
      toast.success(`Удалено ${products.length} товаров`)
      setShowDeleteAllModal(false)
    } catch (error) {
      console.error('Ошибка массового удаления:', error)
      toast.error('Ошибка при удалении товаров')
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Каталог товаров
            </h1>
            <p className="text-gray-600 mt-2">
              Управление товарами для планограмм · {filteredProducts.length} из {products.length} товаров
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Новое!</strong> Фото товаров теперь растягиваются под размеры товара в планограмме для максимальной точности отображения.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-secondary flex items-center"
            >
              <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
              Импорт из Excel
            </button>
            {products.length > 0 && (
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50 flex items-center"
              >
                <TrashIcon className="w-5 h-5 mr-2" />
                Удалить все ({products.length})
              </button>
            )}
            <button
              onClick={handleAddProduct}
              className="btn btn-primary flex items-center"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Добавить товар
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Поиск по названию или штрихкоду..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input w-full"
              >
                <option value="all">Все категории</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-2 text-gray-600">Загрузка товаров...</span>
          </div>
        ) : (
          <div className="card">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 font-medium text-sm text-gray-700">
              <div className="col-span-1">Фото</div>
              <div className="col-span-3">Название</div>
              <div className="col-span-2">Категория</div>
              <div className="col-span-2">Размеры (мм)</div>
              <div className="col-span-1">Отступ</div>
              <div className="col-span-2">Штрихкод</div>
              <div className="col-span-1">Действия</div>
            </div>
            
            {/* Products List - с ограничением высоты и скроллом */}
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div key={product.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors">
                  {/* Image */}
                  <div className="col-span-1">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg border border-gray-300 object-cover"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-lg border border-gray-300 flex items-center justify-center"
                        style={{ backgroundColor: product.color }}
                      >
                        <span className="text-xs font-medium text-white">
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Name */}
                  <div className="col-span-3 flex items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500">ID: {product.id}</p>
                    </div>
                  </div>
                  
                  {/* Category */}
                  <div className="col-span-2 flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </div>
                  
                  {/* Dimensions */}
                  <div className="col-span-2 flex items-center">
                    <div className="text-sm">
                      <div className="font-mono text-gray-900">
                        {product.width} × {product.height} × {product.depth}
                      </div>
                      <div className="text-gray-500">
                        Ш × В × Г
                      </div>
                    </div>
                  </div>
                  
                  {/* Spacing */}
                  <div className="col-span-1 flex items-center">
                    <span className="text-sm text-gray-900 font-mono">
                      {product.spacing || 50}мм
                    </span>
                  </div>
                  
                  {/* Barcode */}
                  <div className="col-span-2 flex items-center">
                    {product.barcode ? (
                      <span className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {product.barcode}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="col-span-1 flex items-center space-x-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-md hover:bg-primary-50"
                      title="Редактировать товар"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                      title="Удалить товар"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Товары не найдены</p>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <ProductModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <ExcelImport
          onImportComplete={handleImportComplete}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Удалить все товары?
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Вы собираетесь удалить все <strong>{products.length}</strong> товаров из каталога. 
              Это действие нельзя отменить.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="btn btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteAllProducts}
                className="btn btn-primary bg-red-600 hover:bg-red-700 border-red-600"
              >
                Удалить все
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ProductModalProps {
  product: Product | null
  onSave: (product: Omit<Product, 'id'>) => void
  onClose: () => void
}

function ProductModal({ product, onSave, onClose }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    width: product?.width || 0,
    height: product?.height || 0,
    depth: product?.depth || 0,
    color: product?.color || '#E5E7EB',
    category: product?.category || '',
    barcode: product?.barcode || '',
    imageUrl: product?.imageUrl || null,
                    spacing: product?.spacing || 50
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category) {
      toast.error('Заполните обязательные поля')
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {product ? 'Редактировать товар' : 'Добавить товар'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUpload
            imageUrl={formData.imageUrl}
            onImageUploaded={(imageUrl) => setFormData(prev => ({ ...prev, imageUrl }))}
            onImageRemoved={() => setFormData(prev => ({ ...prev, imageUrl: null }))}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input w-full"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Категория *
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="input w-full"
              required
            />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ширина (мм)
              </label>
              <input
                type="number"
                value={formData.width}
                onChange={(e) => setFormData(prev => ({ ...prev, width: Number(e.target.value) }))}
                onFocus={(e) => e.target.select()}
                className="input w-full"
                min="1"
                placeholder="Введите ширину"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Высота (мм)
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData(prev => ({ ...prev, height: Number(e.target.value) }))}
                onFocus={(e) => e.target.select()}
                className="input w-full"
                min="1"
                placeholder="Введите высоту"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Глубина (мм)
              </label>
              <input
                type="number"
                value={formData.depth}
                onChange={(e) => setFormData(prev => ({ ...prev, depth: Number(e.target.value) }))}
                onFocus={(e) => e.target.select()}
                className="input w-full"
                min="1"
                placeholder="Введите глубину"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Цвет
            </label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Штрихкод
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Расстояние между товарами (мм)
            </label>
            <input
              type="number"
              value={formData.spacing}
              onChange={(e) => setFormData(prev => ({ ...prev, spacing: Number(e.target.value) }))}
              onFocus={(e) => e.target.select()}
              className="input w-full"
              min="0"
              max="50"
              placeholder="Введите расстояние (по умолчанию 2мм)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Минимальное расстояние между этим товаром и соседними (по умолчанию 2мм)
            </p>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="btn btn-primary flex-1"
            >
              {product ? 'Обновить' : 'Добавить'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 