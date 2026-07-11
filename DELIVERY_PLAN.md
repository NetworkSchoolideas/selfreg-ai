# SelfReg AI: план выхода к конкурсной демонстрации

Дата: 2026-07-11  
Основание: `PROJECT_AUDIT.md`, commit `5d75998`  
Цель: не «доделать весь продукт», а получить один безопасный, повторяемый и убедительный production-сценарий.

## 1. Решение по релизу

Ближайший релиз должен быть управляемым демонстрационным контуром с пользовательским подключением ИИ:

- два заранее подготовленных аккаунта: student и teacher;
- только email/password login;
- только Supabase как источник истины для авторизованного сценария;
- BYOK остается частью основного сценария: ключ вводит и контролирует пользователь, проектный ключ на Vercel не размещается;
- GitHub Models - рекомендуемый первый provider. Пользователь подключает свой GitHub token и выбирает один из проверенных presets OpenAI, DeepSeek или Llama;
- OpenRouter остается доступным как расширенное ручное подключение для пользователя, который знает нужную модель и ключ;
- GigaChat виден в списке, но помечен «В разработке» и недоступен для запуска новой live-сессии до отдельного подтверждения интеграции;
- Vercel AI Gateway скрыт из release UI до устранения подтвержденной ошибки 403;
- mock остается явным резервным режимом «без внешнего ИИ», а не нормальным результатом ошибки live provider;
- никаких реальных данных несовершеннолетних;
- Google OAuth скрыт до отдельного исправления role-onboarding; экспериментальные providers не выдаются за рабочие;
- teacher dashboard в демонстрации используется преимущественно для чтения результата.

Оценка объема: 16 узких P0-сессий. При двух параллельных технических потоках критический путь реалистично занимает 4-5 полных дней с финальной репетицией. Для одного исполнителя безопасная оценка — 6-8 дней. Если срок короче, сокращать нужно функции из STOP, а не security, data ownership и рабочие кабинеты.

## 2. Сквозной демонстрационный сценарий

1. Ученик входит по email/password.
2. Видит личный кабинет и активную связь с педагогом.
3. Нажимает «Новая сессия».
4. Описывает безопасную учебную ситуацию.
5. Проходит пять шагов и получает короткий feedback после каждого ответа.
6. Получает итог: один конкретный следующий шаг и способ проверить результат.
7. Возвращается в кабинет и открывает сохраненную сессию.
8. Педагог входит в свой аккаунт и видит эту же сессию, итог и источник AI feedback.

Сценарий считается завершенным только после teacher verification. Это доказывает frontend, auth, AI, persistence, ownership и связку двух ролей.

## 3. Выбор моделей для задач

Назначения ниже основаны на типе работы:

- **Terra High** — auth, ownership, RLS, data boundaries и сложная интеграция;
- **Terra Medium** — узкие исправления, миграционная дисциплина, CI и документация;
- **Luna** — пользовательский поток, тексты, responsive и accessibility;
- **Sol High** — safety reasoning, сквозная проверка и release decision.

## 4. Последовательность P0

```text
P0-01 release scope
  -> P0-02 access context
      -> P0-03 protected reads
      -> P0-04 protected writes
      -> P0-05 safe teacher linking
  -> P0-06 role API hardening
      -> P0-07 role/RLS migration
          -> P0-08 migration/CI alignment
  -> P0-09 strict Supabase persistence
  -> P0-10 safety guard
      -> P0-11 safety/disclosure UI
  -> P0-12 single live AI contour
  -> P0-13 student session workspace
  -> P0-14 teacher session review
  -> P0-15 core UX/mobile/a11y
  -> P0-16 secure E2E and rehearsal
```

P0-03, P0-04, P0-06 и P0-10 можно выполнять параллельно после согласования контрактов P0-01/P0-02.

## 5. P0 — обязательные задачи

### P0-01. Зафиксировать release scope и матрицу AI-провайдеров

**Ожидаемый результат:** production UI показывает email login, student/teacher demo path и безопасный BYOK. GitHub Models - рекомендуемый путь с presets OpenAI, DeepSeek и Llama; OpenRouter - раскрываемый расширенный путь; GigaChat - видимый disabled-state «В разработке»; mock - отдельный режим без внешнего ИИ. Google OAuth, Vercel AI Gateway, history insight и destructive teacher actions не входят в конкурсный интерфейс.

