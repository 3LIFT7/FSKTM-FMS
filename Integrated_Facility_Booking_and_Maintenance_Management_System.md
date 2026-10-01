# Integrated Facility Booking & Maintenance Management System Architecture & Design

## 1. System Overview

This system is designed to streamline operations within a laboratory or educational environment. It provides a centralized platform for managing resources (rooms and equipment), reporting issues, and tracking maintenance, catering to the distinct needs of students, lecturers, technicians, and managers.

## 2. User Roles & Permissions

The system implements Role-Based Access Control (RBAC) to ensure users only access features relevant to their responsibilities.

### 2.1. Student

- **Permissions:** Lowest level of access.
- **Capabilities:**
  - View availability of labs/classrooms.
  - Book devices (if permitted by policy, otherwise request booking).
  - Report damages or breakdowns in a lab or for a specific device.
  - View status of their own reports/bookings.

### 2.2. Lecturer

- **Permissions:** Medium level access.
- **Capabilities:**
  - All Student capabilities.
  - Book labs or classrooms for specific time slots/semesters.

### 2.3. Lab Technician

- **Permissions:** High level access (Operational).
- **Capabilities:**
  - View all lab/classroom bookings.
  - Manage device inventory (add, update, remove devices).
  - Track device check-outs and returns.
  - Receive and update status of damage/breakdown reports.
  - Log maintenance records for labs and specific devices.
  - Approve/Deny device booking requests from students (optional, depending on workflow).

### 2.4. System Administration

- **Permissions:** Administrator level access.
- **Capabilities:**
  - All Lab Technician capabilities.
  - Manage user accounts and roles.
  - Configure system settings (booking rules, lab hours).
  - Generate reports (usage statistics, maintenance costs, frequent breakdown items).
  - **Import semester class schedules via CSV bulk upload to populate the booking calendar automatically.**

### 2.4. Lab Manager

- **Permissions:** Administrator level access.
- **Capabilities:**
  - All Lab Technician capabilities.
  - Manage user accounts and roles.
  - Configure system settings (booking rules, lab hours).
  - Approve/Deny device booking requests from students (optional, depending on workflow).
  - Generate reports (usage statistics, maintenance costs, frequent breakdown items).
  - **Import semester class schedules via CSV bulk upload to populate the booking calendar automatically.**

## 3. Core Modules & Features

### 3.1. Lab/Classroom Booking Module

- **Calendar View:** Visual representation of availability.
- **Booking Rules:** Prevent double-booking, enforce maximum booking durations, restrict bookings outside operating hours.
- **Recurring Bookings:** For lecturers scheduling weekly classes.
- **CSV Schedule Import:** A tool to upload and parse CSV files containing full semester timetables. The system will automatically map the data (Course ID, Time, Day, Lab) to generate bulk recurring bookings, saving time and preventing manual entry errors.

### 3.2. Damage/Breakdown Reporting Module (Ticketing System)

- **Issue Submission Form:** Fields for location, device ID (optional), description, and photo upload.
- **Status Tracking:** Open, In Progress, Resolved, Closed.
- **Notifications:** Email/in-app alerts to technicians when a new report is filed, and to the reporter when the status changes.

### 3.3. Device Booking & Tracking Module

- **Inventory Catalog:** Searchable list of available devices with specifications and current status (Available, Checked Out, Under Maintenance).
- **Checkout/Return Workflow:** System for technicians to log when a device leaves and returns, potentially using barcode/QR code scanning.
- **Overdue Alerts:** Notifications for devices not returned on time.

### 3.4. Maintenance Recording Module

- **Maintenance Logs:** Historical record of all work done on a room or device.
- **Scheduled Maintenance:** Alerts for routine checks (e.g., "Calibrate Oscilloscope #4 every 6 months").
- **Link to Reports:** Ability to link a maintenance record directly to a resolved breakdown report.

## 4. Proposed Database Schema (Relational - SQL)

This is a simplified schema to illustrate the relationships.

- **Users:** user_id (PK), name, email, password_hash, role (Enum: Student, Lecturer, Technician, Manager).
- **Locations (Labs/Classrooms):** location_id (PK), name, capacity, description.
- **Devices:** device_id (PK), name, serial_number, location_id (FK), status (Enum: Available, Checked Out, Maintenance, Broken).
- **Location_Bookings:** booking_id (PK), location_id (FK), user_id (FK), start_time, end_time, purpose, is_recurring (Boolean).
- **Device_Bookings/Loans:** loan_id (PK), device_id (FK), user_id (FK), checkout_time, expected_return_time, actual_return_time, approved_by (FK - User).
- **Issue_Reports:** report_id (PK), reported_by (FK - User), location_id (FK - optional), device_id (FK - optional), description, status, created_at, updated_at.
- **Maintenance_Logs:** log_id (PK), device_id (FK - optional), location_id (FK - optional), technician_id (FK - User), description, cost, date_performed.

## 5. Recommended Technology Stack

- **Frontend (User Interface):** React, Vue.js, or Angular. (React is highly recommended for its ecosystem). Use a component library like Material-UI or Ant Design for quick development.
- **Backend (API & Logic):** Node.js (with Express or NestJS), Python (Django or FastAPI), or Java (Spring Boot). A library like csv-parser (Node.js) or pandas/csv (Python) will be needed for the schedule import feature.
- **Database:** PostgreSQL or MySQL.
- **Authentication:** JSON Web Tokens (JWT) or a managed service like Auth0/Firebase Authentication.
- **Hosting/Deployment:** local.

## 6. Next Steps for Development

- **Requirements Gathering:** Refine the specific rules (e.g., what exact columns are required in the CSV import template?).
- **UI/UX Wireframing:** Sketch the screens for the different user roles (Dashboard, Booking Calendar, Inventory List).
- **API Design:** Define the RESTful endpoints or GraphQL schema needed to connect the frontend to the backend.
- **Database Implementation:** Set up the tables and relationships.
- **Iterative Development:** Build module by module, starting with Authentication and User Management.
