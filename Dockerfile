# Используем Node.js 18 Alpine для легковесности
FROM node:18-alpine

# CACHE BUST - Принудительная пересборка 2025-06-24 12:31
ENV CACHE_BUST=20250624-1231

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем основные инструменты
RUN apk add --no-cache python3 make g++

# Копируем package.json файлы для всех частей проекта
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Устанавливаем зависимости для корневого уровня
RUN npm ci --only=production

# Устанавливаем ВСЕ зависимости для backend (включая devDependencies)
RUN cd backend && npm ci --include=dev

# Устанавливаем зависимости для frontend  
RUN cd frontend && npm ci --include=dev

# Копируем исходный код
COPY . .

# Компилируем backend
RUN cd backend && npm run build

# Компилируем frontend
RUN cd frontend && npm run build

# Теперь очищаем devDependencies для уменьшения размера
RUN cd backend && npm ci --omit=dev
RUN cd frontend && npm ci --omit=dev

# Копируем статические файлы frontend в backend/dist
RUN cp -r frontend/dist/* backend/dist/ || true

# Экспонируем порт
EXPOSE 4000

# Устанавливаем переменную окружения
ENV NODE_ENV=production

# Запускаем приложение
CMD ["npm", "run", "start:prod"] 