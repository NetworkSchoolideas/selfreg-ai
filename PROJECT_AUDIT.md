# SelfReg AI: аудит готовности продукта

Дата аудита: 2026-07-11  
Проверенный commit: `5d75998` (`main`, совпадает с `origin/main`)  
Production: `https://selfreg-ai.vercel.app`  
Статус: технически собираемый прототип, не готовый к публичной демонстрации с реальными данными несовершеннолетних.

## 1. Итоговый вердикт

В проекте уже есть работающие части продукта: раздельные кабинеты ученика и педагога, пятиэтапный цикл саморегуляции, mock-режим, Supabase Auth, серверное хранение сессий, аналитика педагога и автоматические тесты. Это больше не «макет экранов».

Однако приложение все еще остается прототипом по более важной причине: у него нет одного надежного продуктового контура. Одновременно существуют публичный и авторизованный режимы, localStorage и Supabase, пять AI-провайдеров, BYOK и несколько регистрационных путей. Ошибки между этими ветками часто маскируются локальным fallback. Для релиза BYOK следует не убирать, а сузить до понятной и безопасной матрицы провайдеров.

Главный технический блокер: API-маршруты с service-role доступом не обеспечивают проверку владельца для каждого чтения и изменения. Знание `childId` достаточно, чтобы часть маршрутов прочитала или изменила данные в обход RLS. Для продукта с ответами и персональными данными подростков это P0.

Главный продуктовый блокер: подросток видит настройки провайдеров, моделей и API-ключей раньше основной задачи, а полезный результат зависит от нестабильной внешней интеграции. Конкурсный релиз должен оставить один сценарий, один способ входа, одно хранилище и один AI-контур.

## 2. Основание аудита и ограничения

Проверено:

- исходный код, маршруты App Router, типы, хуки, API routes и SQL-миграции;
- `package.json`, lockfile, TypeScript, ESLint, Jest, Playwright и GitHub Actions;
- Git-история и состояние рабочей копии;
- production deployment и runtime errors в Vercel;
- состояние проекта, migrations и advisors в Supabase;
- фактические локальные команды typecheck, lint, unit, E2E и production build.

Не проверено полностью:

- визуальный поток в интерактивном браузере: в текущей сессии браузерная поверхность недоступна;
- реальная регистрация нового пользователя с доставкой письма;
- Google OAuth: функция скрыта release-флагами и не входит в рекомендуемый релиз;
- полный live-AI цикл на production с действующим ключом;
- WCAG-соответствие с клавиатурой и screen reader;
- юридическая достаточность согласия, политики и обработки данных несовершеннолетних.

Старые планы использовались только для сравнения. Там, где они расходятся с кодом, источником истины является текущая реализация.

## 3. Структура и технологический стек

| Область | Фактическое состояние |
|---|---|
| Framework | Next.js `16.2.6`, App Router, React `19.2.6` |
| Язык | TypeScript `5.9.3`, strict mode |
| UI | Client Components, собственный CSS, много inline styles; UI-библиотеки нет |
| Backend | Next.js route handlers в `app/api/*` |
| Auth | Supabase Auth через `@supabase/ssr` и `@supabase/supabase-js` |
| Database | Supabase Postgres 17, таблицы `profiles`, `children`, `sessions`, `session_records` |
| Локальное хранение | `localStorage` и `sessionStorage` |
| AI | Mock, GitHub Models, OpenRouter, GigaChat, Vercel AI Gateway |
| Валидация | Zod для API payloads; отдельный `AnswerValidator` |
| Тесты | Jest 30 + Playwright 1.61, Chromium |
| CI | GitHub Actions: typecheck, lint, unit, build |
| Deploy | Git integration в Vercel; production deployment `READY` |

Крупнейшие модули показывают оставшуюся сложность: `app/adolescent/AdolescentPrototype.tsx` около 790 строк, `app/student/dashboard/page.tsx` около 690, `app/teacher/useTeacherData.ts` около 630, `app/globals.css` более 2000 строк.

## 4. Локальный запуск, сборка и развертывание

