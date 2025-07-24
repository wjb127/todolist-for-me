-- Add order_index field to plans table for drag and drop functionality
ALTER TABLE plans ADD COLUMN order_index INTEGER DEFAULT 0;

-- Update existing plans with order_index based on created_at
UPDATE plans 
SET order_index = sub.row_number 
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as row_number 
  FROM plans
) sub 
WHERE plans.id = sub.id;