**Вероятные файлы:** `lib/auth-config.ts`, `lib/provider-registry.ts`, `app/HomeClient.tsx`, `app/adolescent/AdolescentPrototype.tsx`, `app/settings/SettingsScreen.tsx`, `app/teacher/TeacherDashboard.tsx`, `.env.example`.

**Зависимости:** нет.

**Критерии приемки:** один документированный release mode; для каждого provider есть статус «рекомендуется», «расширенный», «в разработке» или «резервный»; GigaChat и Vercel Gateway нельзя ошибочно запустить как рабочие; Google OAuth скрыт; mock явно помечен как режим без внешнего ИИ; ключи не вшиты в клиент, логи или Vercel environment.

**Команды проверки:** `npm run typecheck`; `npm run lint`; `npm run build`; `npx playwright test __tests__/e2e/teacher-flow.test.ts __tests__/e2e/settings-flow.test.ts`.

**Риск:** случайно скрыть нужный login или оставить экспериментальную функцию доступной по прямому URL.

**Рекомендуемая модель:** Luna.

### P0-02. Создать единый server-side access context

**Ожидаемый результат:** один server-only helper возвращает проверенного `userId`, profile role и разрешение на child/session; service role никогда не используется до успешной проверки контекста.

**Вероятные файлы:** новый `lib/server-user-access.ts`, `lib/server-teacher-access.ts`, `lib/supabase.ts`, новые unit tests.

**Зависимости:** P0-01 определяет разрешенные роли и режимы.

**Критерии приемки:** helper использует `auth.getUser()`, не доверяет query role/user metadata, различает 401/403/404, проверяет owner student или linked teacher, не импортируется Client Components.

**Команды проверки:** `npm run test:unit -- --runInBand __tests__/unit/server-user-access.test.ts`; `npm run typecheck`; `npm run lint`.

**Риск:** неправильный helper может заблокировать оба кабинета или дать teacher доступ ко всем детям.

**Рекомендуемая модель:** Terra High.

### P0-03. Закрыть чтение child/session данных

**Ожидаемый результат:** `/api/children`, `/api/sessions` и `/api/teacher-data` возвращают данные только владельцу student или связанному teacher; произвольный `childId` дает 403/404.

**Вероятные файлы:** `app/api/children/route.ts`, `app/api/sessions/route.ts`, `app/api/teacher-data/route.ts`, `lib/server-storage.ts`, route tests.

**Зависимости:** P0-02.

**Критерии приемки:** anonymous request = 401; чужой student = 403/404; linked teacher = 200; current student = 200; response не содержит чужие PII/sessions; service role query всегда выполняется после access check.

**Команды проверки:** `npm run test:unit -- --runInBand __tests__/unit/children-route.test.ts __tests__/unit/teacher-data-route.test.ts __tests__/unit/sessions-route.test.ts`; `npx playwright test __tests__/e2e/security-flow.test.ts`; `npm run typecheck`.

**Риск:** IDOR останется в одной legacy-ветке или nested relation.

**Рекомендуемая модель:** Terra High.

### P0-04. Закрыть запись, архивирование и удаление сессий

**Ожидаемый результат:** `/api/session-sync`, `/api/session-feedback` и DELETE `/api/sessions` проверяют владельца и допустимую операцию; student не меняет чужую сессию, teacher не редактирует ответы ученика.

**Вероятные файлы:** `app/api/session-sync/route.ts`, `app/api/session-feedback/route.ts`, `app/api/sessions/route.ts`, `lib/session-sync.ts`, route tests.

**Зависимости:** P0-02.

**Критерии приемки:** student может создавать/обновлять только сессии собственного child; teacher имеет read-only доступ в demo; archive меняет только разрешенное поле; session id проверяется вместе с child id; anonymous/chужие операции отклоняются.

**Команды проверки:** `npm run test:unit -- --runInBand __tests__/unit/session-sync-route.test.ts __tests__/unit/session-feedback-route.test.ts __tests__/unit/sessions-route.test.ts`; `npx playwright test __tests__/e2e/security-flow.test.ts`.

**Риск:** несовместимость с resume/archive и потеря существующей сессии при upsert.

**Рекомендуемая модель:** Terra High.

### P0-05. Защитить child ownership и привязку к педагогу

**Ожидаемый результат:** `/api/join-teacher` принимает только аутентифицированного student, который владеет child; teacher CRUD не может изменить ребенка другого teacher; код педагога не раскрывает лишние данные.

