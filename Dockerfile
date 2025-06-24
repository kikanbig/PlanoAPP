# Используем Node.js 18 на Ubuntu для лучшей совместимости с Rollup
FROM node:18-bullseye-slim

# CACHE BUST - Принудительная пересборка 2025-06-24 17:10 Ubuntu fix
ENV CACHE_BUST=20250624-1710

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копируем package.json файлы для всех частей проекта
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY frontend/.npmrc ./frontend/

# Очищаем npm кеш полностью
RUN npm cache clean --force
RUN rm -rf ~/.npm

# Устанавливаем зависимости для корневого уровня
RUN npm ci --no-optional

# Полная переустановка зависимостей backend
RUN cd backend && rm -rf node_modules package-lock.json
RUN cd backend && npm cache clean --force
RUN cd backend && npm install --no-optional --production=false

# Устанавливаем зависимости frontend
RUN cd frontend && rm -rf node_modules package-lock.json
RUN cd frontend && npm cache clean --force
RUN cd frontend && npm install --no-optional

# Копируем исходный код
COPY . .

# Компилируем backend
RUN cd backend && npm run build

# Компилируем frontend
RUN cd frontend && npm run build

# Копируем статические файлы frontend в backend/dist/public
RUN mkdir -p backend/dist/public && cp -r frontend/dist/* backend/dist/public/

# Открываем порт
EXPOSE 4000

# Запускаем приложение
CMD ["npm", "run", "start:backend"] 