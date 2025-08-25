-- 버킷리스트 테이블 생성
CREATE TABLE IF NOT EXISTS bucketlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id UUID REFERENCES bucketlist(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general', -- 카테고리: travel, career, health, hobby, relationship, financial, learning, experience, etc
    target_date DATE, -- 목표 달성 날짜
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    depth INTEGER DEFAULT 0, -- 트리 깊이 (0: 최상위, 1: 첫번째 하위, ...)
    order_index INTEGER DEFAULT 0, -- 같은 부모 내에서의 순서
    is_expanded BOOLEAN DEFAULT TRUE, -- UI에서 펼침/접기 상태
    notes TEXT, -- 추가 메모
    tags TEXT[], -- 태그 배열
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100), -- 진행률 (0-100%)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_bucketlist_parent_id ON bucketlist(parent_id);
CREATE INDEX idx_bucketlist_order_index ON bucketlist(order_index);
CREATE INDEX idx_bucketlist_completed ON bucketlist(completed);
CREATE INDEX idx_bucketlist_category ON bucketlist(category);
CREATE INDEX idx_bucketlist_target_date ON bucketlist(target_date);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_bucketlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bucketlist_updated_at
    BEFORE UPDATE ON bucketlist
    FOR EACH ROW
    EXECUTE FUNCTION update_bucketlist_updated_at();

-- 부모 완료 시 자식도 완료하는 트리거 (선택적)
CREATE OR REPLACE FUNCTION complete_child_bucketlist()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed = TRUE AND OLD.completed = FALSE THEN
        UPDATE bucketlist 
        SET completed = TRUE, 
            completed_at = CURRENT_TIMESTAMP
        WHERE parent_id = NEW.id AND completed = FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_complete_child_bucketlist
    AFTER UPDATE OF completed ON bucketlist
    FOR EACH ROW
    EXECUTE FUNCTION complete_child_bucketlist();

-- depth 자동 계산 트리거
CREATE OR REPLACE FUNCTION calculate_bucketlist_depth()
RETURNS TRIGGER AS $$
DECLARE
    parent_depth INTEGER;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.depth = 0;
    ELSE
        SELECT depth INTO parent_depth FROM bucketlist WHERE id = NEW.parent_id;
        NEW.depth = parent_depth + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_bucketlist_depth
    BEFORE INSERT OR UPDATE OF parent_id ON bucketlist
    FOR EACH ROW
    EXECUTE FUNCTION calculate_bucketlist_depth();

-- RLS (Row Level Security) 정책 설정
ALTER TABLE bucketlist ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 모든 버킷리스트를 볼 수 있도록 설정 (개인 프로젝트이므로)
CREATE POLICY "Enable all operations for all users" ON bucketlist
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 샘플 데이터 삽입 (선택사항)
INSERT INTO bucketlist (title, description, category, priority, order_index) VALUES
('인생 목표', '평생 이루고 싶은 큰 목표들', 'general', 'high', 0),
('여행', '가보고 싶은 곳들', 'travel', 'medium', 1),
('커리어', '직업적 성취 목표', 'career', 'high', 2),
('건강', '건강 관련 목표', 'health', 'high', 3),
('취미', '배우고 싶거나 해보고 싶은 취미', 'hobby', 'medium', 4);

-- 하위 항목 샘플
INSERT INTO bucketlist (parent_id, title, description, category, priority, order_index, target_date) 
VALUES
((SELECT id FROM bucketlist WHERE title = '여행' LIMIT 1), '유럽 여행', '유럽 5개국 방문', 'travel', 'high', 0, '2025-12-31'),
((SELECT id FROM bucketlist WHERE title = '여행' LIMIT 1), '일본 오사카', '오사카 맛집 투어', 'travel', 'medium', 1, '2025-06-30'),
((SELECT id FROM bucketlist WHERE title = '커리어' LIMIT 1), '연봉 1억 달성', '연봉 1억원 달성하기', 'career', 'high', 0, '2027-12-31'),
((SELECT id FROM bucketlist WHERE title = '건강' LIMIT 1), '마라톤 완주', '풀코스 마라톤 완주하기', 'health', 'high', 0, '2026-10-31'),
((SELECT id FROM bucketlist WHERE title = '취미' LIMIT 1), '기타 배우기', '좋아하는 곡 10개 연주하기', 'hobby', 'medium', 0, '2025-12-31');