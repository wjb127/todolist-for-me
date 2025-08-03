-- 계획 트리 구조를 위한 마이그레이션
-- 기존 plans 테이블에 parent_id와 관련 컬럼 추가

-- 1. parent_id 컬럼 추가 (자기 참조 외래 키)
ALTER TABLE plans 
ADD COLUMN parent_id UUID REFERENCES plans(id) ON DELETE CASCADE;

-- 2. 트리 구조 관련 컬럼 추가
ALTER TABLE plans 
ADD COLUMN depth INTEGER DEFAULT 0,
ADD COLUMN is_expanded BOOLEAN DEFAULT true;

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX idx_plans_parent_id ON plans(parent_id);
CREATE INDEX idx_plans_depth ON plans(depth);

-- 4. 기존 데이터는 모두 최상위 레벨(depth=0, parent_id=NULL)로 유지됨
-- 별도의 데이터 마이그레이션 불필요

-- 5. 부모-자식 관계 무결성을 위한 함수 (순환 참조 방지)
CREATE OR REPLACE FUNCTION check_plan_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  current_id UUID;
  max_depth INTEGER := 4; -- 최대 깊이 제한
  current_depth INTEGER := 0;
BEGIN
  -- NULL parent_id는 허용 (최상위 레벨)
  IF NEW.parent_id IS NULL THEN
    NEW.depth := 0;
    RETURN NEW;
  END IF;
  
  -- 자기 자신을 부모로 설정 방지
  IF NEW.id = NEW.parent_id THEN
    RAISE EXCEPTION 'A plan cannot be its own parent';
  END IF;
  
  -- 순환 참조 검사 및 깊이 계산
  current_id := NEW.parent_id;
  WHILE current_id IS NOT NULL AND current_depth < max_depth LOOP
    current_depth := current_depth + 1;
    
    -- 순환 참조 체크
    IF current_id = NEW.id THEN
      RAISE EXCEPTION 'Circular reference detected in plan hierarchy';
    END IF;
    
    -- 부모의 부모 찾기
    SELECT parent_id INTO current_id FROM plans WHERE id = current_id;
  END LOOP;
  
  -- 최대 깊이 체크
  IF current_depth >= max_depth THEN
    RAISE EXCEPTION 'Maximum hierarchy depth (%) exceeded', max_depth;
  END IF;
  
  -- 깊이 설정
  NEW.depth := current_depth;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 트리거 생성
CREATE TRIGGER check_plan_hierarchy_trigger
BEFORE INSERT OR UPDATE OF parent_id ON plans
FOR EACH ROW
EXECUTE FUNCTION check_plan_hierarchy();

-- 7. 하위 계획들의 order_index를 부모별로 관리하기 위한 함수
CREATE OR REPLACE FUNCTION update_child_order_index()
RETURNS TRIGGER AS $$
BEGIN
  -- 새로운 하위 계획 추가 시 해당 부모의 마지막 order_index 할당
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    SELECT COALESCE(MAX(order_index), -1) + 1 INTO NEW.order_index
    FROM plans 
    WHERE parent_id = NEW.parent_id OR (parent_id IS NULL AND NEW.parent_id IS NULL);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. order_index 자동 설정 트리거
CREATE TRIGGER update_child_order_index_trigger
BEFORE INSERT ON plans
FOR EACH ROW
EXECUTE FUNCTION update_child_order_index();

-- 9. 계획 이동 시 order_index 재정렬을 위한 함수
CREATE OR REPLACE FUNCTION reorder_plan_siblings(
  plan_id UUID,
  new_parent_id UUID,
  new_order_index INTEGER
)
RETURNS VOID AS $$
DECLARE
  old_parent_id UUID;
  old_order_index INTEGER;
BEGIN
  -- 현재 계획의 정보 가져오기
  SELECT parent_id, order_index INTO old_parent_id, old_order_index
  FROM plans WHERE id = plan_id;
  
  -- 같은 부모 내에서 이동하는 경우
  IF old_parent_id IS NOT DISTINCT FROM new_parent_id THEN
    -- 이동 방향에 따라 다른 계획들의 order_index 조정
    IF new_order_index > old_order_index THEN
      UPDATE plans 
      SET order_index = order_index - 1
      WHERE parent_id IS NOT DISTINCT FROM new_parent_id
        AND order_index > old_order_index 
        AND order_index <= new_order_index
        AND id != plan_id;
    ELSE
      UPDATE plans 
      SET order_index = order_index + 1
      WHERE parent_id IS NOT DISTINCT FROM new_parent_id
        AND order_index >= new_order_index 
        AND order_index < old_order_index
        AND id != plan_id;
    END IF;
  ELSE
    -- 다른 부모로 이동하는 경우
    -- 이전 부모의 다른 자식들 order_index 조정
    UPDATE plans 
    SET order_index = order_index - 1
    WHERE parent_id IS NOT DISTINCT FROM old_parent_id
      AND order_index > old_order_index;
    
    -- 새 부모의 자식들 order_index 조정
    UPDATE plans 
    SET order_index = order_index + 1
    WHERE parent_id IS NOT DISTINCT FROM new_parent_id
      AND order_index >= new_order_index;
  END IF;
  
  -- 계획 업데이트
  UPDATE plans 
  SET parent_id = new_parent_id, order_index = new_order_index
  WHERE id = plan_id;
END;
$$ LANGUAGE plpgsql;