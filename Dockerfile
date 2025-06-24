# Используем Node.js 18 Alpine для легковесности
FROM node:18-alpine

# CACHE BUST - Принудительная пересборка 2025-06-24 12:45
ENV CACHE_BUST=20250624-1255

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

# Устанавливаем ВСЕ зависимости для backend 
RUN cd backend && npm ci

# Устанавливаем зависимости для frontend  
RUN cd frontend && npm ci

# Копируем исходный код
COPY . .

# Компилируем backend
RUN cd backend && npm run build

# Компилируем frontend
RUN cd frontend && npm run build

# Копируем статические файлы frontend в backend/dist
RUN cp -r frontend/dist/* backend/dist/

# Экспонируем порт
EXPOSE 4000

# Устанавливаем переменную окружения
ENV NODE_ENV=production

# Запускаем приложение
CMD ["node", "backend/dist/index.js"] 