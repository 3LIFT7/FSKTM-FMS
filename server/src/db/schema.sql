-- =========================================================================
-- FSKTM INTEGRATED FACILITY BOOKING & MAINTENANCE MANAGEMENT SYSTEM
-- PostgreSQL / PGlite Unified Schema
-- =========================================================================

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'lecturer', 'technician', 'manager')),
    matric_or_staff_id VARCHAR(100),
    department VARCHAR(255),
    specialization VARCHAR(50),
    auth_provider VARCHAR(50) DEFAULT 'local',
    password_set BOOLEAN DEFAULT TRUE,
    reset_token_hash VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    location_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    floor VARCHAR(50) NOT NULL CHECK (floor IN ('Ground', 'First', 'Second', 'Third', 'Blok B8', 'Blok C12', 'Blok L Perpustakaan')),
    capacity INT NOT NULL DEFAULT 30 CHECK (capacity >= 0),
    category VARCHAR(100) DEFAULT 'Lab',
    description TEXT,
    image_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    device_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    location_id INT REFERENCES locations(location_id) ON DELETE SET NULL,
    is_loanable BOOLEAN NOT NULL DEFAULT TRUE,
    specs TEXT,
    accessories TEXT,
    image_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'checked_out', 'maintenance', 'broken')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS location_bookings (
    booking_id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    purpose TEXT NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(100) DEFAULT NULL,
    recurrence_group_id VARCHAR(100) DEFAULT NULL,
    series_status VARCHAR(50) DEFAULT 'active' CHECK (series_status IN ('active', 'paused', 'cancelled')),
    course_id VARCHAR(50) DEFAULT NULL,
    course_name VARCHAR(255) DEFAULT NULL,
    lecturer_name VARCHAR(255) DEFAULT NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    attendance_status VARCHAR(50) DEFAULT NULL,
    attendance_notes TEXT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_booking_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_location_bookings_loc_time ON location_bookings (location_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_location_bookings_user ON location_bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_location_bookings_recurrence ON location_bookings (recurrence_group_id);

CREATE TABLE IF NOT EXISTS device_bookings (
    loan_id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    checkout_time TIMESTAMP WITH TIME ZONE,
    expected_return_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_return_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_technician' CHECK (status IN ('pending', 'pending_lecturer', 'pending_technician', 'approved', 'checked_out', 'returned', 'rejected')),
    purpose TEXT,
    selected_accessories TEXT,
    approved_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    lecturer_approver_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    lecturer_approved_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    pickup_location TEXT,
    return_rating INT CHECK (return_rating >= 1 AND return_rating <= 5),
    return_condition VARCHAR(100),
    return_notes TEXT,
    device_rating INT CHECK (device_rating >= 1 AND device_rating <= 5),
    device_review TEXT,
    rated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_bookings_device_status ON device_bookings (device_id, status);
CREATE INDEX IF NOT EXISTS idx_device_bookings_user ON device_bookings (user_id);

CREATE TABLE IF NOT EXISTS issue_reports (
    report_id SERIAL PRIMARY KEY,
    reported_by INT REFERENCES users(user_id) ON DELETE CASCADE,
    location_id INT REFERENCES locations(location_id) ON DELETE SET NULL,
    device_id INT REFERENCES devices(device_id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'cannot_be_resolved', 'requires_further_action', 'closed')),
    issue_reason TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    guest_name VARCHAR(255),
    guest_email VARCHAR(255),
    category VARCHAR(100) DEFAULT 'General'
);

CREATE INDEX IF NOT EXISTS idx_issue_reports_location ON issue_reports (location_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_reported_by ON issue_reports (reported_by);

CREATE TABLE IF NOT EXISTS user_notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
    ON user_notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS maintenance_logs (
    log_id SERIAL PRIMARY KEY,
    device_id INT REFERENCES devices(device_id) ON DELETE SET NULL,
    location_id INT REFERENCES locations(location_id) ON DELETE SET NULL,
    technician_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    cost DECIMAL(10, 2) DEFAULT 0.00 CHECK (cost >= 0),
    date_performed DATE NOT NULL DEFAULT CURRENT_DATE,
    linked_report_id INT REFERENCES issue_reports(report_id) ON DELETE SET NULL,
    scheduled_reminder_date DATE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_feedback (
    feedback_id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    reporter_name VARCHAR(255),
    reporter_email VARCHAR(255),
    reporter_role VARCHAR(50) DEFAULT 'student',
    rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(100) DEFAULT 'General',
    comments TEXT NOT NULL,
    cleanliness_rating INT DEFAULT 5 CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    equipment_rating INT DEFAULT 5 CHECK (equipment_rating >= 1 AND equipment_rating <= 5),
    ac_rating INT DEFAULT 5 CHECK (ac_rating >= 1 AND ac_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT
);

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
    ('device_booking_requires_approval', 'true', 'Require technician or manager approval before device checkout'),
    ('operating_hours_start', '08:00', 'Facility booking day start time'),
    ('operating_hours_end', '20:00', 'Facility booking day end time'),
    ('max_booking_duration_hours', '4', 'Maximum single booking duration in hours')
ON CONFLICT (setting_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS lab_usage_logs (
    log_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES location_bookings(booking_id) ON DELETE CASCADE,
    location_id INT NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    attendance_status VARCHAR(50) DEFAULT 'on_time',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lab_usage_logs_location ON lab_usage_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_lab_usage_logs_user ON lab_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_usage_logs_start ON lab_usage_logs(start_time);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_usage_logs_unique_booking
    ON lab_usage_logs (booking_id) WHERE booking_id IS NOT NULL;
