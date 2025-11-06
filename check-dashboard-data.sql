-- ============================================
-- 대시보드 데이터 검증용 SQL 쿼리
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. 완료된 Todos 총 개수 (전체)
SELECT 
  COUNT(*) as total_completed_todos,
  COUNT(DISTINCT date) as unique_dates
FROM todos 
WHERE completed = true;

-- 2. 완료된 Plans 총 개수 (전체)
SELECT 
  COUNT(*) as total_completed_plans,
  COUNT(DISTINCT due_date) as unique_due_dates
FROM plans 
WHERE completed = true;

-- 3. 연도별 완료된 Todos 개수
SELECT 
  EXTRACT(YEAR FROM date::date) as year,
  COUNT(*) as completed_count,
  COUNT(DISTINCT date) as unique_dates
FROM todos 
WHERE completed = true
GROUP BY EXTRACT(YEAR FROM date::date)
ORDER BY year DESC;

-- 4. 연도별 완료된 Plans 개수
SELECT 
  EXTRACT(YEAR FROM due_date::date) as year,
  COUNT(*) as completed_count,
  COUNT(DISTINCT due_date) as unique_due_dates
FROM plans 
WHERE completed = true AND due_date IS NOT NULL
GROUP BY EXTRACT(YEAR FROM due_date::date)
ORDER BY year DESC;

-- 5. 2025년 완료된 Todos 상세 (월별)
SELECT 
  TO_CHAR(date::date, 'YYYY-MM') as month,
  COUNT(*) as completed_count,
  COUNT(DISTINCT date) as unique_dates
FROM todos 
WHERE completed = true 
  AND EXTRACT(YEAR FROM date::date) = 2025
GROUP BY TO_CHAR(date::date, 'YYYY-MM')
ORDER BY month;

-- 6. 2025년 완료된 Plans 상세 (월별)
SELECT 
  TO_CHAR(due_date::date, 'YYYY-MM') as month,
  COUNT(*) as completed_count,
  COUNT(DISTINCT due_date) as unique_due_dates
FROM plans 
WHERE completed = true 
  AND due_date IS NOT NULL
  AND EXTRACT(YEAR FROM due_date::date) = 2025
GROUP BY TO_CHAR(due_date::date, 'YYYY-MM')
ORDER BY month;

-- 7. 가장 많이 완료한 날짜 TOP 10 (Todos)
SELECT 
  date,
  COUNT(*) as completed_count,
  TO_CHAR(date::date, 'YYYY-MM-DD (Day)') as formatted_date
FROM todos 
WHERE completed = true
GROUP BY date
ORDER BY completed_count DESC, date DESC
LIMIT 10;

-- 8. 가장 많이 완료한 날짜 TOP 10 (Plans)
SELECT 
  due_date,
  COUNT(*) as completed_count,
  TO_CHAR(due_date::date, 'YYYY-MM-DD (Day)') as formatted_date
FROM plans 
WHERE completed = true AND due_date IS NOT NULL
GROUP BY due_date
ORDER BY completed_count DESC, due_date DESC
LIMIT 10;

-- 9. 전체 Todos 통계 (완료/미완료 비교)
SELECT 
  completed,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM todos
GROUP BY completed;

-- 10. 전체 Plans 통계 (완료/미완료 비교)
SELECT 
  completed,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM plans
GROUP BY completed;

-- 11. 최근 7일간 완료된 Todos
SELECT 
  date,
  COUNT(*) as completed_count
FROM todos 
WHERE completed = true
  AND date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;

-- 12. 최근 7일간 완료된 Plans
SELECT 
  due_date,
  COUNT(*) as completed_count
FROM plans 
WHERE completed = true 
  AND due_date IS NOT NULL
  AND due_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY due_date
ORDER BY due_date DESC;

-- 13. 연속 달성 확인용 (최근 30일 Todos)
SELECT 
  date,
  COUNT(*) as completed_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅'
    ELSE '❌'
  END as has_completion
FROM todos 
WHERE completed = true
  AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- 14. 데이터 무결성 체크 (이상한 날짜 확인)
SELECT 
  'todos' as table_name,
  COUNT(*) as future_dates_count
FROM todos 
WHERE date > CURRENT_DATE
UNION ALL
SELECT 
  'plans' as table_name,
  COUNT(*) as future_dates_count
FROM plans 
WHERE due_date > CURRENT_DATE;

-- 15. 템플릿 기반 Todos vs 수동 Todos
SELECT 
  CASE 
    WHEN template_id IS NOT NULL THEN 'Template-based'
    ELSE 'Manual'
  END as todo_type,
  COUNT(*) as total_count,
  SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_count,
  ROUND(SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_rate
FROM todos
GROUP BY 
  CASE 
    WHEN template_id IS NOT NULL THEN 'Template-based'
    ELSE 'Manual'
  END;

-- ============================================
-- 추가: 대시보드 표시 제한 확인용
-- (실제로 1000개 제한이 걸리는지 확인)
-- ============================================

-- 16. 2025년 완료된 Todos를 1001개 가져오기 시도
SELECT 
  date,
  COUNT(*) OVER () as total_rows
FROM todos 
WHERE completed = true 
  AND EXTRACT(YEAR FROM date::date) = 2025
LIMIT 1001;

-- 17. Row Level Security (RLS) 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('todos', 'plans')
ORDER BY tablename, policyname;
