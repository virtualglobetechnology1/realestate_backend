-- ============================================================================
-- SocietySync Database Schema (PostgreSQL / MySQL Compatible DDL)
-- ============================================================================

-- 1. Societies Table
CREATE TABLE IF NOT EXISTS societies (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    total_wings INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Wings / Blocks Table
CREATE TABLE IF NOT EXISTS wings (
    id VARCHAR(36) PRIMARY KEY,
    society_id VARCHAR(36) NOT NULL,
    wing_name VARCHAR(50) NOT NULL, -- e.g. "Wing A", "Block B"
    total_floors INT NOT NULL DEFAULT 4,
    flats_per_floor INT NOT NULL DEFAULT 4,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    CONSTRAINT unique_wing_per_society UNIQUE (society_id, wing_name)
);

-- 3. Flats / Units Table
CREATE TABLE IF NOT EXISTS flats (
    id VARCHAR(36) PRIMARY KEY,
    wing_id VARCHAR(36) NOT NULL,
    flat_number VARCHAR(50) NOT NULL, -- e.g. "A-101", "B-402"
    floor_number INT NOT NULL,
    sq_ft DECIMAL(10, 2) DEFAULT 1000.00,
    occupancy_status VARCHAR(20) NOT NULL DEFAULT 'VACANT', -- 'VACANT', 'OCCUPIED_OWNER', 'OCCUPIED_TENANT'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wing_id) REFERENCES wings(id) ON DELETE CASCADE,
    CONSTRAINT unique_flat_per_wing UNIQUE (wing_id, flat_number)
);

-- 4. Users Table (Admins & Residents)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    society_id VARCHAR(36) NOT NULL,
    flat_id VARCHAR(36) NULL, -- Nullable for Global Admin or unassigned user
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(150) NULL,
    role VARCHAR(20) NOT NULL, -- 'ADMIN', 'RESIDENT'
    resident_type VARCHAR(20) DEFAULT 'OWNER', -- 'OWNER', 'TENANT'
    designation VARCHAR(100) DEFAULT 'Member', -- 'President', 'Secretary', 'Treasurer', 'Resident'
    parking_slot VARCHAR(50) DEFAULT 'N/A',
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL
);

-- 5. Visitor Passes Table
CREATE TABLE IF NOT EXISTS visitor_passes (
    id VARCHAR(36) PRIMARY KEY,
    flat_id VARCHAR(36) NOT NULL,
    created_by_user_id VARCHAR(36) NOT NULL,
    visitor_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    visitor_type VARCHAR(50) NOT NULL, -- 'GUEST', 'DELIVERY', 'CAB', 'SERVICE'
    pass_code VARCHAR(10) NOT NULL, -- 6-digit PIN / QR hash
    status VARCHAR(20) DEFAULT 'EXPECTED', -- 'EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED'
    entry_time TIMESTAMP NULL,
    exit_time TIMESTAMP NULL,
    valid_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Helpdesk Complaints / Tickets Table
CREATE TABLE IF NOT EXISTS helpdesk_tickets (
    id VARCHAR(36) PRIMARY KEY,
    society_id VARCHAR(36) NOT NULL,
    flat_id VARCHAR(36) NOT NULL,
    raised_by_user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'PLUMBING', 'ELECTRICAL', 'ELEVATOR', 'SECURITY', 'CLEANLINESS'
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    status VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    assigned_staff_name VARCHAR(150) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
    FOREIGN KEY (raised_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for Speed & Performance
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_society ON users(society_id);
CREATE INDEX idx_flats_wing ON flats(wing_id);
CREATE INDEX idx_visitor_passes_flat ON visitor_passes(flat_id);
CREATE INDEX idx_tickets_society ON helpdesk_tickets(society_id);
