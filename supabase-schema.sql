-- ============================================
-- SelfReg AI - Supabase Database Schema
-- ============================================
-- Idempotent schema aligned with the current app code.
-- Safe to run on a fresh project. For an existing project,
-- prefer running supabase-repair.sql first.
--
-- This file creates tables, indexes, triggers, and enables RLS.
-- Apply current policies separately from:
--   supabase/migrations/001-rls-policies.sql
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop policies before recreating them.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own children" ON public.children;
DROP POLICY IF EXISTS "Users can create their own children" ON public.children;
DROP POLICY IF EXISTS "Users can update their own children" ON public.children;
DROP POLICY IF EXISTS "Users can delete their own children" ON public.children;

DROP POLICY IF EXISTS "Users can view sessions for their children" ON public.sessions;
DROP POLICY IF EXISTS "Users can create sessions for their children" ON public.sessions;
DROP POLICY IF EXISTS "Users can update sessions for their children" ON public.sessions;

DROP POLICY IF EXISTS "Users can view session records for their sessions" ON public.session_records;
DROP POLICY IF EXISTS "Users can create session records for their sessions" ON public.session_records;

-- Drop triggers and functions before recreating them.
DROP TRIGGER IF EXISTS handle_children_updated_at ON public.children;
DROP TRIGGER IF EXISTS handle_sessions_updated_at ON public.sessions;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID,
  consent_given BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS teacher_id UUID,
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  context TEXT NOT NULL,
  final_note TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  lang TEXT,
  history_insight TEXT,
  adolescent_feedback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS lang TEXT,
  ADD COLUMN IF NOT EXISTS history_insight TEXT,
  ADD COLUMN IF NOT EXISTS adolescent_feedback JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.session_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  stage_id INTEGER NOT NULL CHECK (stage_id >= 1 AND stage_id <= 5),
  stage_title TEXT NOT NULL,
  scenario TEXT NOT NULL,
  event_type TEXT,
  provider TEXT,
  model TEXT,
  response_mode TEXT,
  feedback TEXT NOT NULL,
  question TEXT,
  answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.session_records
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS response_mode TEXT,
  ADD COLUMN IF NOT EXISTS question TEXT,
  ADD COLUMN IF NOT EXISTS answer TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_email') THEN
    CREATE INDEX idx_profiles_email ON public.profiles(email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_role') THEN
    CREATE INDEX idx_profiles_role ON public.profiles(role);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_children_user_id') THEN
    CREATE INDEX idx_children_user_id ON public.children(user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_children_teacher_id') THEN
    CREATE INDEX idx_children_teacher_id ON public.children(teacher_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_children_name') THEN
    CREATE INDEX idx_children_name ON public.children(name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_children_class') THEN
    CREATE INDEX idx_children_class ON public.children(class);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sessions_child_id') THEN
    CREATE INDEX idx_sessions_child_id ON public.sessions(child_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sessions_status') THEN
    CREATE INDEX idx_sessions_status ON public.sessions(status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sessions_created_at') THEN
    CREATE INDEX idx_sessions_created_at ON public.sessions(created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sessions_completed_at') THEN
    CREATE INDEX idx_sessions_completed_at ON public.sessions(completed_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_session_records_session_id') THEN
    CREATE INDEX idx_session_records_session_id ON public.session_records(session_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_session_records_stage_id') THEN
    CREATE INDEX idx_session_records_stage_id ON public.session_records(stage_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_session_records_event_type') THEN
    CREATE INDEX idx_session_records_event_type ON public.session_records(event_type);
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_records ENABLE ROW LEVEL SECURITY;

-- RLS is intentionally enabled here without broad default policies.
-- Apply the current access model from:
--   supabase/migrations/001-rls-policies.sql
-- Do not reintroduce policies that expose children with user_id IS NULL or allow
-- teachers to read every profile.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    CASE
      WHEN NEW.email LIKE '%@school.ru' THEN 'teacher'
      WHEN NEW.email LIKE '%@edu.ru' THEN 'teacher'
      WHEN NEW.email LIKE '%@teacher.ru' THEN 'teacher'
      ELSE 'student'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
