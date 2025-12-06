-- RLS 완전 잠금 마이그레이션
-- 이 스크립트는 모든 테이블에 RLS를 활성화하고 클라이언트 접근을 차단합니다.
-- 서버에서 SERVICE_ROLE_KEY를 사용하는 경우에만 접근 가능합니다.

-- 1. 모든 테이블에 RLS 활성화
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucketlist ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (존재하는 경우)
DROP POLICY IF EXISTS "Enable read for all" ON todos;
DROP POLICY IF EXISTS "Enable insert for all" ON todos;
DROP POLICY IF EXISTS "Enable update for all" ON todos;
DROP POLICY IF EXISTS "Enable delete for all" ON todos;
DROP POLICY IF EXISTS "Allow all" ON todos;

DROP POLICY IF EXISTS "Enable read for all" ON templates;
DROP POLICY IF EXISTS "Enable insert for all" ON templates;
DROP POLICY IF EXISTS "Enable update for all" ON templates;
DROP POLICY IF EXISTS "Enable delete for all" ON templates;
DROP POLICY IF EXISTS "Allow all" ON templates;

DROP POLICY IF EXISTS "Enable read for all" ON plans;
DROP POLICY IF EXISTS "Enable insert for all" ON plans;
DROP POLICY IF EXISTS "Enable update for all" ON plans;
DROP POLICY IF EXISTS "Enable delete for all" ON plans;
DROP POLICY IF EXISTS "Allow all" ON plans;

DROP POLICY IF EXISTS "Enable read for all" ON notes;
DROP POLICY IF EXISTS "Enable insert for all" ON notes;
DROP POLICY IF EXISTS "Enable update for all" ON notes;
DROP POLICY IF EXISTS "Enable delete for all" ON notes;
DROP POLICY IF EXISTS "Allow all" ON notes;

DROP POLICY IF EXISTS "Enable read for all" ON bucketlist;
DROP POLICY IF EXISTS "Enable insert for all" ON bucketlist;
DROP POLICY IF EXISTS "Enable update for all" ON bucketlist;
DROP POLICY IF EXISTS "Enable delete for all" ON bucketlist;
DROP POLICY IF EXISTS "Allow all" ON bucketlist;

-- 3. 모든 클라이언트 접근 차단 (anon 키로는 접근 불가)
-- RLS가 활성화되고 정책이 없으면 anon 키로는 접근 불가
-- service_role 키는 RLS를 무시하므로 서버에서는 접근 가능

-- 추가: 명시적으로 서비스 역할만 허용하는 정책 (선택 사항)
-- 이 정책들은 service_role이 아닌 역할의 접근을 명시적으로 거부합니다.

-- todos 테이블
CREATE POLICY "Deny anon access" ON todos
  FOR ALL
  TO anon
  USING (false);

CREATE POLICY "Deny authenticated access" ON todos
  FOR ALL
  TO authenticated
  USING (false);

-- templates 테이블
CREATE POLICY "Deny anon access" ON templates
  FOR ALL
  TO anon
  USING (false);

CREATE POLICY "Deny authenticated access" ON templates
  FOR ALL
  TO authenticated
  USING (false);

-- plans 테이블
CREATE POLICY "Deny anon access" ON plans
  FOR ALL
  TO anon
  USING (false);

CREATE POLICY "Deny authenticated access" ON plans
  FOR ALL
  TO authenticated
  USING (false);

-- notes 테이블
CREATE POLICY "Deny anon access" ON notes
  FOR ALL
  TO anon
  USING (false);

CREATE POLICY "Deny authenticated access" ON notes
  FOR ALL
  TO authenticated
  USING (false);

-- bucketlist 테이블
CREATE POLICY "Deny anon access" ON bucketlist
  FOR ALL
  TO anon
  USING (false);

CREATE POLICY "Deny authenticated access" ON bucketlist
  FOR ALL
  TO authenticated
  USING (false);

-- 완료!
-- 이제 NEXT_PUBLIC_SUPABASE_ANON_KEY로는 어떤 테이블도 접근할 수 없습니다.
-- 서버의 SUPABASE_SERVICE_ROLE_KEY만이 데이터베이스에 접근할 수 있습니다.

-- 환경변수 설정 필요:
-- .env.local에 다음을 추가하세요:
-- SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

-- Supabase 대시보드 > Project Settings > API > service_role key 에서 확인 가능