Фактические команды:

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm run test:unit
npm run test:e2e
npm run build
npm run start
```

Особенности:

- `npm run test:e2e` сам поднимает dev server на `localhost:3000`, включает development-only bypass и E2E setup route;
- E2E использует `.env.local`, поэтому может обращаться к удаленному Supabase и создавать/удалять тестовые данные;
- GitHub Actions использует Node 22, Vercel настроен на Node 24.x;
- CI build принудительно получает `NEXT_PUBLIC_SUPABASE_ENABLED=false`, поэтому успешная CI-сборка не проверяет production-ветку Supabase;
- в `DEPLOYMENT.md` упомянут несуществующий файл `supabase/migrations/001-rls-policies.sql`; реальная миграция называется иначе.

Production Vercel:

- latest deployment: `READY`, target `production`;
- production alias: `selfreg-ai.vercel.app`;
- за последние 7 дней зарегистрированы ошибки доступа к `/api/children`, отсутствие GitHub Models token, `Vercel AI Gateway: 403`, `childId=null` и ошибка обработки `/api/chat`;
- текущий commit имеет успешные GitHub Actions и Vercel check, но `Supabase Preview` завершился с ошибкой.

Supabase:

- проект `ACTIVE_HEALTHY`;
- security advisor: отключена защита от скомпрометированных паролей;
- локальный файл последней миграции: `20260709143000_add_session_visibility_and_statuses.sql`;
- remote migration version: `20260711062856_add_session_visibility_and_statuses`;
- из-за этого GitHub check сообщает: `Remote migration versions not found in local migrations directory.`

## 5. Реально работающие функции

| Функция | Статус | Основание |
|---|---|---|
| Email/password login | Работает для подготовленных аккаунтов | E2E teacher/student login прошел |
| Разделение teacher/student routes | Работает в штатном UI | Proxy + E2E redirect tests |
| Кабинет ученика | Частично реализован | Загружает current child и историю, но требуется сквозная приемка действий «продолжить», «открыть результат», архивирования и корректного role-label |
| Кабинет педагога | Частично реализован | Загружает связанных учеников и аналитику, но требуется сквозная приемка session detail, archived state и границ read-only доступа |
| Пятиэтапный цикл | Работает в mock-режиме | E2E завершает 5 шагов и видит итог |
| Clarification/retry | Работает в mock-режиме | E2E проходит уточнение и продолжает |
| Сохранение session/records в Supabase | Работает технически | E2E получает успешный `/api/session-sync` |
| Продолжение незавершенной сессии | Реализовано в коде, не принято | `resumeSessionId` восстанавливает состояние, но нет E2E, подтверждающего доступность действия из кабинета после reload |
| Новая сессия | Реализовано | `mode=new` сбрасывает session id/state |
| Детали сессии ученика | Реализовано в коде, не принято | Вопросы, ответы, feedback, итог; требуется проверка корректной ссылки из списка сессий |
| Скрытие сессии учеником | Реализовано в коде, не принято | `studentArchivedAt`, педагог должен видеть метку; нужно проверить сохранение и ошибку архивации |
| Привязка по коду педагога | Реализована функционально | `/api/join-teacher` обновляет `teacher_id` |
| Аналитика педагога | Работает на текущих данных | Распределение сценариев, этапы, сигналы |
| CSV export | Реализован на клиенте | Формирует и скачивает CSV |
| Mock provider | Работает | Unit и E2E |
| ErrorBoundary/ConfirmDialog/Toast | Частично работают | Unit tests, используются в UI |
| RU/EN переключение | Частично работает | URL переключается, не все семантические атрибуты |

## 6. Частично реализованные или неработающие функции

### Авторизация и роли

- Google OAuth скрыт двумя флагами и не должен считаться рабочей release-функцией.
- Регистрация с email зависит от подтверждения письма и production-настроек Supabase; полный поток не проверен.
- `profiles.role` можно менять через API выбора роли; RLS также разрешает пользователю обновлять собственную строку профиля целиком.
- триггер `handle_new_user()` доверяет `raw_user_meta_data.preferred_role`, хотя metadata пользователя редактируема.
- proxy сначала использует `getSession()`, затем `getUser()`. Разделение маршрутов есть, но обновление auth cookies реализовано неполно: cookies меняются на request object без возврата response с обновленными cookies.

### Данные и API

- `GET /api/children?childId=...` читает ребенка и все сессии через service role без проверки текущего пользователя.
- `GET/DELETE /api/sessions` не проверяют auth или ownership.
- `POST /api/session-sync` позволяет upsert/delete по `childId` через service role без ownership check.
- `POST /api/session-feedback` обновляет последнюю сессию произвольного `childId` без auth.
- `POST /api/join-teacher` связывает произвольный `childId` по коду без проверки владельца ребенка.
- RLS в базе включен, но эти серверные endpoints обходят его через service role.
- teacher endpoints проверяются лучше, но student endpoints и общий session sync не имеют общей модели доступа.
- `DataService` импортирует `server-storage` в клиентский слой. В браузере admin client недоступен, поэтому заявленная прямая Supabase-ветка фактически падает в localStorage; отдельные компоненты параллельно ходят через API.
- при некоторых API-ошибках регистрация внутри adolescent flow молча создает локального ребенка и показывает успех, хотя серверная связь могла не состояться.

### AI

- live AI не покрыт автоматизированным E2E; текущие тесты покрывают только mock. По ручной проверке владельца проекта GitHub Models с пользовательскими ключами работает для моделей OpenAI, DeepSeek и Llama.
- GitHub Models выбран по умолчанию, но production logs показывают отсутствие ключа у части вызовов: UX подключения не делает ключ и выбранную модель достаточно очевидными.
- Vercel AI Gateway возвращал 403; GigaChat ранее был нестабилен и не имеет подтвержденного live E2E.
- `/api/chat` и `/api/provider-check` не требуют аутентификации и не имеют rate limiting.
- при наличии серверного ключа это создает риск публичного расходования квоты.
- BYOK-ключи могут сохраняться в localStorage; предупреждение есть, но безопасный default должен быть «только текущая вкладка», а постоянное хранение - явным выбором. Ключ не должен записываться в базу, Vercel environment или логи.
- «Получить рекомендацию» в student dashboard ведет на общий экран adolescent flow и не выбирает конкретную завершенную сессию. Функция не соответствует обещанию кнопки.
- history insight отправляет специальный stage `history` в endpoint, типизированный как обычный StageId; контракт API фактически расширен неявно.

### UX и продуктовый поток

- основной подростковый экран сначала показывает provider/model/API key, а не ситуацию и вопрос.
- внутри adolescent flow есть еще одна форма «регистрации сессии» с ФИО и классом, параллельная Supabase Auth.
- empty state кабинета говорит «обратитесь к учителю», хотя рядом доступна кнопка новой сессии.
- completion screen не дает явной кнопки возврата в личный кабинет; виден только restart и текст о сохранении.
- onboarding обещает AI feedback даже при mock и использует внутренние названия Scenario A/B.
- settings доступен обоим ролям, хотя это скорее администраторская/демо-функция.

## 7. Основной путь подростка

Текущий фактический путь:

1. Пользователь выбирает роль или открывает login.
2. После student login proxy направляет в `/student/dashboard`.
3. Dashboard запрашивает `/api/children?childId=current` и получает/создает child profile.
4. Пользователь нажимает «Новая сессия» и переходит в `/adolescent?childId=...&mode=new`.
5. Adolescent screen загружает ребенка, показывает провайдер, модель и ключ.
6. Пользователь задает контекст и проходит пять вопросов.
7. Каждый ответ идет в `/api/chat`, затем snapshot идет в `/api/session-sync`.
8. После пятого шага показывается `finalNote`.
9. Сессия должна появиться в student dashboard и teacher dashboard.

Путь можно завершить в mock E2E. Его нельзя считать надежным production-путем, пока не закрыты ownership, silent fallback и live AI.

## 8. Frontend

Сильные стороны:

- отдельные teacher/student экраны;
- понятные базовые сущности: сессия, шаг, история, итог;
- есть статусы draft/in progress/completed/abandoned;
- добавлены confirmation, toast и error boundary;
- есть responsive media queries и reduced-motion rule.

Проблемы:

- крупные client components и 2000+ строк глобального CSS;
- много inline styles и строк UI непосредственно в компонентах;
- `Suspense fallback={null}` на большинстве страниц дает пустой экран во время ожидания;
- нет собственных `loading.tsx`, `error.tsx`, `not-found.tsx`;
- OnboardingModal не имеет `role=dialog`, `aria-modal`, focus trap, Escape и восстановления фокуса;
- ConfirmDialog имеет dialog semantics, но также не управляет фокусом/Escape;
- Toast не имеет `aria-live`/status;
- progress bar имеет только `aria-label`, но не `role=progressbar` и value attributes;
- `<html lang="ru">` остается русским при английском UI;
- hover-состояния role cards реализованы inline только для мыши;
- в исходниках есть файл `ConsentModal.tsx` с невалидной UTF-8 кодировкой.

## 9. Backend, хранение и интеграции

Архитектура состоит из трех конкурирующих путей:

1. браузерный Supabase client с RLS;
2. Next API routes с Supabase service role;
3. localStorage fallback.

При этом большая часть server storage использует service role, а ownership должна быть реализована вручную. Она реализована только в отдельных teacher routes. Это и есть основная архитектурная причина текущего риска.

Supabase schema в целом достаточна для demo: профили, ученики, сессии, записи, обратная связь, архивная метка. RLS policies существуют. Но политика profiles update слишком широкая, а service-role endpoints обходят RLS.

Vercel deployment работает, но отсутствует единый release gate: Vercel может быть зеленым одновременно с красным Supabase Preview.

## 10. Ошибки, пустые состояния, загрузка и повтор

| Ситуация | Состояние |
|---|---|
| Ошибка client render | Есть ErrorBoundary с reload |
| Ошибка live AI | Показывается warning, ответ сохраняется для повтора |
| Повтор AI запроса | Неявный: повторное нажатие Continue |
| Двойной submit | Есть `inFlightRef` |
| Ошибка загрузки student profile | Есть error card |
| Ошибка teacher server load | Маскируется пустым списком без причины |
| Ошибка сохранения archive | UI обновляется оптимистично, ошибка только в console |
| Ошибка adolescent registration API | Молча переключается на local child |
| Offline | Специального состояния нет |
| Пустая история | Есть empty state, но текст противоречит CTA |
| Route loading | Часто пустой `Suspense` |
| Server route error page | Собственного `error.tsx` нет |

## 11. Мобильность и доступность

Автоматически подтверждено:

- home page 375x812 без horizontal overflow;
- teacher dashboard 768x1024 без horizontal overflow;
- CSS содержит breakpoints 1024/768 и reduced-motion.

Не подтверждено:

- adolescent flow на 320/375/390 px;
- student dashboard и session detail на мобильном;
- teacher dashboard на телефоне;
- экранная клавиатура, длинные ответы, длинные имена и русские строки;
- tab order, focus visibility, modal focus trap, screen reader announcements;
- zoom 200% и high contrast.

Следовательно, заявление README «mobile-first responsive» пока сильнее доказательств.

## 12. Тесты и качество сборки

Результаты текущего запуска:

| Проверка | Результат |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit -- --runInBand` | 36 suites, 108 tests PASS |
| `npm run test:e2e` | 21 tests PASS |
| `npm run build` | PASS, 28 routes generated |
| GitHub Actions CI | PASS |
| Vercel deployment | READY / success |
| Supabase Preview check | FAIL: remote migration absent locally |