**Вероятные файлы:** `app/api/join-teacher/route.ts`, `app/api/children/route.ts`, `lib/teacher-link.ts`, `lib/server-storage.ts`, tests.

**Зависимости:** P0-02 и P0-03.

**Критерии приемки:** student owner + valid code = 200; чужой child = 403/404; invalid code = нейтральная ошибка; повторная привязка требует явного правила; teacher delete проверяет `teacher_id` до service-role delete.

**Команды проверки:** `npm run test:unit -- --runInBand __tests__/unit/join-teacher-route.test.ts __tests__/unit/children-route.test.ts`; `npx playwright test __tests__/e2e/account-link-flow.test.ts`.

**Риск:** сломать уже связанную тестовую пару или оставить возможность перебора teacher codes.

**Рекомендуемая модель:** Terra High.

### P0-06. Запретить повышение роли через клиентский API

**Ожидаемый результат:** аутентифицированный student не может превратить существующий профиль в teacher через `/api/profile-role`, query params или user metadata. Выбор роли разрешен только при контролируемом первичном создании тестового профиля.

**Вероятные файлы:** `app/api/profile-role/route.ts`, `app/api/auth/callback/route.ts`, `lib/supabase-auth.ts`, `proxy.ts`, auth tests.

**Зависимости:** P0-01.

**Критерии приемки:** существующая роль immutable для клиента; callback предпочитает server-owned profile; role parameter не перезаписывает профиль; RBAC negative tests проходят.

**Команды проверки:** `npm run test:unit -- --runInBand __tests__/unit/auth-callback-route.test.ts __tests__/unit/proxy-route.test.ts __tests__/unit/profile-role-route.test.ts`; `npx playwright test __tests__/e2e/auth-flow.test.ts`.

**Риск:** заблокировать первичное создание заранее подготовленных аккаунтов.

**Рекомендуемая модель:** Terra High.

### P0-07. Укрепить role и ownership правила в Postgres

**Ожидаемый результат:** новая migration не доверяет `raw_user_meta_data` для авторизации, запрещает обычному пользователю менять `profiles.role`, сохраняет RLS ownership для children/sessions/records и минимизирует service-role поверхность.

**Вероятные файлы:** новая migration в `supabase/migrations/`, `types/supabase.ts`, SQL/RLS tests или documented test matrix.

**Зависимости:** P0-06 определяет app contract.

**Критерии приемки:** student не обновляет role SQL-клиентом; student читает только own child; linked teacher читает только linked child; чужие операции дают 0 rows/permission error; trigger не назначает teacher из user-editable metadata; advisors не показывают новые critical warnings.

**Команды проверки:** `supabase migration list --linked`; `supabase db push --dry-run`; `npm run typecheck`; `npm run test:unit -- --runInBand __tests__/unit/supabase-auth.test.ts`.

**Риск:** lockout существующих teacher profiles или несовместимость старых строк `teacher_id text`.

**Рекомендуемая модель:** Terra High.

### P0-08. Синхронизировать migration history и сделать Supabase Preview зеленым

**Ожидаемый результат:** локальные migration versions точно соответствуют remote history; GitHub Supabase Preview создает branch без ошибки.

**Вероятные файлы:** `supabase/migrations/*`, `supabase/config.toml`, `supabase/README.md`, `DEPLOYMENT.md`.

**Зависимости:** P0-07, чтобы не чинить history дважды.

**Критерии приемки:** remote `20260711062856_add_session_visibility_and_statuses` присутствует локально в согласованном виде; `supabase migration list` не имеет расхождений; все четыре GitHub checks зеленые.

**Команды проверки:** `supabase migration list --linked`; `git status --short`; `gh run list --repo NetworkSchoolideas/selfreg-ai --branch main --limit 5`; PowerShell: `$sha = git rev-parse HEAD; gh api "repos/NetworkSchoolideas/selfreg-ai/commits/$sha/check-runs"`.

**Риск:** неверный repair/rename может повторно применить DDL. Нельзя выполнять DDL для простого выравнивания истории без проверки remote state.

**Рекомендуемая модель:** Terra Medium.

### P0-09. Сделать Supabase единственным источником истины для demo account

**Ожидаемый результат:** авторизованный student не получает «успешный» локальный fallback при ошибке сервера; save/load/resume/archive явно подтверждаются Supabase. localStorage остается только для полностью отдельного mock sandbox, скрытого в release mode.

