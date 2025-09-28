-- Bulk update function for plan order_index increment
-- Run this in Supabase SQL Editor after other migrations

CREATE OR REPLACE FUNCTION increment_plan_order_index(plan_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE plans
  SET order_index = order_index + 1
  WHERE id = ANY(plan_ids);
END;
$$ LANGUAGE plpgsql;