-- ============================================
-- SelfReg AI - Supabase Repair Script
-- ============================================
-- Run this on an existing Supabase project that was created
-- from the older schema and now fails against the current app.
-- This script is additive and does not drop data.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE IF EXISTS public.children
  ADD COLUMN IF NOT EXISTS teacher_id TEXT,
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  IF to_regclass('public.children') IS NULL THEN
    RETURN;
  END IF;

  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
      AND att.attname = 'teacher_id'
      AND att.attnum = ANY (con.conkey)
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'children'
      AND con.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.children DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'children'
      AND column_name = 'teacher_id'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.children
      ALTER COLUMN teacher_id TYPE TEXT
      USING teacher_id::text;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.sessions
  ADD COLUMN IF NOT EXISTS lang TEXT,
  ADD COLUMN IF NOT EXISTS history_insight TEXT,
  ADD COLUMN IF NOT EXISTS adolescent_feedback JSONB;

ALTER TABLE IF EXISTS public.session_records
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS response_mode TEXT,
  ADD COLUMN IF NOT EXISTS question TEXT,
  ADD COLUMN IF NOT EXISTS answer TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'status') THEN
    ALTER TABLE public.sessions ALTER COLUMN status SET DEFAULT 'in_progress';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_children_teacher_id') THEN
    CREATE INDEX idx_children_teacher_id ON public.children(teacher_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_session_records_event_type') THEN
    CREATE INDEX idx_session_records_event_type ON public.session_records(event_type);
  END IF;
END $$;

-- Recreate triggers/functions idempotently.
DROP TRIGGER IF EXISTS handle_children_updated_at ON public.children;
DROP TRIGGER IF EXISTS handle_sessions_updated_at ON public.sessions;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, metadata, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'preferred_role', ''),
      CASE
        WHEN NEW.email LIKE '%@school.ru' THEN 'teacher'
        WHEN NEW.email LIKE '%@edu.ru' THEN 'teacher'
        WHEN NEW.email LIKE '%@teacher.ru' THEN 'teacher'
        ELSE 'student'
      END
    ),
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        role = COALESCE(public.profiles.role, EXCLUDED.role),
        metadata = COALESCE(public.profiles.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb),
        updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_updated_at() FROM public, anon, authenticated;

CREATE TRIGGER handle_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