**Вероятные файлы:** `lib/data-service.ts`, `lib/children-storage.ts`, `hooks/useSessionSubmit.ts`, `hooks/useSessionHistory.ts`, `app/adolescent/AdolescentPrototype.tsx`, `app/student/dashboard/page.tsx`.

**Зависимости:** P0-03, P0-04, P0-05.

**Критерии приемки:** после каждого сохранения известен server result; reload восстанавливает ту же session; ошибка Supabase видна и предлагает retry; local stale copy не перезаписывает server state; student и teacher counts совпадают.

**Команды проверки:** `npm run test:unit -- --runInBand __tests__/unit/session-sync.test.ts __tests__/unit/children-storage.test.ts __tests__/unit/student-dashboard.test.ts`; `npx playwright test __tests__/e2e/persistence-flow.test.ts`; `npm run build`.

**Риск:** потеря offline/demo поведения или дублирование существующих session ids.

**Рекомендуемая модель:** Terra High.

### P0-10. Добавить safety guard для кризисного содержания

**Ожидаемый результат:** до вызова внешнего AI система распознает минимум: самоповреждение/суицид, непосредственную опасность, насилие/угрозу. В этих случаях обычный self-regulation цикл останавливается и возвращает детерминированный safety result без диагностических выводов.

**Вероятные файлы:** `lib/scenario-guards.ts`, новый `lib/safety-guard.ts`, `app/api/chat/route.ts`, `types/session.ts`, unit/route tests.

**Зависимости:** P0-01 определяет границы продукта.

**Критерии приемки:** RU/EN fixtures; false-positive набор для обычных учебных ситуаций; safety response не отправляет sensitive prompt провайдеру; результат содержит понятный тип и локализованный текст; лог не содержит полный ответ пользователя.

**Команды проверки:** `npm run test:unit -- --runInBand __tests__/unit/safety-guard.test.ts __tests__/unit/chat-route.test.ts`; `npm run typecheck`; `npm run lint`.

**Риск:** ложные срабатывания или опасное ощущение, что keyword list заменяет профессиональную оценку.

**Рекомендуемая модель:** Sol High.

### P0-11. Добавить безопасные ограничения и disclosure в UI

**Ожидаемый результат:** подросток до начала видит коротко: продукт не является терапией/экстренной помощью; педагог увидит ответы; нельзя вводить секреты; при опасности нужно обратиться к взрослому и экстренным службам. В demo используются псевдонимы и синтетические данные.

**Вероятные файлы:** `app/adolescent/AdolescentPrototype.tsx`, `app/components/OnboardingModal.tsx`, новый safety notice component, `app/auth/login/page.tsx`; dead `ConsentModal.tsx` не должен возвращаться без полной переработки.

**Зависимости:** P0-10 задает safety result.

**Критерии приемки:** disclosure доступен с клавиатуры, не маскируется checkbox без текста, кризисный state визуально отделен от AI feedback, нет обещаний анонимности при сохранении ФИО/ответов, completion не содержит медицинских утверждений.

**Команды проверки:** `npm run test:unit -- --runInBand __tests__/unit/onboarding-modal.test.tsx __tests__/unit/safety-notice.test.tsx`; `npx playwright test __tests__/e2e/adolescent-safety-flow.test.ts`; `npm run lint`.

**Риск:** слишком длинный юридический текст разрушит сценарий; нужен короткий первый слой и подробности отдельно.

**Рекомендуемая модель:** Luna.

### P0-12. Довести безопасный BYOK-контур GitHub Models и OpenRouter

**Ожидаемый результат:** авторизованный пользователь подключает собственный ключ GitHub Models в понятном onboarding: получает инструкцию по созданию token с правом `models: read`, выбирает проверенный preset OpenAI, DeepSeek или Llama и проверяет именно пару «ключ + модель». OpenRouter остается в отдельном раскрываемом расширенном режиме. Ключ передается только для конкретного запроса, не сохраняется на сервере и по умолчанию хранится лишь до закрытия вкладки; постоянное локальное хранение требует явного выбора. Есть timeout, один понятный retry и честный mock fallback без подмены ошибки AI-ответом. `/api/chat` и `/api/provider-check` требуют auth, не логируют ключи и имеют базовое ограничение частоты/одновременности.

