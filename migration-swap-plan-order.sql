-- DB 트랜잭션 함수: 두 계획의 order_index를 안전하게 교환
-- 방안 1 구현을 위한 함수

CREATE OR REPLACE FUNCTION swap_plan_order(plan_id_1 UUID, plan_id_2 UUID)
RETURNS void AS $$
DECLARE
  order_1 INTEGER;
  order_2 INTEGER;
BEGIN
  -- 두 계획의 order_index 가져오기
  SELECT order_index INTO order_1 FROM plans WHERE id = plan_id_1;
  SELECT order_index INTO order_2 FROM plans WHERE id = plan_id_2;
  
  -- order_index가 NULL이거나 계획이 존재하지 않으면 에러
  IF order_1 IS NULL OR order_2 IS NULL THEN
    RAISE EXCEPTION 'One or both plans not found';
  END IF;
  
  -- order_index 교환 (트랜잭션으로 원자성 보장)
  UPDATE plans SET order_index = order_2 WHERE id = plan_id_1;
  UPDATE plans SET order_index = order_1 WHERE id = plan_id_2;
END;
$$ LANGUAGE plpgsql;

-- 사용 예시:
-- SELECT swap_plan_order('plan-uuid-1', 'plan-uuid-2');

