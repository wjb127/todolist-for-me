-- 기존 ai_reports 테이블에 report_date 컬럼 추가 (이미 테이블이 있는 경우)
ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS report_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 기존 type UNIQUE 제약 제거 후 (type, report_date) 복합 UNIQUE로 변경
ALTER TABLE ai_reports DROP CONSTRAINT IF EXISTS ai_reports_type_key;
ALTER TABLE ai_reports ADD CONSTRAINT ai_reports_type_report_date_key UNIQUE (type, report_date);
