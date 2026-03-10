-- AI 리포트 저장 테이블
CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,  -- weekly, routine, trend, plans, priority, deadline
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL DEFAULT '',
  stats JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, report_date)
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_ai_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_reports_updated_at
  BEFORE UPDATE ON ai_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_reports_updated_at();

-- RLS 비활성화 (개인용 앱)
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on ai_reports" ON ai_reports FOR ALL USING (true) WITH CHECK (true);
