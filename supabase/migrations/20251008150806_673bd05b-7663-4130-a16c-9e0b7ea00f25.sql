-- Migration: Backup regime_urbanistico_consolidado before 2025 update
-- Date: 2025-10-08
-- Purpose: Create backup table before importing updated data

-- Create backup table with all current data
CREATE TABLE IF NOT EXISTS regime_urbanistico_consolidado_backup_20251008 AS 
SELECT * FROM regime_urbanistico_consolidado;

-- Add comment to backup table
COMMENT ON TABLE regime_urbanistico_consolidado_backup_20251008 IS 
'Backup created on 2025-10-08 before importing updated regime urbanístico data';

-- Log the backup operation
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count FROM regime_urbanistico_consolidado;
  
  RAISE NOTICE 'Backup created: regime_urbanistico_consolidado_backup_20251008 with % records', record_count;
END $$;