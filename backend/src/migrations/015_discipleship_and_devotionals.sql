-- Migration 015: Discipleship Training School and Daily Devotionals System

-- 1. Discipleship Courses / Programs
CREATE TABLE IF NOT EXISTS discipleship_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  category VARCHAR(100) DEFAULT 'foundation', -- 'foundation', 'discipleship', 'leadership', 'workers', 'bible_study'
  level VARCHAR(50) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  cover_image_url TEXT,
  instructor_name VARCHAR(255),
  duration_weeks INT DEFAULT 4,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Discipleship Lessons / Modules
CREATE TABLE IF NOT EXISTS discipleship_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES discipleship_courses(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  scripture_references TEXT,
  video_url TEXT,
  audio_url TEXT,
  order_num INT DEFAULT 1,
  duration_minutes INT DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Member Course Enrollments
CREATE TABLE IF NOT EXISTS discipleship_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES discipleship_courses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'dropped'
  progress_percent INT DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  certificate_code VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, member_id)
);

-- 4. Member Lesson Progress
CREATE TABLE IF NOT EXISTS discipleship_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES discipleship_enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES discipleship_lessons(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  reflection_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_id)
);

-- 5. Daily Devotionals
CREATE TABLE IF NOT EXISTS daily_devotionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  theme_scripture VARCHAR(255) NOT NULL,
  scripture_text TEXT,
  content TEXT NOT NULL,
  confession TEXT,
  prayer_point TEXT,
  bible_reading_plan VARCHAR(255),
  author VARCHAR(255),
  is_published BOOLEAN DEFAULT true,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, date)
);

-- 6. Member Devotional Reads & Bookmarks
CREATE TABLE IF NOT EXISTS devotional_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  devotional_id UUID NOT NULL REFERENCES daily_devotionals(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(devotional_id, member_id)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_disc_courses_church ON discipleship_courses(church_id);
CREATE INDEX IF NOT EXISTS idx_disc_lessons_course ON discipleship_lessons(course_id, order_num);
CREATE INDEX IF NOT EXISTS idx_disc_enroll_member ON discipleship_enrollments(member_id, status);
CREATE INDEX IF NOT EXISTS idx_disc_prog_enroll ON discipleship_lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_devotionals_church_date ON daily_devotionals(church_id, date);
