import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  HomeIcon, 
  RectangleStackIcon, 
  CubeIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { AuthTokenService, logout } from '../services/api'
import { User } from '../types'
import toast from 'react-hot-toast'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Главная', href: '/', icon: HomeIcon },
  { name: 'Редактор планограмм', href: '/editor', icon: RectangleStackIcon },
  { name: 'Каталог товаров', href: '/products', icon: CubeIcon },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Получаем информацию о пользователе из localStorage
    const currentUser = AuthTokenService.getUser()
    setUser(currentUser)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Вы успешно вышли из системы')
      navigate('/login')
    } catch (error) {
      toast.error('Ошибка при выходе')
    }
  }

  // Функция для получения инициалов пользователя
  const getUserInitials = (name: string): string => {
    const names = name.split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Функция для перевода роли на русский
  const getRoleText = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Администратор'
      case 'manager':
        return 'Менеджер'
      default:
        return 'Пользователь'
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">
            PlanoAPP
          </h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-primary-50 text-primary-700 border-primary-200' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        
        {/* User info and logout */}
        <div className="p-4 border-t border-gray-200">
          {user && (
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium text-sm">
                    {getUserInitials(user.name)}
                  </span>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getRoleText(user.role)}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <main className="h-full">
          {children}
        </main>
      </div>
    </div>
  )
} 