# Инструкция по настройке Supabase

## 1. Создание проекта

1. Перейдите на [supabase.com](https://supabase.com)
2. Нажмите **Start your project**
3. Выберите регион (близкий к вам)
4. Задайте пароль для базы данных
5. Дождитесь создания проекта (~2 минуты)

## 2. Настройка таблиц

### Таблица `teachers`

```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  teacher_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teachers_code ON teachers(teacher_code);
```

### Таблица `children`

```sql
CREATE TABLE children (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_children_teacher ON children(teacher_id);
CREATE INDEX idx_children_email ON children(email);
```

### Таблица `sessions`

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  session_date TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_child ON sessions(child_id);
CREATE INDEX idx_sessions_date ON sessions(session_date);
```

## 3. Применение RLS политик

Запустите SQL из файла `supabase/migrations/001-rls-policies.sql` через SQL Editor.

## 4. Настройка Authentication

### Email/Password Authentication

1. Перейдите в **Authentication** → **Providers**
2. Включите **Email**
3. Отключите **Confirm email** (для разработки)

### JWT Token

1. Перейдите в **Project Settings** → **API**
2. Скопируйте **anon/public key**
3. Скопируйте **service_role key** (только для сервера!)

## 5. Переменные окружения

Добавьте в `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=ваш_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_anon_key
```

## 6. Тестирование

1. Зарегистрируйте учителя
2. Скопируйте teacherCode
3. Зарегистрируйте ученика с teacherCode
4. Проверьте связь в dashboard учителя