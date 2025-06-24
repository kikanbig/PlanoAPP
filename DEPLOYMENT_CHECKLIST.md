# ✅ Чеклист деплоя PlanoAPP v1.1.0 на Railway

## 🚀 Быстрый деплой (5 минут)

### 1. Railway Setup
- [ ] Войти на [railway.app](https://railway.app)
- [ ] New Project → Deploy from GitHub repo
- [ ] Выбрать репозиторий `kikanbig/PlanoAPP`

### 2. База данных
- [ ] В проекте нажать "New" → "Database" → "Add PostgreSQL"  
- [ ] Дождаться создания DB (автоматически создастся `DATABASE_URL`)

### 3. Переменные окружения
**Обязательные:**
- [ ] `NODE_ENV=production`
- [ ] `PORT=4000` (если Railway не установил автоматически)

**Опциональные:**
- [ ] `FRONTEND_URL=https://ваш-домен.railway.app`

### 4. Деплой
- [ ] Railway автоматически начнет деплой
- [ ] Следить за логами в dashboard
- [ ] Дождаться "Build successful" и "Deployed"

### 5. Проверка
- [ ] Открыть URL проекта
- [ ] Проверить `/api/health` endpoint
- [ ] Создать тестовый товар  
- [ ] Создать тестовую планограмму
- [ ] Убедиться что данные сохраняются

## 📋 Важные файлы для деплоя

✅ **Готовы к деплою:**
- `Dockerfile` - конфигурация контейнера
- `railway.json` - настройки Railway
- `backend/src/database.ts` - универсальная DB
- `DEPLOYMENT.md` - подробные инструкции
- `.dockerignore` - оптимизация образа

## 🔍 Health Check

После деплоя:
```bash
curl https://ваш-домен.railway.app/api/health
```

Ожидаемый ответ:
```json
{
  "status": "ok",
  "message": "PlanoAPP API is running", 
  "version": "1.1.0",
  "database": "PostgreSQL",
  "timestamp": "2025-06-24T..."
}
```

## 🐛 Troubleshooting

**Проблема**: Build failed
- Проверить логи сборки
- Убедиться что все файлы закоммичены

**Проблема**: Database connection error  
- Проверить что PostgreSQL создан
- Проверить переменную `DATABASE_URL`

**Проблема**: 404 на frontend
- Убедиться что `NODE_ENV=production`
- Проверить логи сервера

## 📞 Контакты

- **GitHub**: https://github.com/kikanbig/PlanoAPP
- **Документация**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Issues**: https://github.com/kikanbig/PlanoAPP/issues

---

**Время деплоя**: ~3-5 минут  
**Стоимость**: ~$10-15/месяц  
**Поддержка**: 24/7 через Railway dashboard
