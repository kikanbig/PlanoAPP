# 📊 PlanoAPP v1.1.0

> Современное веб-приложение для создания планограмм с поддержкой производственного деплоя

![PlanoAPP](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.3.3-blue.svg)

## 📋 Описание

PlanoAPP - это современное веб-приложение для создания и управления планограммами для категорийных менеджеров магазинов. Приложение позволяет создавать визуально точные планограммы с размещением товаров на полках и стеллажах.

## ✨ Основные функции

### 🛍️ Управление товарами
- **Каталог товаров** с возможностью добавления, редактирования и удаления
- **Загрузка фотографий** товаров через drag & drop интерфейс
- **Размеры товаров** в миллиметрах (ширина × высота × глубина)
- **Категоризация** товаров для удобной фильтрации
- **Штрихкоды** и дополнительная информация о товарах

### 📐 Точная планограмма
- **Масштабируемая сетка** (10мм - 200мм) для точного позиционирования
- **Фото товаров растягиваются** под реальные размеры для максимальной точности
- **Умное размещение** товаров без наложений
- **Автоматическое позиционирование** при изменении размеров полок
- **Проверка физических ограничений** (высота, глубина, нагрузка)

### 🏗️ 3D стеллажи и полки
- **Разные типы стеллажей**: гондола, пристенный, торцевой, островной
- **Настраиваемое количество уровней** (1-8 полок)
- **Типы полок**: стандартная, крючки, корзины, разделители
- **3D визуализация** с реалистичными эффектами
- **Изменение размеров** в реальном времени

### 💾 Сохранение и экспорт
- **Сохранение планограмм** в базе данных
- **Загрузка сохраненных планограмм** по URL
- **Экспорт в PNG** высокого качества
- **Управление версиями** планограмм

## 🚀 Технологии

### Frontend
- **React 18** с TypeScript
- **Tailwind CSS** для стилизации
- **Konva.js** для 2D/3D canvas графики
- **Vite** для быстрой разработки
- **React Hot Toast** для уведомлений

### Backend
- **Node.js** с Express
- **TypeScript** для типизации
- **Multer** для загрузки файлов
- **Helmet** для безопасности
- **CORS** для кросс-доменных запросов

## 🚀 Быстрый старт

### Локальная разработка

```bash
# Клонируем репозиторий
git clone https://github.com/kikanbig/PlanoAPP.git
cd PlanoAPP

# Устанавливаем зависимости
npm run install:all

# Запускаем приложение
npm run dev
```

Приложение будет доступно по адресу:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/health

### Production деплой на Railway

📚 **Подробные инструкции**: [DEPLOYMENT.md](./DEPLOYMENT.md)

1. Создайте проект на [Railway.app](https://railway.app) из GitHub
2. Добавьте PostgreSQL базу данных
3. **Настройте Cloudinary для изображений** (см. ниже)
4. Установите переменные окружения: `NODE_ENV=production`
5. Дождитесь автоматического деплоя

#### 💾 Настройка Railway Volume (обязательно!)

Для постоянного хранения изображений между деплоями:

1. **Автоматическая настройка**: Railway автоматически создаст Volume при деплое
2. **Включено в план**: 
   - **Hobby**: 5GB бесплатно
   - **Pro**: 50GB бесплатно  
   - **Дополнительно**: $0.15/GB/месяц
3. **Никаких дополнительных настроек не требуется!** ✅

## 🏗️ Архитектура

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Konva.js
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Deployment**: Docker + Railway

### Структура проекта
```
PlanoAPP/
├── frontend/              # React приложение
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── pages/         # Страницы приложения
│   │   ├── types/         # TypeScript типы
│   │   └── utils/         # Утилиты
│   └── dist/              # Собранный frontend
├── backend/               # Express API сервер
│   ├── src/
│   │   ├── database.ts    # Адаптер базы данных
│   │   └── index.ts       # Основной сервер
│   ├── uploads/           # Загруженные изображения
│   └── dist/              # Скомпилированный backend
├── Dockerfile             # Production контейнер
└── DEPLOYMENT.md          # Инструкции по деплою
```

## 🎯 Основные функции

### Редактор планограмм
- Создание стеллажей с произвольными размерами
- Настройка количества полок и их высоты
- Drag & Drop размещение товаров
- Автоматическое размещение по алгоритму
- Масштабирование и навигация

### Управление товарами
- Добавление товаров с фотографиями
- Настройка размеров (ширина, высота, глубина)
- Категоризация и штрих-коды
- Настройка отступов между товарами

### Сохранение и экспорт
- Сохранение планограмм в базе данных
- Загрузка и редактирование существующих
- Экспорт в различные форматы (в разработке)

## 🔧 Разработка

### Команды для разработки
```bash
# Запуск в режиме разработки
npm run dev

# Сборка для production
npm run build

# Запуск только frontend
npm run dev:frontend

# Запуск только backend  
npm run dev:backend

# Установка всех зависимостей
npm run install:all
```

### База данных
- **Development**: SQLite в памяти (данные не сохраняются)
- **Production**: PostgreSQL с persistent хранением

### API Endpoints
- `GET /api/health` - Health check
- `GET /api/products` - Список товаров
- `POST /api/products` - Создание товара
- `PUT /api/products/:id` - Обновление товара
- `DELETE /api/products/:id` - Удаление товара
- `GET /api/planograms` - Список планограмм
- `POST /api/planograms` - Создание планограммы
- `PUT /api/planograms/:id` - Обновление планограммы
- `DELETE /api/planograms/:id` - Удаление планограммы
- `POST /api/upload` - Загрузка изображений

## 🎨 UI/UX

### Дизайн система
- **Цветовая схема**: Modern blue palette
- **Типографика**: Inter font family
- **Компоненты**: Tailwind CSS + Headless UI
- **Иконки**: Heroicons + Lucide React

### Адаптивность
- 📱 **Mobile**: 320px+
- 📱 **Tablet**: 768px+
- 💻 **Desktop**: 1024px+
- 🖥️ **Large**: 1440px+

## 📈 История версий

### v1.1.0 (Текущая)
- ✅ Поддержка PostgreSQL для production
- ✅ Dockerfile и Railway конфигурация
- ✅ Исправлено сохранение отступов товаров
- ✅ Исправлено масштабирование позиций
- ✅ Исправлена высота полок при создании стеллажей
- ✅ Graceful shutdown с закрытием DB соединений

### v1.0.0
- ✅ Базовый редактор планограмм
- ✅ Управление товарами
- ✅ Автоматическое размещение
- ✅ Масштабирование и навигация

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch: `git checkout -b feature/amazing-feature`
3. Commit изменения: `git commit -m 'Add amazing feature'`
4. Push в branch: `git push origin feature/amazing-feature`
5. Создайте Pull Request

## 📝 Лицензия

MIT License - смотрите [LICENSE](LICENSE) файл

## 🆘 Поддержка

- 📖 **Документация**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/kikanbig/PlanoAPP/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/kikanbig/PlanoAPP/discussions)

---

<div align="center">

**Сделано с ❤️ для ритейла**

[🌟 Star репозиторий](https://github.com/kikanbig/PlanoAPP) • [🚀 Попробовать live demo](https://planoapp.railway.app) • [📚 Документация](./DEPLOYMENT.md)

</div> 