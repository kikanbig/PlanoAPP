# Используем Node.js 18 на более легком образе для быстрой сборки
FROM node:18-alpine

# CACHE BUST - Принудительная пересборка 2025-06-24 19:00 Fixed TypeScript deps
ENV CACHE_BUST=20250624-1900

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем только необходимые системные зависимости
RUN apk add --no-cache python3 make g++

# Копируем package.json файлы для всех частей проекта
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Полностью очищаем npm кэш и удаляем node_modules
RUN npm cache clean --force && rm -rf node_modules

# Устанавливаем зависимости для корневого уровня
RUN npm ci --timeout=60000

# Полностью переустанавливаем зависимости backend
RUN cd backend && rm -rf node_modules package-lock.json && npm cache clean --force
RUN cd backend && npm install --timeout=60000

# Проверяем, что все критические модули backend установлены
RUN cd backend && node -e "console.log('Testing module imports...'); require('express'); require('cors'); require('helmet'); require('compression'); require('dotenv'); require('multer'); console.log('All modules found successfully!');"

# Устанавливаем зависимости frontend
RUN cd frontend && rm -rf node_modules && npm cache clean --force && npm ci --timeout=60000

# Копируем исходный код
COPY . .

# Собираем backend с подробным выводом ошибок
RUN cd backend && npm run build

# Собираем frontend
RUN cd frontend && npm run build

# Создаем директорию для загрузок
RUN mkdir -p /app/backend/uploads

# Открываем порт для Railway
EXPOSE $PORT

# Устанавливаем переменную окружения для продакшена
ENV NODE_ENV=production

# Запускаем backend сервер
CMD ["npm", "run", "start:backend"] 