Пробелы тестов:

- нет negative authorization tests для произвольного `childId`;
- E2E использует development bypass и поэтому не доказывает production authorization;
- server-backed E2E намеренно создает данные через API без реального teacher login;
- нет live AI E2E;
- нет регистрации с email confirmation;
- нет Google OAuth;
- нет student resume/archive/detail end-to-end;
- нет согласования одной сессии между student и teacher аккаунтами в одном тесте;
- нет a11y automation;
- нет production/preview smoke после deploy.

## 13. Риски данных и психологического содержания

### Критические

- ответы подростков и ФИО/класс доступны через недостаточно защищенные service-role endpoints;
- нет проверки кризисных фраз, самоповреждения, насилия или непосредственной угрозы;
- AI prompt просит быть наставником, но нет видимого ограничения «не терапия/не экстренная помощь»;
- учитель видит полный текст личных ответов, а согласие не объясняет эту видимость в рабочем потоке;
- checkbox согласия не ведет к политике, а рабочий ConsentModal не подключен и имеет поврежденную кодировку;
- удаление и экспорт персональных данных доступны педагогу без описанной retention/audit модели;
- публичный release с реальными несовершеннолетними сейчас недопустим.

### Высокие

- API-ключи пользователя могут оставаться в localStorage на общем школьном устройстве;
- profile role можно повысить до teacher;
- leaked password protection отключен;
- нет rate limit/audit trail для AI и sensitive API;
- localStorage содержит персональные данные и ответы в незашифрованном виде;
- «анонимный ID» соседствует с сохраненным ФИО и классом, то есть данные не анонимны.