**Вероятные файлы:** `app/adolescent/AdolescentPrototype.tsx`, `app/components/ApiKeyManager.tsx`, `app/settings/ProviderCheck.tsx`, `app/api/chat/route.ts`, `app/api/provider-check/route.ts`, `lib/github-models-provider.ts`, `lib/openrouter-provider.ts`, `lib/provider-registry.ts`, `services/ai-service.ts`, `hooks/useSessionSubmit.ts`, `lib/key-security.ts`, targeted unit/E2E tests.

**Зависимости:** P0-02, P0-10 и P0-01.

**Критерии приемки:** GitHub Models path объясняет, как получить пользовательский token и нужное право; доступны и проверены presets для OpenAI, DeepSeek и Llama либо актуальный каталог не позволяет выбрать недоступную модель; provider check отправляет выбранную модель вместе с ключом; GitHub Models и OpenRouter проходят один реальный ответ с тестовым ключом пользователя; пять последовательных ответов проходят через GitHub Models; timeout сохраняет ответ пользователя и позволяет retry; provider error не сохраняется как AI feedback; anonymous call = 401; ключ отсутствует в response, database и logs; базовое ограничение частоты/одновременности действует.

**Команды проверки:** `npm run test:unit -- --runInBand __tests__/unit/chat-route.test.ts __tests__/unit/provider-check-route.test.ts __tests__/unit/ai-service.test.ts`; `npx playwright test __tests__/e2e/live-ai-flow.test.ts`; `npm run build`.

**Риск:** quota/rate limit GitHub Models, различие доступных моделей между ключами, утечка token в browser storage или logs, нестабильная модель или неожиданный unsafe output.

**Рекомендуемая модель:** Terra High.

### P0-13. Довести кабинет ученика и жизненный цикл его сессий

**Ожидаемый результат:** кабинет явно называется кабинетом ученика и показывает только его данные. У каждой сессии есть понятный статус и действие: новая, продолжить незавершенную, открыть завершенную, архивирована. Нажатие «Продолжить» открывает именно сохраненную незавершенную сессию, «Открыть результат» - именно выбранную завершенную сессию. Не соответствующая контракту кнопка «Получить рекомендацию от ИИ» либо работает с конкретным `sessionId`, либо отсутствует до P1-01. Ученик может скрыть сессию из своего списка с подтверждением; это не удаляет ее у педагога.

**Вероятные файлы:** `app/student/dashboard/page.tsx`, `app/adolescent/AdolescentPrototype.tsx`, `hooks/useSessionHistory.ts`, `hooks/useSessionSubmit.ts`, `lib/session-helpers.ts`, `types/session.ts`, `app/components/ConfirmDialog.tsx`, targeted unit/E2E tests.

**Зависимости:** P0-03, P0-04 и P0-09.

**Критерии приемки:** student видит корректное название роли; пустой список направляет к «Новой сессии»; draft/in-progress можно продолжить после reload; completed открывается в read-only detail с вопросами, ответами, feedback и итогом; archived скрыта только у ученика и отмечена в teacher view; не существует CTA, который ведет не к выбранной сессии; ошибка загрузки, сохранения и архивации видима и имеет retry без оптимистичного ложного успеха.

**Команды проверки:** `npm run test:unit -- --runInBand __tests__/unit/student-dashboard.test.ts __tests__/unit/session-helpers.test.ts __tests__/unit/session-sync.test.ts`; `npx playwright test __tests__/e2e/student-session-workspace.test.ts`; `npm run typecheck`; `npm run lint`.

**Риск:** существующие ссылки `mode=new`, `resumeSessionId` и legacy localStorage могут открыть не ту сессию или потерять draft; проверять на отдельном тестовом child.

**Рекомендуемая модель:** Terra Medium.

### P0-14. Довести read-only просмотр сессий в кабинете педагога

**Ожидаемый результат:** педагог видит только привязанных учеников, выбирает ученика и открывает список его сессий. Для выбранной сессии доступны контекст, этапы, ответы, AI feedback, итог, статус и признак архивирования учеником. Педагог не может изменить ответы, сессию или настройки ключа ученика.

**Вероятные файлы:** `app/teacher/TeacherDashboard.tsx`, `app/teacher/TeacherSessionDetail.tsx`, `app/teacher/useTeacherData.ts`, `app/teacher/TeacherChildHeader.tsx`, `app/api/children/route.ts`, `app/api/sessions/route.ts`, targeted unit/E2E tests.

