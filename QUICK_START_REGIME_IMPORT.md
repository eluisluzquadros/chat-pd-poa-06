# Quick Start: Import All 94 Porto Alegre Neighborhoods

## ✅ Status: Ready to Import

All 94 neighborhoods from Porto Alegre have been successfully extracted from the `document_rows` table with dataset ID `17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk`.

## 🚀 Option 1: Create New Raw Table (RECOMMENDED)

### Step 1: Create the Table
Go to Supabase Dashboard > SQL Editor and execute:
```sql
-- Copy and paste the entire content from create-regime-raw-table.sql
```

### Step 2: Import All Data
```bash
node extract-all-94-neighborhoods-final.mjs
```

**Result**: All 94 neighborhoods with complete original data preserved as TEXT.

## ⚡ Option 2: Quick Fix Existing Table

### Step 1: Fix Data Types
```sql
ALTER TABLE regime_urbanistico 
ALTER COLUMN recuo_lateral_m TYPE TEXT,
ALTER COLUMN recuo_fundos_m TYPE TEXT;
```

### Step 2: Import
```bash
node extract-with-existing-table.mjs
```

**Result**: 85 additional neighborhoods (for 96 total) with some data simplified.

## 📋 Current Status

- **Found in document_rows**: 94 neighborhoods ✅
- **Currently in regime_urbanistico**: 11 neighborhoods  
- **Ready to import**: 83-85 additional neighborhoods
- **Data completeness**: 100% - all fields available

## 📄 Files Created

1. **`create-regime-raw-table.sql`** - Complete table structure for raw data
2. **`extract-all-94-neighborhoods-final.mjs`** - Import script for raw table
3. **`extract-with-existing-table.mjs`** - Import script for existing table
4. **`REGIME_URBANISTICO_EXTRACTION_REPORT.md`** - Detailed technical report

## 🎯 Recommendation

Use **Option 1** to create the `regime_urbanistico_raw` table. This preserves all original data including complex setback rules like "18% da altura total desde o RN, aplicável acima de 12,5 m" which cannot be stored as simple numeric values.

---

**Next Step**: Choose an option and execute the SQL + script to get all 94 neighborhoods imported!