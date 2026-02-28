-- 계획에 시간 배치 기능을 위한 컬럼 추가
-- scheduled_start, scheduled_end: "HH:MM" 형식의 TEXT
-- Supabase SQL Editor에서 실행

ALTER TABLE plans
ADD COLUMN scheduled_start TEXT,
ADD COLUMN scheduled_end TEXT;
