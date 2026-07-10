# SelfReg AI — Полный аудит и план доработки (2026-07-09)

## Методология

Аудит проведён на основе:
1. Скриншотов production-версии (selfreg-ai.vercel.app)
2. Полного анализа исходного кода всех ключевых компонентов (50+ файлов)
3. Сравнения с референсными продуктами (ClassDojo, Panorama Education, Think Time)
4. Анализа архитектурных паттернов и data flow

---

## Уточнения после технической ревизии

Эти пункты нужны, чтобы план вёл к правильным исправлениям, а не к косметическому закрытию симптомов.

### Что уже взято в текущий незакоммиченный пакет

- `Student dashboard` получает действия над сессиями: открыть, продолжить конкретную незавершённую сессию, перейти к получению рекомендации.
- `Новая сессия` переводится на `/adolescent?mode=new`, чтобы новая работа не продолжала старый черновик.
- Продолжение черновика переводится на `/adolescent?resumeSessionId=...`, чтобы восстанавливалась конкретная сессия.
- В кабинете ученика добавляется детальный просмотр сессии: итог, рекомендация ИИ, вопросы, ответы и feedback.
- `useSessionSubmit` больше не вызывает два независимых сохранения для зарегистрированного ученика: registered child идёт через `DataService`, demo-only сессия без `childId` — через `sessionManager`.
- При ошибке реального AI-провайдера submit останавливается, mock-фидбек не сохраняется как будто это LLM-ответ, а пользователь получает явное сообщение об ошибке.
- Добавлен первый контур `studentArchivedAt`: ученик может скрыть сессию из своего списка, педагог продолжает видеть её с пометкой.
- Добавлена доменная логика `abandoned`: старая незавершённая сессия не считается активной бесконечно.
- Для production требуется применить Supabase migration `20260709143000_add_session_visibility_and_statuses.sql` до проверки архивации между устройствами.

### Корректировка формулировок аудита

- `SessionStatus` уже является union type (`"in_progress" | "completed"`), но модель статусов слишком бедная. Исправление должно расширять доменную модель до `draft / in_progress / completed / abandoned` и отдельного признака видимости для ученика, а не просто "заменять string на union".
- `crypto.randomUUID()` достаточно надёжен для генерации UUID на клиенте. Риск не в математической уникальности, а в том, что клиент создаёт id и одновременно пишет в localStorage/Supabase без единого авторитетного upsert-контракта.
- Rate limiting частично прикрыт `isSending`, но это UI-защита. Нужны idempotency/session mutation guard на клиенте и минимальная серверная защита для AI/API routes.
- Архивация учеником не должна удалять данные и не должна скрывать их от педагога. Это должен быть флаг вида `studentHiddenAt` / `studentArchivedAt`, который влияет только на основной список ученика.

### Рекомендуемый порядок выполнения

1. Закрыть текущий пакет `Student dashboard + clean new/resume session`.
2. Сразу после него исправить dual storage race: один путь сохранения для registered child, отдельный demo-only путь без childId.
3. После этого исправить AI error handling: при сбое реального провайдера не сохранять mock как будто это ответ ИИ; показывать явную ошибку и давать повторить.
4. Потом расширять статусы/архивацию. Делать это раньше рискованно: иначе новый статус будет строиться поверх ещё неустойчивого сохранения.

---

## 🔴 P0: Критические проблемы (без них приложение не работает как продукт)

### P0.1 — Google OAuth регистрация ломает роли
**Файлы:** `app/api/auth/callback/route.ts:140`, `hooks/useSupabaseAuth.ts:45-48`
**Суть:** Fallback на `"student"` если роль не удалось определить. Google OAuth теряет роль при редиректе.

### P0.2 — Student dashboard: нет действий над сессиями
**Файл:** `app/student/dashboard/page.tsx:459-503`
**Суть:** Сессии отображаются как пассивные карточки. Нет кнопок "Открыть результат", "Продолжить", "Скрыть".

### P0.3 — "Новая сессия" не создаёт новый sessionId (дублирование записей)
**Файлы:** `app/adolescent/useAdolescentSession.ts:148-159`, `hooks/useSessionSubmit.ts:89-111`
**Суть:** `resetSession()` создаёт новый `sessionId` через `createChildId()`, но `saveSession()` сохраняет сессию с этим ID в localStorage. Если пользователь начинает новую сессию, а старая не была завершена — в `children-storage` появляются две сессии с разными ID, но старая остаётся `in_progress`. **Проблема в том, что `Новая сессия` в дашборде ученика ведёт на `/adolescent?childId=...` без `mode=new`, поэтому `resetSession()` не вызывается, и сессия продолжает старую.**

### P0.4 — AI рекомендация в неправильном месте
**Файл:** `app/adolescent/AdolescentPrototype.tsx:550-564`
**Суть:** Кнопка "Получить комментарий от ИИ" в истории перед новой сессией, а не в деталях сессии.

### P0.5 — Student не может открыть детали сессии
**Файл:** `app/student/dashboard/page.tsx:459-503`
**Суть:** Teacher видит детали, student — нет.