Для конкурсной демонстрации допустимы только синтетические тестовые аккаунты и вымышленные ситуации. Реальная апробация с детьми требует отдельной правовой, этической и информационно-безопасностной приемки.

## 14. Мертвый код, дублирование и экспериментальные функции

Подтверждено:

- `hooks/useAuth.ts` не импортируется приложением и представляет старую mock-auth ветку;
- `app/components/HistoryReview.tsx` не используется, потому что второй HistoryReviewPanel встроен в AdolescentPrototype;
- `ConsentModal.tsx` импортирован, но не рендерится; `showConsentModal` никогда не становится `true`;
- `styles/globals.css` не импортируется; активен `app/globals.css`;
- `supabase-schema.sql` и `supabase-repair.sql` конкурируют с migration directory и устаревшими инструкциями;
- `/teacher/dashboard` и `/teacher/dashboard/child` являются legacy redirect routes;
- README/TESTING/DEPLOYMENT содержат устаревшие числа, пути и обещания;
- пять AI providers увеличивают поверхность ошибок. GitHub Models подтвержден ручными проверками с пользовательскими ключами, но не закреплен automated live E2E; OpenRouter требует отдельного расширенного UX, GigaChat и Vercel AI Gateway не подтверждены для релиза;
- Google OAuth прошел серию исправлений в Git, но сейчас правильно скрыт flags.

