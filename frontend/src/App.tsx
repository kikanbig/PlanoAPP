import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthTokenService } from './services/api'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import PlanogramEditor from './pages/PlanogramEditor'
import ProductCatalog from './pages/ProductCatalog'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Компонент для защищенных маршрутов
interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = AuthTokenService.isAuthenticated()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

// Компонент для публичных маршрутов (для неавторизованных пользователей)
const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = AuthTokenService.isAuthenticated()
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Публичные маршруты (только для неавторизованных) */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } 
          />
          
          {/* Защищенные маршруты (только для авторизованных) */}
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/editor" element={<PlanogramEditor />} />
                    <Route path="/editor/:id" element={<PlanogramEditor />} />
                    <Route path="/products" element={<ProductCatalog />} />
                    {/* Перенаправление всех остальных маршрутов на главную */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } 
          />
        </Routes>
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App 