### P0.6 — Нет единого источника истины для сессий (dual storage race)
**Файлы:** `lib/children-storage.ts`, `lib/data-service.ts`, `hooks/useSessionSubmit.ts:107-110`
**Суть:** Сессия сохраняется в ДВУХ местах: `sessionManager.saveSession()` (localStorage) и `DataService.saveSession()` (Supabase + localStorage). Нет гарантии, что оба хранилища согласованы. При перезагрузке страницы может загрузиться старая версия из localStorage, перезаписав новые данные из Supabase.

### P0.7 — Нет обработки ошибок AI-провайдера в UI
**Файл:** `hooks/useSessionSubmit.ts:191-198`
**Суть:** При ошибке AI-провайдера показывается mock-фидбек, но пользователь не видит чёткого сообщения об ошибке. Сессия сохраняется с mock-данными, и teacher видит некорректные результаты.

---

## 🟡 P1: Проблемы пользовательского опыта

### P1.1 — Путаница в названиях и ролях
**Файлы:** `app/HomeClient.tsx:62-64`, `app/adolescent/AdolescentPrototype.tsx:438`
**Суть:** "Дашборд педагога" в прототипе подростка, нет чёткого разделения.

### P1.2 — Нет архивации сессий для ученика
**Файл:** `app/student/dashboard/page.tsx`
**Суть:** Ученик не может скрыть старые сессии.

### P1.3 — Статусы сессий не согласованы
**Файлы:** `types/session.ts`, `lib/children-storage.ts`
**Суть:** Нет draft/abandoned/archived. Сессии висят in_progress вечно.

### P1.4 — Нет страницы настроек ученика
**Суть:** Ученик не может отключиться от учителя, посмотреть teacher code.

### P1.5 — Нет подтверждения действий
**Суть:** Нет ConfirmDialog для необратимых действий.

### P1.6 — Teacher dashboard не показывает archived сессии
**Файл:** `app/teacher/TeacherDashboard.tsx`
**Суть:** Если ученик архивирует сессию, teacher должен видеть её с пометкой "archived by student". Сейчас такой логики нет.

### P1.7 — Нет индикации "сессия устарела"
**Суть:** Сессии недельной давности без обновления должны помечаться как "abandoned". Сейчас они висят in_progress.

---

## 🔵 P2: Архитектурные проблемы (не видны на UI, но критичны для развития)

### P2.1 — Нет изоляции между "анонимным" и "зарегистрированным" режимом
**Файлы:** `app/adolescent/AdolescentPrototype.tsx`, `lib/children-storage.ts`
**Суть:** Анонимный пользователь (без childId) создаёт сессии в localStorage. Зарегистрированный — в Supabase. Но код не различает эти режимы чётко. `DataService` пытается писать и туда, и туда. При переключении между режимами данные могут дублироваться.

### P2.2 — Нет единого типа для статуса сессии
**Файл:** `types/session.ts`
**Суть:** Базовый union type уже есть (`"in_progress" | "completed"`), но он не покрывает реальные состояния продукта: `draft`, `abandoned`, `student_archived`/student-hidden. Нужны доменные константы, единая функция нормализации статуса и отдельный флаг видимости для ученика, чтобы не смешивать архивирование с удалением.

### P2.3 — sessionId генерируется на клиенте, а не на сервере
**Файл:** `lib/children-storage.ts:20-26`
**Суть:** `crypto.randomUUID()` сам по себе приемлем, но id создаётся на клиенте и сразу используется для localStorage/Supabase upsert. При сбоях сети, повторных сабмитах и восстановлении черновиков нет единого серверного источника истины и idempotency-контракта.

### P2.4 — Нет rate limiting для AI-запросов
**Файл:** `hooks/useSessionSubmit.ts:129-130`
**Суть:** UI использует `isSending`, но это не полноценная защита. Нужен guard от повторного submit до завершения текущего запроса, idempotency для сохранения ответа и минимальная серверная защита `/api/chat`/`/api/provider-check`.

### P2.5 — Нет кэширования профиля ученика
**Файл:** `app/student/dashboard/page.tsx:116-167`
**Суть:** Профиль загружается при каждом монтировании компонента. Нет кэширования в памяти или localStorage.

### P2.6 — Нет обработки offline-режима
**Суть:** Приложение работает с localStorage, но нет индикации "вы офлайн". Если Supabase недоступен, пользователь не видит ошибку.

### P2.7 — Нет миграции данных из localStorage в Supabase
**Файл:** `lib/data-service.ts`
**Суть:** `DataService` пытается писать в Supabase, но если там ошибка — падает на localStorage. Нет механизма "поднять" данные из localStorage в Supabase после подключения.

### P2.8 — Teacher dashboard загружает ВСЕ данные при монтировании
**Файл:** `app/teacher/useTeacherData.ts`
**Суть:** При загрузке teacher dashboard загружает всех детей и все сессии. С ростом количества учеников это станет проблемой производительности. Нужна пагинация.

---

## 🟢 P3: Косметика и улучшения

