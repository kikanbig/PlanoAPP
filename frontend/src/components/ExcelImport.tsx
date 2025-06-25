import { useState, useRef } from 'react'
import { DocumentArrowUpIcon, XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

interface ImportResult {
  success: boolean
  message: string
  statistics: {
    totalRows: number
    processedProducts: number
    processedImages: number
    errors: number
  }
  products: any[]
  errors?: string[]
}

interface ExcelImportProps {
  onImportComplete: () => void
  onClose: () => void
}

export default function ExcelImport({ onImportComplete, onClose }: ExcelImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().includes('.xlsx') && !selectedFile.name.toLowerCase().includes('.xls')) {
      toast.error('Пожалуйста, выберите Excel файл (.xlsx или .xls)')
      return
    }

    setFile(selectedFile)
    setImportResult(null)

    // Создаем превью первых 5 строк
    try {
      const buffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        range: 5 // Только первые 5 строк для превью
      }) as any[][]
      
      setPreview(jsonData)
    } catch (error) {
      console.error('Ошибка чтения файла для превью:', error)
      toast.error('Ошибка чтения файла')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Выберите файл для импорта')
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('excelFile', file)

      const response = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData,
      })

      const result: ImportResult = await response.json()

      if (response.ok && result.success) {
        setImportResult(result)
        toast.success(`Импорт завершен! Добавлено ${result.statistics.processedProducts} товаров`)
        onImportComplete()
      } else {
        throw new Error(result.message || 'Ошибка импорта')
      }
    } catch (error) {
      console.error('Ошибка импорта:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка импорта файла')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            Импорт товаров из Excel
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Import Result */}
          {importResult && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center mb-3">
                <CheckCircleIcon className="w-6 h-6 text-green-600 mr-2" />
                <h4 className="font-semibold text-green-900">Импорт завершен успешно!</h4>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.statistics.totalRows}
                  </div>
                  <div className="text-sm text-gray-600">Строк обработано</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {importResult.statistics.processedProducts}
                  </div>
                  <div className="text-sm text-gray-600">Товаров добавлено</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {importResult.statistics.processedImages}
                  </div>
                  <div className="text-sm text-gray-600">Изображений</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.statistics.errors}
                  </div>
                  <div className="text-sm text-gray-600">Ошибок</div>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-red-900 mb-2 flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 mr-1" />
                    Ошибки при обработке:
                  </h5>
                  <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Структура Excel файла:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Столбец A:</strong> Категория товара</p>
              <p>• <strong>Столбец B:</strong> Название товара</p>
              <p>• <strong>Столбец E:</strong> Изображение товара (встроенное)</p>
              <p>• <strong>Столбец J:</strong> Ширина (мм)</p>
              <p>• <strong>Столбец K:</strong> Глубина (мм)</p>
              <p>• <strong>Столбец L:</strong> Высота (мм)</p>
              <p className="font-medium">Первая строка должна содержать заголовки!</p>
            </div>
          </div>

          {/* File Upload Area */}
          {!file && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Перетащите Excel файл сюда
              </p>
              <p className="text-gray-600 mb-4">
                или нажмите чтобы выбрать файл
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* File Info and Preview */}
          {file && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <DocumentArrowUpIcon className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null)
                    setPreview([])
                    setImportResult(null)
                  }}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">Превью данных (первые 5 строк):</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="divide-y divide-gray-200">
                        {preview.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex === 0 ? 'bg-blue-50' : 'bg-white'}>
                            {row.slice(0, 12).map((cell: any, cellIndex: number) => (
                              <td key={cellIndex} className="px-3 py-2 text-sm border-r border-gray-200 last:border-r-0">
                                <div className="max-w-24 truncate" title={cell?.toString()}>
                                  {cellIndex === 4 && cell?.toString().startsWith('data:image') ? (
                                    <span className="text-green-600 font-medium">🖼️ Изображение</span>
                                  ) : (
                                    cell?.toString() || '—'
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Button */}
              {!importResult && (
                <div className="flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={isUploading}
                    className="btn btn-primary flex items-center"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Импортируем...
                      </>
                    ) : (
                      <>
                        <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
                        Импортировать товары
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            {importResult ? 'Закрыть' : 'Отмена'}
          </button>
        </div>
      </div>
    </div>
  )
} 