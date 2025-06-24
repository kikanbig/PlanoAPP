# Используем Node.js 18 Alpine для легковесности
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и устанавливаем зависимости для корневого уровня
COPY package*.json ./
RUN npm ci --only=production

# Устанавливаем зависимости для backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Устанавливаем зависимости для frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Копируем исходный код
COPY . .

# Компилируем backend
RUN cd backend && npm run build

# Компилируем frontend
RUN cd frontend && npm run build

# Копируем статические файлы frontend в backend/dist
RUN cp -r frontend/dist/* backend/dist/ || true

# Экспонируем порт
EXPOSE 4000

# Устанавливаем переменную окружения
ENV NODE_ENV=production

# Запускаем приложение
CMD ["npm", "run", "start:prod"] 