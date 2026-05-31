-- ============================================
-- SelfReg AI - Supabase Database Schema
-- ============================================
-- Idempotent script - safe to run multiple times
-- Drops existing objects before recreating
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Drop existing policies (if they exist)
-- ============================================

-- Children policies
DROP POLICY IF EXISTS "Users can view their own children" ON public.children;
DROP POLICY IF EXISTS "Users can create their own children" ON public.children;
DROP POLICY IF EXISTS "Users can update their own children" ON public.children;
DROP POLICY IF EXISTS "Users can delete their own children" ON public.children;

-- Sessions policies
DROP POLICY IF EXISTS "Users can view sessions for their children" ON public.sessions;
DROP POLICY IF EXISTS "Users can create sessions for their children" ON public.sessions;
DROP POLICY IF EXISTS "Users can update sessions for their children" ON public.sessions;

-- Session Records policies
DROP POLICY IF EXISTS "Users can view session records for their sessions" ON public.session_records;
DROP POLICY IF EXISTS "Users can create session records for their sessions" ON public.session_records;

-- ============================================
-- Drop existing triggers (if they exist)
-- ============================================

DROP TRIGGER IF EXISTS handle_children_updated_at ON public.children;
DROP TRIGGER IF EXISTS handle_sessions_updated_at ON public.sessions;

-- ============================================
-- Drop existing function (if it exists)
-- ============================================

DROP FUNCTION IF EXISTS public.handle_updated_at();

-- ============================================
-- Drop existing tables (CASCADE drops dependent objects)
-- WARNING: This will delete all data!
-- Uncomment if you want to recreate tables from scratch
-- ============================================

-- DROP TABLE IF EXISTS public.session_records CASCADE;
-- DROP TABLE IF EXISTS public.sessions CASCADE;
-- DROP TABLE IF EXISTS public.children CASCADE;

-- ============================================
-- Table: profiles (NEW - for user roles)
-- ============================================
-- Stores user roles and metadata after authentication
-- ============================================

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

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'profiles' AND indexname = 'idx_profiles_email') THEN
    CREATE INDEX idx_profiles_email ON public.profiles(email);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'profiles' AND indexname = 'idx_profiles_role') THEN
    CREATE INDEX idx_profiles_role ON public.profiles(role);
  END IF;
END $$;

-- ============================================
-- Table: children
-- ============================================
-- Stores adolescent profiles
-- ============================================
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'children' AND indexname = 'idx_children_user_id') THEN
    CREATE INDEX idx_children_user_id ON public.children(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'children' AND indexname = 'idx_children_name') THEN
    CREATE INDEX idx_children_name ON public.children(name);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'children' AND indexname = 'idx_children_class') THEN
    CREATE INDEX idx_children_class ON public.children(class);
  END IF;
END $$;

-- ============================================
-- Table: sessions
-- ============================================
-- Stores self-regulation session data
-- ============================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  context TEXT NOT NULL,
  final_note TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'sessions' AND indexname = 'idx_sessions_child_id') THEN
    CREATE INDEX idx_sessions_child_id ON public.sessions(child_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'sessions' AND indexname = 'idx_sessions_status') THEN
    CREATE INDEX idx_sessions_status ON public.sessions(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'sessions' AND indexname = 'idx_sessions_created_at') THEN
    CREATE INDEX idx_sessions_created_at ON public.sessions(created_at DESC);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'sessions' AND indexname = 'idx_sessions_completed_at') THEN
    CREATE INDEX idx_sessions_completed_at ON public.sessions(completed_at DESC);
  END IF;
END $$;

-- ============================================
-- Table: session_records
-- ============================================
-- Stores individual records for each of the 5 stages
-- ============================================
CREATE TABLE IF NOT EXISTS public.session_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  stage_id INTEGER NOT NULL CHECK (stage_id >= 1 AND stage_id <= 5),
  stage_title TEXT NOT NULL,
  scenario TEXT NOT NULL,
  feedback TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'session_records' AND indexname = 'idx_session_records_session_id') THEN
    CREATE INDEX idx_session_records_session_id ON public.session_records(session_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'session_records' AND indexname = 'idx_session_records_stage_id') THEN
    CREATE INDEX idx_session_records_stage_id ON public.session_records(stage_id);
  END IF;
END $$;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_records ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Profiles Policies
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile (trigger will handle this)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Teachers can view all profiles (for admin purposes)
-- This will be refined based on your specific needs
CREATE POLICY "Teachers can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- ============================================
-- Children Policies
-- ============================================

CREATE POLICY "Users can view their own children"
  ON public.children
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own children"
  ON public.children
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own children"
  ON public.children
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own children"
  ON public.children
  FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- Sessions Policies
-- ============================================

CREATE POLICY "Users can view sessions for their children"
  ON public.sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = sessions.child_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sessions for their children"
  ON public.sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = child_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sessions for their children"
  ON public.sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = sessions.child_id
      AND children.user_id = auth.uid()
    )
  );

-- ============================================
-- Session Records Policies
-- ============================================

CREATE POLICY "Users can view session records for their sessions"
  ON public.session_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      JOIN public.children ON children.id = sessions.child_id
      WHERE sessions.id = session_records.session_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create session records for their sessions"
  ON public.session_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      JOIN public.children ON children.id = sessions.child_id
      WHERE sessions.id = session_id
      AND children.user_id = auth.uid()
    )
  );

-- ============================================
-- Triggers for automatic profile creation
-- ============================================

-- Function to create profile on user signup
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

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Helper Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for children table
CREATE TRIGGER handle_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for sessions table
CREATE TRIGGER handle_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Public Access Policy (Optional - for demo/anonymous access)
-- ============================================
-- Uncomment these if you want to allow anonymous access for demo purposes
-- WARNING: This bypasses authentication requirements

-- CREATE POLICY "Enable read access for all users"
--   ON public.children
--   FOR SELECT
--   USING (true);

-- CREATE POLICY "Enable insert access for all users"
--   ON public.children
--   FOR INSERT
--   WITH CHECK (true);

-- CREATE POLICY "Enable read access for all users"
--   ON public.sessions
--   FOR SELECT
--   USING (true);

-- CREATE POLICY "Enable read access for all users"
--   ON public.session_records
--   FOR SELECT
--   USING (true);

-- ============================================
-- End of Schema
-- ============================================
