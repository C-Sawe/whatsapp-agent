-- ==============================================================================
-- Mosop Farm Inputs - PostgreSQL Stocktake Schema Migration
-- ==============================================================================

-- 1. Users Table (for Employee authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'EMPLOYEE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inventory Sessions Table
CREATE TABLE IF NOT EXISTS inventory_sessions (
    session_id SERIAL PRIMARY KEY,
    store_id INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    name VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    closed_at TIMESTAMP NULL,
    allow_live_sales BOOLEAN DEFAULT FALSE
);

-- 3. Inventory Counts Table
CREATE TABLE IF NOT EXISTS inventory_counts (
    count_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES inventory_sessions(session_id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    counted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(id) ON DELETE SET NULL
);

-- Recommended Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_counts_session ON inventory_counts(session_id);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_sku ON inventory_counts(sku);

-- Apply Row-Level Security if needed (for now, admin can see all, employees see what they scan or are restricted via backend)
-- No explicit RLS is strictly required for counts right now as the backend logic tightly controls access,
-- but we will enable it to match the existing architecture.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;

-- Allow all for these tables (or rely on admin bypass)
DROP POLICY IF EXISTS tenant_isolation_users ON users;
CREATE POLICY tenant_isolation_users ON users FOR ALL USING (true);

DROP POLICY IF EXISTS tenant_isolation_sessions ON inventory_sessions;
CREATE POLICY tenant_isolation_sessions ON inventory_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS tenant_isolation_counts ON inventory_counts;
CREATE POLICY tenant_isolation_counts ON inventory_counts FOR ALL USING (true);
