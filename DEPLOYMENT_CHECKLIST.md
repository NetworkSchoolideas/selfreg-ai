# Deployment Checklist - SelfReg AI

## Pre-Deployment Checklist

### ✅ 1. Environment Setup

- [ ] `.env.local` создан и содержит все переменные
- [ ] `NEXT_PUBLIC_SUPABASE_URL` установлен
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` установлен
- [ ] `SUPABASE_SERVICE_ROLE_KEY` установлен (server-only)
- [ ] `NEXT_PUBLIC_SUPABASE_ENABLED=true`

### ✅ 2. Supabase Configuration

- [ ] SQL скрипт `supabase-schema.sql` выполнен в Supabase Dashboard
- [ ] Таблицы созданы: `children`, `sessions`, `session_records`
- [ ] RLS политики активны
- [ ] Индексы созданы
- [ ] Триггеры работают (`handle_updated_at`)

**Проверка:**
```sql
-- Проверить таблицы
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Проверить политики
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

### ✅ 3. Code Quality

- [ ] `npm run typecheck` - 0 ошибок
- [ ] `npm run lint` - 0 ошибок (предупреждения допустимы)
- [ ] `npm run check:full` - build успешен
- [ ] Все импорты работают корректно
- [ ] Нет circular dependencies

### ✅ 4. Functional Testing

#### Adolescent Flow
- [ ] Регистрация нового участника работает
- [ ] Создание сессии проходит успешно
- [ ] Прохождение 5 этапов корректно
- [ ] AI-ответы получаются (mock или live)
- [ ] Clarification flow работает
- [ ] Финальная рекомендация формируется
- [ ] Feedback форма отправляется

#### Teacher Dashboard
- [ ] Список участников загружается
- [ ] Просмотр сессий работает
- [ ] Детали сессии отображаются
- [ ] Статистика корректна

#### Supabase Integration
- [ ] Данные сохраняются в Supabase (проверить в Table Editor)
- [ ] Fallback на localStorage работает (отключить интернет)
- [ ] AI-инсайты сохраняются
- [ ] История сессий загружается

### ✅ 5. Security Check

- [ ] Service role key НЕ экспонируется в клиентском коде
- [ ] RLS политики ограничивают доступ
- [ ] API keys не закоммичены в репозиторий
- [ ] `.env.local` в `.gitignore`
- [ ] Нет hardcoded secrets

### ✅ 6. Performance

- [ ] Страницы загружаются < 3 секунд
- [ ] Нет console errors в браузере
- [ ] Network запросы оптимизированы
- [ ] Supabase sync не блокирует UI

## Deployment Steps

### Option A: Deploy to Vercel (Recommended)

#### 1. Подготовка репозитория

```bash
# Проверка чистоты
git status

# Финальные коммиты
git add .
git commit -m "Phase 4: Production ready with Supabase integration"
git push origin main
```

#### 2. Создание проекта в Vercel

1. Перейдите на [vercel.com/new](https://vercel.com/new)
2. Импортируйте GitHub репозиторий
3. Настройте проект:
   - **Framework Preset**: Next.js
   - **Root Directory**: `selfreg-ai-webapp-skeleton` (если в корне)

#### 3. Конфигурация переменных окружения

В Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-or-secret-key>
NEXT_PUBLIC_SUPABASE_ENABLED=true
```

**Важно:** Добавьте для Production, Preview, и Development

#### 4. Деплой

1. Нажмите **Deploy**
2. Ожидайте завершения build (~2-5 минут)
3. Откройте deployed URL

#### 5. Проверка после деплоя

- [ ] Главная страница загружается
- [ ] `/adolescent` работает
- [ ] `/teacher` работает
- [ ] `/settings` работает
- [ ] API routes работают (`/api/chat`, `/api/health`)
- [ ] Supabase подключён (проверить логи)

### Option B: Self-Hosted Deployment

#### 1. Build

```bash
npm run build
```

#### 2. Install dependencies

```bash
npm install --production
```

#### 3. Setup PM2 (или другой process manager)

```bash
pm2 start npm --name "selfreg-ai" -- start
```

#### 4. Setup Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5. Setup SSL (Let's Encrypt)

```bash
certbot --nginx -d your-domain.com
```

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-domain.com/api/health
# Ожидаемый ответ: {"status":"ok","timestamp":"..."}
```

### 2. End-to-End Test

1. **Создать нового участника**
   - Перейти на `/adolescent`
   - Ввести ФИО и класс
   - Нажать "Начать"

2. **Пройти сессию**
   - Заполнить контекст
   - Пройти 5 этапов
   - Получить финальную рекомендацию

3. **Проверить Supabase**
   - Открыть Supabase Dashboard → Table Editor
   - Проверить таблицу `children` - должна быть запись
   - Проверить таблицу `sessions` - должна быть запись
   - Проверить таблицу `session_records` - 5 записей

4. **Проверить Teacher Dashboard**
   - Перейти на `/teacher`
   - Убедиться, что участник отображается
   - Проверить детали сессии

### 3. Monitoring Setup

#### Vercel Analytics
- [ ] Включить Vercel Analytics
- [ ] Настроить Goal tracking (конверсии)

#### Error Tracking (опционально)
- [ ] Установить Sentry
- [ ] Настроить environment variables
- [ ] Проверить сбор ошибок

#### Uptime Monitoring (опционально)
- [ ] Установить UptimeRobot
- [ ] Настроить мониторинг `/api/health`
- [ ] Настроить уведомления

## Rollback Plan

### Если что-то пошло не так

#### Vercel
```bash
# Откат к предыдущей версии
vercel rollback
```

#### Manual
```bash
# Воссоздать предыдущий build
git checkout <previous-commit>
npm run build
pm2 restart selfreg-ai
```

### Database Rollback

```sql
-- Если нужно откатить изменения в БД
-- (осторожно! удаляет все данные)
DROP TABLE IF EXISTS public.session_records CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.children CASCADE;

-- Пересоздать таблицы
-- (запустить supabase-schema.sql заново)
```

## Backup Strategy

### Автоматический бэкап Supabase

1. Откройте Supabase Dashboard
2. Перейдите в **Settings** → **Database**
3. Настройте **Automated Backups**:
   - **Frequency**: Daily
   - **Retention**: 7 days

### Ручной бэкап

```bash
# Экспорт данных (использовать pg_dump)
pg_dump -h your-db.supabase.co -U postgres your-db > backup.sql
```

## Monitoring & Alerts

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Page Load Time | < 3s | > 5s |
| API Response Time | < 500ms | > 2s |
| Supabase Uptime | 99.9% | < 99% |
| Error Rate | < 1% | > 5% |

### Logs Location

- **Vercel**: Dashboard → Deployments → View Logs
- **Supabase**: Dashboard → Logs → Realtime Logs
- **Application**: Browser Console (dev), Vercel Logs (prod)

## Final Checklist Before Going Live

- [ ] Все тесты пройдены
- [ ] Supabase подключён и работает
- [ ] RLS политики настроены
- [ ] Environment variables установлены
- [ ] API keys в безопасности
- [ ] Backup настроен
- [ ] Monitoring включён
- [ ] Документация обновлена
- [ ] Команда проинформирована
- [ ] Rollback план протестирован

## Support & Contacts

**Technical Issues:**
- Check logs in Vercel Dashboard
- Check Supabase Logs
- Review browser console

**Database Issues:**
- Supabase Dashboard → Table Editor
- Supabase Dashboard → SQL Editor

**Deployment Issues:**
- Vercel Documentation: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment

---

**Status**: ✅ Ready for Deployment
**Last Updated**: 2024
**Version**: 1.0.0
