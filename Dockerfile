# Используем Node.js 18 на более легком образе для быстрой сборки
FROM node:18-alpine

# CACHE BUST - Принудительная пересборка 2025-06-24 19:40 Fixed TS build path
ENV CACHE_BUST=20250624-1940

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

# Устанавливаем зависимости для всего workspace (включая backend и frontend)
RUN npm ci --timeout=60000

# Проверяем установку @types пакетов в корневом node_modules
RUN echo "Checking @types packages in workspace..." && ls -la node_modules/@types/ | head -10

# Проверяем, что все критические модули доступны
RUN node -e "console.log('Testing module imports...'); require('express'); require('cors'); require('helmet'); require('compression'); require('dotenv'); require('multer'); console.log('All modules found successfully!');"

# Копируем исходный код
COPY . .

# Диагностика перед сборкой TypeScript
RUN echo "Workspace node_modules/@types contents:" && ls -la node_modules/@types/ | head -10
RUN echo "Backend directory contents:" && ls -la backend/
RUN echo "TypeScript version:" && npx tsc --version

# Собираем backend из корневой директории где доступны все node_modules
RUN npx tsc --project backend/tsconfig.json

# Собираем frontend
RUN cd frontend && npm run build

# Проверяем, что frontend собрался
RUN echo "Frontend build contents:" && ls -la frontend/dist/

# Создаем директорию для загрузок
RUN mkdir -p /app/backend/uploads

# Открываем порт для Railway
EXPOSE $PORT

# Устанавливаем переменную окружения для продакшена
ENV NODE_ENV=production

# Запускаем backend сервер
CMD ["npm", "run", "start:backend"] 