**Зависимости:** P0-03, P0-04, P0-05 и P0-09.

**Критерии приемки:** teacher не видит чужого child по URL или API; после завершения сессии учеником и reload она появляется у связанного teacher; teacher detail показывает те же данные, что student detail, без лишнего PII; archived сессия остается видимой педагогу с явной меткой; пустое состояние объясняет отсутствие привязанных учеников; любые destructive CTA отсутствуют или disabled с понятным текстом.

**Команды проверки:** `npm run test:unit -- --runInBand __tests__/unit/teacher-dashboard-analytics.test.ts __tests__/unit/teacher-data-route.test.ts __tests__/unit/teacher-link.test.ts`; `npx playwright test __tests__/e2e/teacher-session-review.test.ts`; `npm run typecheck`; `npm run lint`.

**Риск:** detail может обходить ownership через service role или расходиться по формату с student detail; обязательны negative API tests и один сквозной test с двумя аккаунтами.

**Рекомендуемая модель:** Terra High.

### P0-15. Упростить core UX и принять mobile/accessibility

**Ожидаемый результат:** student path на 375x812 и desktop проходит без настроек инфраструктуры; после завершения есть явные CTA «Открыть результат» и «Вернуться в кабинет»; loading/error/retry states не пустые; core controls доступны клавиатурой.

**Вероятные файлы:** `app/adolescent/AdolescentPrototype.tsx`, `app/student/dashboard/page.tsx`, `app/components/OnboardingModal.tsx`, `app/components/ConfirmDialog.tsx`, `app/components/ToastNotice.tsx`, `app/globals.css`, `app/layout.tsx`.

**Зависимости:** P0-01, P0-09, P0-11, P0-12, P0-13 и P0-14.

**Критерии приемки:** no horizontal overflow 320/375/390; textarea и CTA не перекрываются keyboard viewport; modal имеет semantics/focus/Escape; toast объявляется screen reader; progressbar semantic; английский UI получает корректный lang strategy; длинный текст не ломает layout.

**Команды проверки:** `npx playwright test __tests__/e2e/adolescent-flow.test.ts __tests__/e2e/responsive.test.ts __tests__/e2e/accessibility-smoke.test.ts`; `npm run lint`; `npm run build`.

**Риск:** поздние CSS-правки вызовут regression teacher dashboard; проверять только core screens сначала.

**Рекомендуемая модель:** Luna.

### P0-16. Написать secure E2E и провести production rehearsal

**Ожидаемый результат:** один тест/чек-лист создает или использует подготовленную пару аккаунтов, проходит student session, проверяет persistence и teacher visibility, затем negative ownership. Тот же сценарий вручную повторен на production без development bypass.

**Вероятные файлы:** `__tests__/e2e/auth-flow.test.ts`, новые `demo-flow.test.ts` и `security-flow.test.ts`, `playwright.config.ts`, `TESTING.md`, release checklist.

**Зависимости:** все предыдущие P0.

**Критерии приемки:** два последовательных прохода desktop + mobile; live AI либо отвечает, либо retry восстанавливается; reload не теряет данные; чужой account не читает child/session; teacher видит только linked student; все GitHub/Vercel/Supabase checks зеленые; runtime error scan чистый после rehearsal.

**Команды проверки:** `npm run check:full`; `npm run test:unit -- --runInBand`; `npm run test:e2e`; PowerShell: `$env:PLAYWRIGHT_BASE_URL="https://selfreg-ai.vercel.app"; npx playwright test __tests__/e2e/production-smoke.test.ts`; `gh run list --repo NetworkSchoolideas/selfreg-ai --branch main --limit 5`.

**Риск:** production E2E может повредить данные. Использовать только отдельные test users/child ids и идемпотентный cleanup без общего delete.

**Рекомендуемая модель:** Sol High.

## 6. P1 — существенно повышает качество

Выполнять после прохождения P0-16, в указанной последовательности.

