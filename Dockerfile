# Используем Node.js 18 Alpine для легковесности
FROM node:18-alpine

# CACHE BUST - Принудительная пересборка 2025-06-24 16:50 complete reinstall
ENV CACHE_BUST=20250624-1650

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем основные инструменты
RUN apk add --no-cache python3 make g++ bash

# Копируем package.json файлы для всех частей проекта
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Очищаем npm кеш
RUN npm cache clean --force

# Устанавливаем зависимости для корневого уровня
RUN npm ci --no-optional

# Полная переустановка зависимостей backend
RUN cd backend && rm -rf node_modules package-lock.json
RUN cd backend && npm cache clean --force
RUN cd backend && npm install --no-optional --production=false

# Копируем исходный код
COPY . .

# Компилируем backend
RUN cd backend && npm run build

# Компилируем frontend
RUN cd frontend && npm ci --no-optional
RUN cd frontend && npm run build

# Копируем статические файлы frontend в backend/dist/public
RUN mkdir -p backend/dist/public && cp -r frontend/dist/* backend/dist/public/

# Открываем порт
EXPOSE 4000

# Запускаем приложение
CMD ["npm", "run", "start:backend"] 