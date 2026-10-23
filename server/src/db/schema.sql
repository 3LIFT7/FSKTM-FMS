-- Integrated Facility Booking & Maintenance Management System (FSKTM)
-- PostgreSQL Database Schema

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'lecturer', 'technician', 'manager')),
    matric_or_staff_id VARCHAR(50),
    department VARCHAR(100) DEFAULT 'FSKTM',
    specialization VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    location_id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    floor VARCHAR(50) NOT NULL,
    capacity INT DEFAULT 30,
    description TEXT,
    category VARCHAR(50) DEFAULT 'Lab',
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    device_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    location_id INT REFERENCES locations(location_id) ON DELETE SET NULL,
    is_loanable BOOLEAN DEFAULT FALSE,
    specs TEXT,
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
    recurrence_pattern VARCHAR(100) DEFAULT NULL, -- e.g. "WEEKLY:FRIDAY"
    recurrence_group_id VARCHAR(100) DEFAULT NULL, -- UUID tying all recurring weeks together
    series_status VARCHAR(50) DEFAULT 'active' CHECK (series_status IN ('active', 'paused', 'cancelled')),
    course_id VARCHAR(50) DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_bookings (
    loan_id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    checkout_time TIMESTAMP WITH TIME ZONE,
    expected_return_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_return_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'checked_out', 'returned', 'rejected')),
    purpose TEXT,
    approved_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issue_reports (
    report_id SERIAL PRIMARY KEY,
    reported_by INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    location_id INT REFERENCES locations(location_id) ON DELETE SET NULL,
    device_id INT REFERENCES devices(device_id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
    log_id SERIAL PRIMARY KEY,
    device_id INT REFERENCES devices(device_id) ON DELETE SET NULL,
    location_id INT REFERENCES locations(location_id) ON DELETE SET NULL,
    technician_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    cost DECIMAL(10, 2) DEFAULT 0.00,
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
    cleanliness_rating INT DEFAULT 5,
    equipment_rating INT DEFAULT 5,
    ac_rating INT DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
    ('device_booking_requires_approval', 'true', 'Require technician or manager approval before device checkout'),
    ('operating_hours_start', '08:00', 'Facility booking day start time'),
    ('operating_hours_end', '20:00', 'Facility booking day end time'),
    ('max_booking_duration_hours', '4', 'Maximum single booking duration in hours')
ON CONFLICT (setting_key) DO NOTHING;

