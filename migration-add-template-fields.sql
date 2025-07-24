-- Add new fields to templates table for template application functionality
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS applied_from_date DATE;

-- Update updated_at timestamp
UPDATE templates SET updated_at = NOW() WHERE id IS NOT NULL;