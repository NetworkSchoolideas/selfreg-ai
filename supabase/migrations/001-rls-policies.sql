-- Enable RLS on all tables
ALTER TABLE IF EXISTS children ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Teachers Table Policies
-- ============================================

-- Teachers can view their own record
CREATE POLICY "Teachers can view own record"
  ON teachers
  FOR SELECT
  USING (auth.uid() = id);

-- Teachers can update their own record
CREATE POLICY "Teachers can update own record"
  ON teachers
  FOR UPDATE
  USING (auth.uid() = id);

-- Teachers can insert their own record during registration
CREATE POLICY "Teachers can insert own record"
  ON teachers
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- Children Table Policies
-- ============================================

-- Students can view their own record
CREATE POLICY "Students can view own record"
  ON children
  FOR SELECT
  USING (auth.uid() = id);

-- Students can update their own record
CREATE POLICY "Students can update own record"
  ON children
  FOR UPDATE
  USING (auth.uid() = id);

-- Students can insert their own record during registration
CREATE POLICY "Students can insert own record"
  ON children
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Teachers can view their own students
CREATE POLICY "Teachers can view own students"
  ON children
  FOR SELECT
  USING (teacher_id = auth.uid());

-- Teachers can update their own students
CREATE POLICY "Teachers can update own students"
  ON children
  FOR UPDATE
  USING (teacher_id = auth.uid());

-- Teachers can insert students (via join-teacher flow)
CREATE POLICY "Teachers can insert students"
  ON children
  FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their own students
CREATE POLICY "Teachers can delete own students"
  ON children
  FOR DELETE
  USING (teacher_id = auth.uid());

-- ============================================
-- Sessions Table Policies
-- ============================================

-- Students can view their own sessions
CREATE POLICY "Students can view own sessions"
  ON sessions
  FOR SELECT
  USING (child_id = auth.uid());

-- Students can insert their own sessions
CREATE POLICY "Students can insert own sessions"
  ON sessions
  FOR INSERT
  WITH CHECK (child_id = auth.uid());

-- Teachers can view sessions of their students
CREATE POLICY "Teachers can view student sessions"
  ON sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = sessions.child_id
      AND children.teacher_id = auth.uid()
    )
  );

-- Teachers can insert sessions for their students
CREATE POLICY "Teachers can insert student sessions"
  ON sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = sessions.child_id
      AND children.teacher_id = auth.uid()
    )
  );

-- Teachers can update sessions of their students
CREATE POLICY "Teachers can update student sessions"
  ON sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = sessions.child_id
      AND children.teacher_id = auth.uid()
    )
  );

-- Teachers can delete sessions of their students
CREATE POLICY "Teachers can delete student sessions"
  ON sessions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = sessions.child_id
      AND children.teacher_id = auth.uid()
    )
  );

-- ============================================
-- Helper Functions
-- ============================================

-- Function to check if user is a teacher
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teachers
    WHERE teachers.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is a student
CREATE OR REPLACE FUNCTION is_student()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM children
    WHERE children.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get student's teacher ID
CREATE OR REPLACE FUNCTION get_student_teacher_id(student_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT teacher_id FROM children
    WHERE children.id = student_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;