### P3.1 — Нет loading/skeleton состояний
### P3.2 — Нет 404 страницы
### P3.3 — Нет error.tsx
### P3.4 — Нет favicon и PWA manifest
### P3.5 — Нет SEO метаданных
### P3.6 — Нет политики конфиденциальности

---

## 📋 Полная тест-матрица (38 тестов)

### Student Account (15 тестов)
| # | Тест | Статус |
|---|------|--------|
| 1 | Login/logout | ✅ |
| 2 | Dashboard metrics | ❌ |
| 3 | Teacher connection state | ❌ |
| 4 | Start new clean session | ❌ |
| 5 | Resume specific in-progress session | ❌ |
| 6 | Open completed session detail | ❌ |
| 7 | Open in-progress session detail | ❌ |
| 8 | Generate recommendation for completed session | ❌ |
| 9 | Generate recommendation error (no key) | ❌ |
| 10 | Hide/archive own session from dashboard | ❌ |
| 11 | Confirm teacher still sees archived session | ❌ |
| 12 | Language toggle preserves route | ❌ |
| 13 | RBAC: cannot open teacher dashboard | ✅ |
| 14 | Settings page | ❌ |
| 15 | Disconnect from teacher | ❌ |

### Teacher Account (12 тестов)
| # | Тест | Статус |
|---|------|--------|
| 1 | Login/logout | ✅ |
| 2 | Teacher code copy | ✅ |
| 3 | Student list | ✅ |
| 4 | Student search by name/id | ❌ |
| 5 | Open student detail | ✅ |
| 6 | View session list | ✅ |
| 7 | Open completed session detail | ✅ |
| 8 | Open long/invalid session detail | ❌ |
| 9 | Delete temporary student | ✅ |
| 10 | Delete/undo session | ✅ |
| 11 | CSV export | ❌ |
| 12 | Analytics after new student session | ❌ |

### AI Providers (6 тестов)
| # | Тест | Статус |
|---|------|--------|
| 1 | GitHub Models key check | ❌ |
| 2 | GitHub Models full 5-step cycle | ❌ |
| 3 | Missing key error | ❌ |
| 4 | Provider switch state | ❌ |
| 5 | Mock full cycle | ❌ |
| 6 | GigaChat/Vercel hidden or experimental | ❌ |

### Data Integrity (5 тестов)
| # | Тест | Статус |
|---|------|--------|
| 1 | New session creates new sessionId | ❌ |
| 2 | Completed cycle has exactly 5 answer records | ❌ |
| 3 | In-progress session not overwritten by new session | ❌ |
| 4 | Student/teacher dashboard counts agree | ❌ |
| 5 | Supabase persistence after reload | ❌ |

---

## 🔄 Приоритетный план действий

```
Фаза 0: Auth fix (1.5 часа)
───────────────────────────
[P0] FIX-1: Убрать fallback "student" → null в callback route
[P0] FIX-2: Добавить редирект на /role-selection при null role
[P0] FIX-3: Убрать fallback "student" → null в useSupabaseAuth
[P0] FIX-4: Сделать /role-selection рабочей для post-OAuth
[P0] FIX-5: Проверить Supabase Dashboard Redirect URLs
[P1] TEST: Написать тесты для auth callback

Фаза 1: Student dashboard (3 часа)
───────────────────────────────────
[P0] Добавить кнопки действий для сессий (открыть, продолжить, скрыть)
[P0] Создать страницу/модалку детального просмотра сессии
[P0] Перенести AI рекомендацию в детальный просмотр
[P1] Добавить статус student_archived
[P1] Добавить ConfirmDialog для архивации

Фаза 2: Session integrity (2 часа)
───────────────────────────────────
[P0] Исправить "Новая сессия" — создавать новый sessionId
[P0] Добавить статусы draft/in_progress/completed/abandoned
[P1] Разделить resume и new session
[P2] Исправить dual storage race condition (единый источник истины)
[P2] Добавить обработку ошибок AI-провайдера в UI

Фаза 3: Архитектура (2 часа)
─────────────────────────────
[P2] Изолировать анонимный и зарегистрированный режимы
[P2] Добавить union type для статуса сессии
[P2] Добавить rate limiting для AI-запросов
[P2] Добавить кэширование профиля ученика
[P2] Добавить индикацию offline-режима
[P2] Добавить миграцию localStorage → Supabase

Фаза 4: UI/UX (2 часа)
───────────────────────
[P1] Исправить названия и роли (student/teacher labels)
[P1] Добавить страницу настроек ученика
[P1] Teacher: показывать archived сессии с пометкой
[P1] Добавить индикацию "сессия устарела" (abandoned)
[P3] Добавить loading.tsx, error.tsx, not-found.tsx
[P3] Добавить favicon + PWA manifest + SEO

Фаза 5: Тесты (4 часа)
───────────────────────
[P0] P0 unit tests (22 теста)
[P1] P1 integration tests (14 тестов)
[P2] P2 edge cases + security (11 тестов)
[P3] P3 E2E tests (8 тестов)

Фаза 6: Финальная проверка (30 мин)
───────────────────────────────────
npm run check:full
npm test
npm run test:e2e