## 15. Что исключить из ближайшего релиза

До конкурсной заявки заморозить:

- Google OAuth;
- самостоятельную регистрацию новых пользователей во время демонстрации;
- anonymous/public persistence;
- проектные серверные ключи для обхода BYOK;
- GigaChat как рабочий provider: оставить видимую пометку «В разработке», но не давать начать live-сессию;
- Vercel AI Gateway до исправления 403;
- history AI recommendation как отдельную функцию;
- destructive teacher CRUD во время демонстрации;
- PWA, SEO, новый landing и визуальный редизайн;
- реальных несовершеннолетних и реальные персональные данные;
- психологическую диагностику, оценку состояния или автоматические кризисные рекомендации.

## 16. Рекомендуемый демонстрационный сценарий

Один сквозной сценарий:

1. Подготовленный ученик входит по email/password.
2. В личном кабинете видит связь с подготовленным педагогом.
3. Нажимает «Новая сессия».
4. Описывает безопасную учебную ситуацию, например подготовку к контрольной.
5. Проходит пять шагов; на каждом получает короткую обратную связь от одного проверенного AI-провайдера.
6. Получает видимый итог: конкретный план следующего действия и критерий проверки результата.
7. Возвращается в кабинет и открывает сохраненную завершенную сессию.
8. Подготовленный педагог входит во второй аккаунт и видит эту же сессию, итог и источник feedback.

Полезный результат: подросток получает конкретный следующий шаг, а педагог видит синхронизированный результат без доступа к чужим данным.

## 17. Критерий demo-ready

Продукт готов к конкурсной демонстрации, когда на production один подготовленный student account и один teacher account завершают сценарий выше два раза подряд на desktop и mobile; live AI отвечает или дает явный безопасный retry; сессия после reload остается в Supabase и видна только связанным аккаунтам; negative authorization tests подтверждают запрет чужого `childId`; все GitHub, Vercel и Supabase checks зеленые; используются только синтетические данные; на экране есть ясные ограничения продукта и кризисная переадресация.
