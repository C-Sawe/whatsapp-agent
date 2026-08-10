-- ==============================================================================
-- Mosop Farm Inputs - PostgreSQL RLS Migration
-- ==============================================================================

-- 1. Enable Row-Level Security on all critical tables
ALTER TABLE live_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_debt ENABLE ROW LEVEL SECURITY;

-- 2. Create isolation policies based on app.store_id session variable
-- We assume current_setting('app.store_id', true) will return 'all' for admin, or an integer for a specific store.
-- The `true` parameter makes it return NULL instead of throwing an error if it's missing.

-- live_inventory Policy
DROP POLICY IF EXISTS tenant_isolation_inventory ON live_inventory;
CREATE POLICY tenant_isolation_inventory ON live_inventory
FOR ALL
USING (
    current_setting('app.store_id', true) = 'all' OR
    store_id = NULLIF(current_setting('app.store_id', true), '')::int
);

-- sales_analytics Policy
DROP POLICY IF EXISTS tenant_isolation_sales ON sales_analytics;
CREATE POLICY tenant_isolation_sales ON sales_analytics
FOR ALL
USING (
    current_setting('app.store_id', true) = 'all' OR
    store_id = NULLIF(current_setting('app.store_id', true), '')::int
);

-- customer_debt Policy
-- Note: customer_debt does not have a store_id column. It is shared across stores.
-- However, we still enforce an RLS policy that requires a valid session to access it,
-- or we can restrict it to admin-only.
DROP POLICY IF EXISTS tenant_isolation_debt ON customer_debt;
CREATE POLICY tenant_isolation_debt ON customer_debt
FOR ALL
USING (
    -- Either admin can view, or any valid store user can view (since they share customers).
    current_setting('app.store_id', true) = 'all' OR
    current_setting('app.store_id', true) != ''
);
