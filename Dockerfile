# Используем Node.js 18 на более легком образе для быстрой сборки
FROM node:18-alpine

# CACHE BUST - Принудительная пересборка 2025-06-24 18:00 TypeScript dependencies fix
ENV CACHE_BUST=20250624-1800

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем только необходимые системные зависимости
RUN apk add --no-cache python3 make g++

# Копируем package.json файлы для всех частей проекта
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Устанавливаем зависимости для корневого уровня с ограничением времени
RUN npm ci --no-optional --timeout=60000

# Устанавливаем зависимости backend включая devDependencies для TypeScript сборки
RUN cd backend && npm ci --no-optional --timeout=60000

# Устанавливаем зависимости frontend включая devDependencies для сборки
RUN cd frontend && npm ci --timeout=60000

# Копируем исходный код
COPY . .

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