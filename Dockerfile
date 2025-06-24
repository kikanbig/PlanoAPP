# Используем Node.js 18 Alpine для легковесности
FROM node:18-alpine

# CACHE BUST - Принудительная пересборка 2025-06-24 15:30
ENV CACHE_BUST=20250624-1530

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем основные инструменты
RUN apk add --no-cache python3 make g++

# Копируем package.json файлы для всех частей проекта
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Устанавливаем зависимости для корневого уровня
RUN npm ci

# Устанавливаем ВСЕ зависимости для backend включая типы
RUN cd backend && npm ci

# Принудительно переустанавливаем типы для backend
RUN cd backend && npm install --save @types/express @types/cors @types/helmet @types/compression @types/multer @types/node

# Устанавливаем зависимости для frontend  
RUN cd frontend && npm ci

# Копируем исходный код
COPY . .

# Компилируем backend
RUN cd backend && npm run build

# Компилируем frontend
RUN cd frontend && npm run build

# Копируем статические файлы frontend в backend
RUN cp -r frontend/dist/* backend/

# Открываем порт
EXPOSE 4000

# Запускаем приложение
CMD ["npm", "run", "start"] 