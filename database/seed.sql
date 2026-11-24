-- ============================================================================
-- SocietySync Database Seed Data (Sample Society, Wings, Flats, Admin & Users)
-- ============================================================================

-- 1. Insert Sample Society: Green Valley Heights
INSERT INTO societies (id, name, registration_number, address, city, state, pincode, total_wings)
VALUES (
    'soc-101',
    'Green Valley Heights',
    'REG-2026-GVH-099',
    'Plot 42, Palm Avenue, Sector 15',
    'Mumbai',
    'Maharashtra',
    '400001',
    3
) ON CONFLICT DO NOTHING;

-- 2. Insert Wings (Wing A, Wing B, Wing C)
INSERT INTO wings (id, society_id, wing_name, total_floors, flats_per_floor)
VALUES 
    ('wing-a', 'soc-101', 'Wing A', 4, 4),
    ('wing-b', 'soc-101', 'Wing B', 4, 4),
    ('wing-c', 'soc-101', 'Wing C', 4, 4)
ON CONFLICT DO NOTHING;

-- 3. Insert Sample Flats for Wing A
INSERT INTO flats (id, wing_id, flat_number, floor_number, sq_ft, occupancy_status)
VALUES 
    ('flat-a101', 'wing-a', 'A-101', 1, 1200.00, 'OCCUPIED_OWNER'),
    ('flat-a102', 'wing-a', 'A-102', 1, 1200.00, 'OCCUPIED_TENANT'),
    ('flat-a103', 'wing-a', 'A-103', 1, 1000.00, 'VACANT'),
    ('flat-a104', 'wing-a', 'A-104', 1, 1000.00, 'VACANT'),
    ('flat-a201', 'wing-a', 'A-201', 2, 1200.00, 'OCCUPIED_OWNER'),
    ('flat-a202', 'wing-a', 'A-202', 2, 1200.00, 'VACANT'),
    ('flat-a203', 'wing-a', 'A-203', 2, 1000.00, 'VACANT'),
    ('flat-a204', 'wing-a', 'A-204', 2, 1000.00, 'VACANT')
ON CONFLICT DO NOTHING;

-- 4. Insert Admin User (Phone: 9876543210 / Password: password123)
INSERT INTO users (id, society_id, flat_id, full_name, phone_number, password_hash, email, role, resident_type, designation, parking_slot, status)
VALUES (
    'usr-admin-01',
    'soc-101',
    'flat-a101',
    'Rajesh Kumar (Admin)',
    '9876543210',
    '$2b$10$e8T.uK0ZkE500aP7aG47dO3K9Z9XJ/2t78k1A/u2eZ1xZ.d8A7B2C', -- bcrypt hash for 'password123'
    'admin@greenvalley.com',
    'ADMIN',
    'OWNER',
    'President',
    'P-01',
    'ACTIVE'
) ON CONFLICT DO NOTHING;

-- 5. Insert Resident Users (Phone: 9123456789 / Password: password123)
INSERT INTO users (id, society_id, flat_id, full_name, phone_number, password_hash, email, role, resident_type, designation, parking_slot, status)
VALUES 
    (
        'usr-res-01',
        'soc-101',
        'flat-a102',
        'Priya Sharma (Resident)',
        '9123456789',
        '$2b$10$e8T.uK0ZkE500aP7aG47dO3K9Z9XJ/2t78k1A/u2eZ1xZ.d8A7B2C',
        'priya.sharma@gmail.com',
        'RESIDENT',
        'TENANT',
        'Resident',
        'P-08',
        'ACTIVE'
    ),
    (
        'usr-res-02',
        'soc-101',
        'flat-a201',
        'Amitabh Verma',
        '9988776655',
        '$2b$10$e8T.uK0ZkE500aP7aG47dO3K9Z9XJ/2t78k1A/u2eZ1xZ.d8A7B2C',
        'averma@outlook.com',
        'RESIDENT',
        'OWNER',
        'Committee Member',
        'P-12',
        'ACTIVE'
    )
ON CONFLICT DO NOTHING;

-- 6. Insert Visitor Passes
INSERT INTO visitor_passes (id, flat_id, created_by_user_id, visitor_name, phone_number, visitor_type, pass_code, status, valid_until)
VALUES (
    'vp-001',
    'flat-a102',
    'usr-res-01',
    'Swiggy Delivery - Rohan',
    '9800011122',
    'DELIVERY',
    '482910',
    'EXPECTED',
    CURRENT_TIMESTAMP + INTERVAL '4 hours'
) ON CONFLICT DO NOTHING;

-- 7. Insert Helpdesk Ticket
INSERT INTO helpdesk_tickets (id, society_id, flat_id, raised_by_user_id, title, description, category, priority, status)
VALUES (
    'tkt-001',
    'soc-101',
    'flat-a102',
    'usr-res-01',
    'Water Leakage in Bathroom Ceiling',
    'Main pipe above flat A-102 is dripping slowly onto ceiling tiles.',
    'PLUMBING',
    'HIGH',
    'OPEN'
) ON CONFLICT DO NOTHING;
