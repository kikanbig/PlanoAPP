import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  RectangleStackIcon,
  CubeIcon,
  ChartBarIcon,
  CalendarIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import * as api from '../services/api'
import { Planogram } from '../types'
import { toast } from 'react-hot-toast'

const features = [
  {
    name: 'Создать планограмму',
    description: 'Начните создание новой планограммы с нуля',
    icon: PlusIcon,
    href: '/editor',
    color: 'bg-primary-500'
  },
  {
    name: 'Управление товарами',
    description: 'Добавьте товары в каталог с размерами и характеристиками',
    icon: CubeIcon,
    href: '/products',
    color: 'bg-green-500'
  },
  {
    name: 'Шаблоны планограмм',
    description: 'Используйте готовые шаблоны для быстрого старта',
    icon: RectangleStackIcon,
    href: '/templates',
    color: 'bg-purple-500'
  },
  {
    name: 'Аналитика',
    description: 'Анализируйте эффективность размещения товаров',
    icon: ChartBarIcon,
    href: '/analytics',
    color: 'bg-orange-500'
  }
]

export default function HomePage() {
  const [planograms, setPlanograms] = useState<Planogram[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlanograms()
  }, [])

  const loadPlanograms = async () => {
    try {
      setLoading(true)
      const data = await api.getPlanograms()
      setPlanograms(data)
    } catch (error) {
      console.error('Ошибка загрузки планограмм:', error)
      toast.error('Не удалось загрузить планограммы')
    } finally {
      setLoading(false)
    }
  }

  const deletePlanogram = async (id: string) => {
    if (!confirm('Удалить планограмму?')) return
    
    try {
      await api.deletePlanogram(id)
      setPlanograms(prev => prev.filter(p => p.id !== id))
      toast.success('Планограмма удалена')
    } catch (error) {
      console.error('Ошибка удаления:', error)
      toast.error('Не удалось удалить планограмму')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'сегодня'
    if (diffDays === 2) return 'вчера'
    if (diffDays <= 7) return `${diffDays} дней назад`
    return date.toLocaleDateString('ru-RU')
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Добро пожаловать в PlanoAPP
          </h1>
          <p className="text-lg text-gray-600">
            Современное решение для создания планограмм и управления выкладкой товаров
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Link
                key={feature.name}
                to={feature.href}
                className="card p-6 hover:shadow-md transition-shadow duration-200 group"
              >
                <div className={`inline-flex p-3 rounded-lg ${feature.color} mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600">
                  {feature.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </Link>
            )
          })}
        </div>

        {/* Recent Projects */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Последние планограммы
            </h2>
            <Link to="/editor" className="btn btn-primary">
              Создать новую
            </Link>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                <span className="ml-2 text-sm text-gray-600">Загрузка...</span>
              </div>
            ) : planograms.length === 0 ? (
              <div className="text-center py-8">
                <RectangleStackIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Нет сохраненных планограмм</h3>
                <p className="text-gray-500 mb-4">Создайте вашу первую планограмму</p>
                <Link to="/editor" className="btn btn-primary">
                  Создать планограмму
                </Link>
              </div>
            ) : (
              planograms.map((planogram) => (
                <div key={planogram.id} className="flex items-center p-4 border border-gray-200 rounded-lg">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    <RectangleStackIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{planogram.name}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      Создана {formatDate(planogram.createdAt)}
                      {planogram.category && (
                        <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                          {planogram.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/editor?planogram=${planogram.id}`} className="btn btn-outline text-sm">
                      Открыть
                    </Link>
                    <button
                      onClick={() => deletePlanogram(planogram.id)}
                      className="btn btn-outline text-sm text-red-600 hover:bg-red-50 border-red-200"
                      title="Удалить планограмму"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 