| ID | Задача | Ожидаемый результат | Модель |
|---|---|---|---|
| P1-01 | Таргетированная recommendation по `sessionId` | Кнопка работает для выбранной завершенной сессии или удалена до реализации | Terra Medium |
| P1-02 | Разделить client/server repositories | Client code больше не импортирует `server-storage`; один явный API contract | Terra High |
| P1-03 | Loading/error/not-found routes | `loading.tsx`, `error.tsx`, `not-found.tsx`, retry для core routes | Luna |
| P1-04 | Teacher dashboard read-only polish | Ясная иерархия: ученики, сессии, итог; destructive actions вынесены из первого слоя | Luna |
| P1-05 | Полная accessibility-проверка | Keyboard, focus, screen reader, contrast, 200% zoom | Luna |
| P1-06 | Полная mobile matrix | Student, adolescent и teacher на 320-1024 px | Luna |
| P1-07 | Observability и abuse control | Structured errors без PII, request ids, rate limits, AI quota alerts | Terra High |
| P1-08 | Privacy/retention/export/delete contract | Проверенная политика, сроки хранения, субъектные запросы, audit trail | Sol High |
| P1-09 | Supabase Auth hardening | Leaked password protection, session settings, redirect allowlist | Terra Medium |
| P1-10 | Runtime/dependency alignment | Node version едина в CI/Vercel; package ranges и lockfile согласованы | Terra Medium |
| P1-11 | Удалить dead code и дубли | Старый mock auth, unused HistoryReview/ConsentModal/styles, legacy routes | Terra Medium |
| P1-12 | Обновить документацию | README/TESTING/DEPLOYMENT отражают реальный стек, migration paths и test counts | Terra Medium |

Для каждой P1 задачи обязательный минимум: targeted tests, `npm run typecheck`, `npm run lint`, затем full build на границе релизного пакета.

## 7. P2 — после конкурсной заявки

- самостоятельная email registration с подтверждением письма;
- Google OAuth с отдельной role onboarding;
- полноценный provider routing, организация ключей и командные/административные настройки BYOK;
- GigaChat после отдельной технической приемки и live E2E; до нее он остается помеченным «В разработке»;
- Vercel AI Gateway после исправления и подтверждения 403;
- миграция локальных anonymous sessions в аккаунт;
- полноценная parent role вместо объединения «student or parent»;
- расширенная longitudinal analytics и AI history insight;
- PWA/offline mode;
- SEO, favicon package и landing redesign;
- performance work: pagination, server caching, bundle splitting;
- полноценные database pgTAP/RLS tests и preview environments для каждого PR.

## 8. STOP — не реализовывать сейчас

- не чинить Google OAuth параллельно основному релизу;
- не подключать проектные ключи GitHub, OpenRouter или других провайдеров в Vercel ради обхода BYOK;
- не делать GigaChat доступным для реальных сессий, пока нет успешного provider-check и live E2E;
- не поддерживать пять AI providers в конкурсной версии;
- не хранить API-ключи подростка в localStorage как основной сценарий;
- не собирать ФИО/класс в anonymous public flow;
- не проводить реальную апробацию с несовершеннолетними до security/legal review;
- не давать AI ставить диагнозы, оценивать психическое состояние или заменять экстренную помощь;
- не добавлять новые analytics, charts, gamification, badges и PWA до прохождения demo flow;
- не делать большой визуальный редизайн до стабилизации ownership, persistence и AI;
- не выполнять массовую очистку старых данных/миграций во время срочного релиза;
- не использовать teacher delete/export на конкурсной демонстрации.

## 9. Первые три задачи

1. **P0-01:** зафиксировать release scope и скрыть все, что не входит в один demo flow.
2. **P0-02:** создать общий server-side access context и ownership contract.
3. **P0-03:** закрыть чтение child/session данных и добавить negative IDOR tests.

P0-04 и P0-10 можно начинать параллельно после утверждения контракта P0-02.

## 10. Release gate

Конкурсный релиз разрешен только при одновременном выполнении условий:

- student и teacher завершают один и тот же production flow;
- live AI дает полезный итог или восстанавливаемый retry;
- session переживает reload и видна в обоих разрешенных кабинетах;
- чужой account и anonymous request не читают/не меняют данные;
- role escalation невозможен;
- safety guard и disclosure присутствуют;
- desktop и mobile проходят без blocking UI defects;
- typecheck, lint, 108+ unit tests, secure E2E и build зеленые;
- GitHub Actions, Vercel и Supabase Preview зеленые;
- runtime logs после rehearsal не содержат новых ошибок;
- используются только синтетические данные.

Если хотя бы один пункт ownership, role escalation, safety или persistence не выполнен, допустим только локальный показ на синтетических данных без публичной ссылки.
