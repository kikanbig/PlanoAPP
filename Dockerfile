# Используем Node.js 18 на более легком образе для быстрой сборки
FROM node:18-alpine

# CACHE BUST - Принудительная пересборка 2025-06-24 18:30 Fixed deps installation
ENV CACHE_BUST=20250624-1830

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем только необходимые системные зависимости
RUN apk add --no-cache python3 make g++

# Копируем package.json файлы для всех частей проекта
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Очищаем npm кэш для обеспечения чистой установки
RUN npm cache clean --force

# Устанавливаем зависимости для корневого уровня
RUN npm ci --timeout=60000

# Устанавливаем зависимости backend с принудительной установкой всех пакетов
RUN cd backend && npm cache clean --force && npm ci --timeout=60000

# Устанавливаем зависимости frontend
RUN cd frontend && npm cache clean --force && npm ci --timeout=60000

# Копируем исходный код
COPY . .

# Проверяем что все зависимости backend установлены
RUN cd backend && npm ls express @types/express helmet compression cors dotenv multer typescript || true

# Собираем backend
RUN cd backend && npm run build

# Собираем frontend
RUN cd frontend && npm run build

# Очищаем devDependencies после сборки для уменьшения размера образа
RUN cd frontend && npm prune --production

# Создаем директорию для загрузок
RUN mkdir -p /app/backend/uploads

# Открываем порт для Railway
EXPOSE $PORT

# Устанавливаем переменную окружения для продакшена
ENV NODE_ENV=production

# Запускаем backend сервер
CMD ["npm", "run", "start:backend"] 