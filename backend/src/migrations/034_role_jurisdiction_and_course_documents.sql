-- Migration 034: Role Jurisdiction Scoping, Discipleship Chapter Documents & Devotional Manuals

-- 1. User & Department Jurisdiction Scoping
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_member ON users(member_id);
CREATE INDEX IF NOT EXISTS idx_departments_head_user ON departments(head_user_id);

-- 2. Discipleship Courses & Chapter Documents
ALTER TABLE discipleship_courses ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE discipleship_courses ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);

ALTER TABLE discipleship_lessons ADD COLUMN IF NOT EXISTS chapter_num INT;
ALTER TABLE discipleship_lessons ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE discipleship_lessons ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_disc_lessons_chapter ON discipleship_lessons(course_id, chapter_num);

-- 3. Daily Devotionals Manuals / Study Booklets
ALTER TABLE daily_devotionals ADD COLUMN IF NOT EXISTS manual_url TEXT;
ALTER TABLE daily_devotionals ADD COLUMN IF NOT EXISTS manual_name VARCHAR(255);
