import { useState, useRef } from 'react'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { apiService } from '../services/api'

interface ImageUploadProps {
  imageUrl?: string | null
  onImageUploaded: (imageUrl: string) => void
  onImageRemoved?: () => void
}

export default function ImageUpload({ imageUrl, onImageUploaded, onImageRemoved }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимальный размер: 5МБ')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение')
      return
    }

    setUploading(true)

    try {
      const data = await apiService.uploadImage(file)
      onImageUploaded(data.imageUrl)
      toast.success('Изображение загружено')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Ошибка загрузки изображения')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    if (onImageRemoved) {
      onImageRemoved()
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Изображение товара
      </label>
      
      {imageUrl ? (
        <div className="relative inline-block">
          <img
            src={imageUrl.startsWith('/') ? `${window.location.origin}${imageUrl}` : imageUrl}
            alt="Product"
            className="w-24 h-24 object-cover rounded-lg border border-gray-300"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          onClick={openFileDialog}
          className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors"
        >
          {uploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
          ) : (
            <PhotoIcon className="w-8 h-8 text-gray-400" />
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="text-xs text-gray-500">
        Нажмите для загрузки (макс. 5МБ)
      </div>
    </div>
  )
} 