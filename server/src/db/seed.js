const bcrypt = require('bcryptjs');
const { query, exec } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
  console.log('--- Initializing FSKTM Database Schema & Seeds ---');

  // Execute Schema SQL
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  await exec(schemaSql);
  console.log('✓ Schema applied successfully.');

  // Apply schema migrations for existing databases
  try {
    await exec(`
      ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';
      ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS approved_by INT REFERENCES users(user_id) ON DELETE SET NULL;
      ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS recurrence_group_id VARCHAR(100);
      ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS series_status VARCHAR(50) DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT FALSE;
      ALTER TABLE locations ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE devices ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE devices ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
      ALTER TABLE issue_reports ALTER COLUMN reported_by DROP NOT NULL;
      ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255);
      ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);
      ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';

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
    `);
    await exec(`UPDATE location_bookings SET status = 'approved' WHERE status IS NULL OR status = ''`);
    await exec(`UPDATE users SET specialization = 'BIW' WHERE role = 'student' AND (specialization IS NULL OR specialization = '')`);
    await exec(`UPDATE devices SET is_loanable = FALSE WHERE location_id IS NOT NULL`);
    await exec(`UPDATE devices SET is_loanable = TRUE WHERE location_id IS NULL`);
    await exec(`UPDATE devices SET barcode = 'BC-' || REPLACE(serial_number, ' ', '-') WHERE barcode IS NULL OR barcode = ''`);
    console.log('✓ Database schema migrations applied.');

    // Ensure new blocks (Blok B8, Blok C12, Blok L Perpustakaan) exist
    const blockLocations = [
      { code: 'DT1', name: 'Dewan Teater 1', floor: 'Blok B8', capacity: 120, category: 'Dewan Teater', desc: 'Dewan Teater 1 at Blok B8. PIC: En. Faizannizam bin Shahbudin', status: 'available' },
      { code: 'DT2', name: 'Dewan Teater 2', floor: 'Blok B8', capacity: 120, category: 'Dewan Teater', desc: 'Dewan Teater 2 at Blok B8. PIC: En. Faizannizam bin Shahbudin', status: 'available' },
      { code: 'C12-BK-101', name: 'BK-101', floor: 'Blok C12', capacity: 60, category: 'Bilik Kuliah', desc: 'Bilik Kuliah 101 at Blok C12. PIC: En. Sahidan bin Paran', status: 'available' },
      { code: 'BT1', name: 'Bilik Tutorial 1', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 1 at Blok L Perpustakaan. PIC: En. Muhammad Afiq bin Mazni', status: 'available' },
      { code: 'Bt10', name: 'Bilik Tutorial 10', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 10 at Blok L Perpustakaan. PIC: En. Muhammad Afiq bin Mazni', status: 'available' },
      { code: 'BT5', name: 'Bilik Tutorial 5', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 5 at Blok L Perpustakaan. PIC: En. Mohammad Hafiz bin Mt. Saidun', status: 'available' },
      { code: 'BT6', name: 'Bilik Tutorial 6', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 6 at Blok L Perpustakaan. PIC: En. Mohammad Hafiz bin Mt. Saidun', status: 'available' },
      { code: 'BT8', name: 'Bilik Tutorial 8', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 8 at Blok L Perpustakaan. PIC: En. Mohd Al Hafiz bin Nordin', status: 'available' },
      { code: 'BT9', name: 'Bilik Tutorial 9', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 9 at Blok L Perpustakaan. PIC: En. Mohd Al Hafiz bin Nordin', status: 'available' },
    ];
    for (const bLoc of blockLocations) {
      const exists = await query('SELECT location_id FROM locations WHERE code = $1 AND floor = $2', [bLoc.code, bLoc.floor]);
      if (exists.rows.length === 0) {
        await query(
          `INSERT INTO locations (code, name, floor, capacity, category, description, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [bLoc.code, bLoc.name, bLoc.floor, bLoc.capacity, bLoc.category, bLoc.desc, bLoc.status]
        );
      }
    }
    console.log('✓ Block locations (Blok B8, Blok C12, Blok L Perpustakaan) verified.');
  } catch (migErr) {
    console.warn('Migration notice:', migErr.message);
  }

  // Check if users already exist
  const existingUsers = await query('SELECT COUNT(*) as count FROM users');
  const count = parseInt(existingUsers.rows[0].count, 10);
  if (count > 0) {
    console.log(`Database already has ${count} users. Skipping full seed.`);
    return;
  }

  console.log('Seeding initial users...');
  const salt = await bcrypt.genSalt(10);
  const studentHash = await bcrypt.hash('Student123!', salt);
  const lecturerHash = await bcrypt.hash('Lecturer123!', salt);
  const techHash = await bcrypt.hash('Tech123!', salt);
  const managerHash = await bcrypt.hash('Manager123!', salt);

  const usersSql = `
    INSERT INTO users (name, email, password_hash, role, matric_or_staff_id, department, specialization)
    VALUES 
      ('Aiman Hakim bin Norazman', 'student@fsktm.um.edu.my', $1, 'student', 'WIF210045', 'Software Engineering', 'BIW'),
      ('Dr. Nurul Huda binti Ahmad', 'lecturer@fsktm.um.edu.my', $2, 'lecturer', 'L-9042', 'Artificial Intelligence', NULL),
      ('En. Khairul Azmi bin Razak', 'technician@fsktm.um.edu.my', $3, 'technician', 'T-3011', 'IT & Facility Services', NULL),
      ('Prof. Madya Ts. Dr. Shamsul Bahari', 'manager@fsktm.um.edu.my', $4, 'manager', 'M-1002', 'Dean Office / Lab Management', NULL),
      ('Muhammad Faris bin Zainal', 'AI230182@student.uthm.edu.my', $1, 'student', 'AI230182', 'Department of Software Engineering', 'BIW'),
      ('Dr. Norasri bin Ismail', 'norasri@uthm.edu.my', $2, 'lecturer', 'UTHM-7821', 'Department of Software Engineering', NULL)
    ON CONFLICT (email) DO NOTHING
    RETURNING user_id, email, role;
  `;
  const userResults = await query(usersSql, [studentHash, lecturerHash, techHash, managerHash]);
  console.log(`✓ Seeded demo and UTHM users.`);

  const studentUser = userResults.rows.find(u => u.role === 'student');
  const lecturerUser = userResults.rows.find(u => u.role === 'lecturer');
  const techUser = userResults.rows.find(u => u.role === 'technician');
  const managerUser = userResults.rows.find(u => u.role === 'manager');

  console.log('Seeding authentic FSKTM faculty locations across 4 floors...');
  const locations = [
    // Ground Floor
    { code: 'MSD', name: 'Makmal Sains Data', floor: 'Ground', capacity: 40, category: 'Computer Lab', desc: 'Data science and AI workstation lab with GPU support.', status: 'available' },
    { code: 'MRM', name: 'Makmal Realiti Maya', floor: 'Ground', capacity: 30, category: 'Specialized Lab', desc: 'Virtual & Augmented Reality lab with HTC Vive and Oculus Quest rigs.', status: 'maintenance' }, // Deliberately set to maintenance for testing!
    { code: 'MGA', name: 'Makmal Grafik dan Animasi', floor: 'Ground', capacity: 35, category: 'Computer Lab', desc: 'High-end rendering workstations for multimedia and 3D modeling.', status: 'available' },
    { code: 'SAV', name: 'Studio Audio dan Video', floor: 'Ground', capacity: 20, category: 'Media Studio', desc: 'Sound-dampened recording studio with podcasting and green-screen facilities.', status: 'available' },
    { code: 'PTM', name: 'Pusat Teknologi Maklumat', floor: 'Ground', capacity: 50, category: 'General Lab', desc: 'General computer lab for undergraduate practical sessions.', status: 'available' },
    { code: 'BS-01', name: 'Bilik Siswazah 1', floor: 'Ground', capacity: 15, category: 'Postgraduate Room', desc: 'Dedicated research discussion room for postgraduate researchers.', status: 'available' },
    { code: 'BS-02', name: 'Bilik Siswazah 2', floor: 'Ground', capacity: 15, category: 'Postgraduate Room', desc: 'Postgraduate study room with smart presentation screen.', status: 'available' },
    { code: 'BS-03', name: 'Bilik Siswazah 3', floor: 'Ground', capacity: 15, category: 'Postgraduate Room', desc: 'Postgraduate collaborative study space.', status: 'available' },
    { code: 'BS-04', name: 'Bilik Siswazah 4', floor: 'Ground', capacity: 15, category: 'Postgraduate Room', desc: 'Quiet research room for Masters and PhD candidates.', status: 'available' },
    { code: 'BS-05', name: 'Bilik Siswazah 5', floor: 'Ground', capacity: 15, category: 'Postgraduate Room', desc: 'Project discussion space with high-speed LAN connectivity.', status: 'available' },
    { code: 'BS-06', name: 'Bilik Siswazah 6', floor: 'Ground', capacity: 15, category: 'Postgraduate Room', desc: 'Seminar and reading lounge for postgraduates.', status: 'available' },
    { code: 'BPS', name: 'Bilik Pasca Siswazah', floor: 'Ground', capacity: 25, category: 'Postgraduate Room', desc: 'Main graduate workstation commons room.', status: 'available' },
    { code: 'ADM-G', name: 'Pejabat Pentadbiran', floor: 'Ground', capacity: 20, category: 'Administration', desc: 'General administration and student affairs office.', status: 'available' },

    // First Floor
    { code: 'MINFO', name: 'Makmal Infosys', floor: 'First', capacity: 45, category: 'Computer Lab', desc: 'Information systems computing laboratory with dual-monitor PCs.', status: 'available' },
    { code: 'RMP', name: 'Ruang Membaca Pelajar', floor: 'First', capacity: 60, category: 'Study Area', desc: 'Spacious student study commons with charging docks and group study booths.', status: 'available' },
    { code: 'MKP', name: 'Makmal Kejuruteraan Perisian', floor: 'First', capacity: 40, category: 'Computer Lab', desc: 'Software engineering lab with CI/CD dev environments.', status: 'available' },
    { code: 'MPP', name: 'Makmal Pembangunan Perisian', floor: 'First', capacity: 40, category: 'Computer Lab', desc: 'Development lab for mobile and full-stack software development.', status: 'available' },
    { code: 'MPROG', name: 'Makmal Pengaturcaraan', floor: 'First', capacity: 45, category: 'Computer Lab', desc: 'Core programming laboratory for C++, Java, and Python courses.', status: 'available' },
    { code: 'ICT-OFC', name: 'Pejabat ICT', floor: 'First', capacity: 15, category: 'IT Services', desc: 'Technical support and faculty server administration office.', status: 'available' },
    { code: 'PKJ', name: 'Pejabat Ketua Jabatan', floor: 'First', capacity: 10, category: 'Administration', desc: 'Head of Department office and executive meeting room.', status: 'available' },
    { code: 'PB-101-06', name: 'Bilik Pensyarah PB-101-06', floor: 'First', capacity: 4, category: 'Lecturer Office', desc: 'Academic staff consultation room.', status: 'available' },
    { code: 'PB-101-07', name: 'Bilik Pensyarah PB-101-07', floor: 'First', capacity: 4, category: 'Lecturer Office', desc: 'Academic staff consultation room.', status: 'available' },
    { code: 'PB-101-08', name: 'Bilik Pensyarah PB-101-08', floor: 'First', capacity: 4, category: 'Lecturer Office', desc: 'Academic staff consultation room.', status: 'available' },
    { code: 'PB-101-09', name: 'Bilik Pensyarah PB-101-09', floor: 'First', capacity: 4, category: 'Lecturer Office', desc: 'Academic staff consultation room.', status: 'available' },

    // Second Floor
    { code: 'SEM-2', name: 'Bilik Seminar', floor: 'Second', capacity: 80, category: 'Seminar Hall', desc: 'Equipped with dual projectors, lapel mics, and lecture capture camera.', status: 'available' },
    { code: 'BT-01', name: 'Bilik Tutorial 1', floor: 'Second', capacity: 35, category: 'Tutorial Room', desc: 'Interactive classroom with modular student desks.', status: 'available' },
    { code: 'BT-02', name: 'Bilik Tutorial 2', floor: 'Second', capacity: 35, category: 'Tutorial Room', desc: 'Interactive classroom with whiteboard surround and smart projector.', status: 'available' },
    { code: 'BT-05', name: 'Bilik Tutorial 5', floor: 'Second', capacity: 35, category: 'Tutorial Room', desc: 'Medium lecture and group presentation room.', status: 'available' },
    { code: 'MFD', name: 'Makmal Forensik Digital', floor: 'Second', capacity: 30, category: 'Security Lab', desc: 'Digital forensics lab with write-blockers and EnCase analysis suites.', status: 'available' },
    { code: 'HPA', name: 'Akademi HP Aruba', floor: 'Second', capacity: 35, category: 'Network Lab', desc: 'Enterprise networking laboratory with HP Aruba switches and access points.', status: 'available' },
    { code: 'CISCO', name: 'Akademi Rangkaian Cisco', floor: 'Second', capacity: 35, category: 'Network Lab', desc: 'Cisco networking lab equipped with CCNA/CCNP routing and switching racks.', status: 'available' },
    { code: 'MKK', name: 'Makmal Keselamatan Komputer', floor: 'Second', capacity: 30, category: 'Security Lab', desc: 'Cybersecurity lab with isolated sandbox network for penetration testing.', status: 'maintenance' }, // Also maintenance!
    { code: 'BMP', name: 'Bilik Mesyuarat Pengurusan FSKTM', floor: 'Second', capacity: 25, category: 'Meeting Room', desc: 'Executive boardroom with teleconferencing facilities.', status: 'available' },

    // Third Floor
    { code: 'AUD-3', name: 'Auditorium', floor: 'Third', capacity: 150, category: 'Auditorium', desc: 'Main faculty auditorium for keynote lectures, symposiums, and events.', status: 'available' },
    { code: 'SCDMC', name: 'Soft Computing and Data Mining Centre', floor: 'Third', capacity: 40, category: 'Research Lab', desc: 'Postgraduate research lab for neural networks and machine learning.', status: 'available' },
    { code: 'MPI', name: 'Makmal Pengaturcaraan Internet', floor: 'Third', capacity: 40, category: 'Computer Lab', desc: 'Web development lab with cloud server simulators.', status: 'available' },
    { code: 'MSK', name: 'Makmal Sistem Komputer', floor: 'Third', capacity: 40, category: 'Hardware Lab', desc: 'Hardware architecture lab with Raspberry Pi and FPGA boards.', status: 'available' },
    { code: 'MTW', name: 'Makmal Teknologi Web', floor: 'Third', capacity: 40, category: 'Computer Lab', desc: 'Front-end & UX design lab with calibrated 4K displays.', status: 'available' },
    { code: 'BT-04', name: 'Bilik Tutorial 4', floor: 'Third', capacity: 35, category: 'Tutorial Room', desc: 'Tiered classroom for tutorial discussions.', status: 'available' },
    { code: 'BAS', name: 'Bilik Aktiviti Staf', floor: 'Third', capacity: 30, category: 'Staff Lounge', desc: 'Staff recreation, wellness, and informal meeting room.', status: 'available' },

    // Blok B8
    { code: 'DT1', name: 'Dewan Teater 1', floor: 'Blok B8', capacity: 120, category: 'Dewan Teater', desc: 'Dewan Teater 1 at Blok B8. PIC: En. Faizannizam bin Shahbudin', status: 'available' },
    { code: 'DT2', name: 'Dewan Teater 2', floor: 'Blok B8', capacity: 120, category: 'Dewan Teater', desc: 'Dewan Teater 2 at Blok B8. PIC: En. Faizannizam bin Shahbudin', status: 'available' },

    // Blok C12
    { code: 'C12-BK-101', name: 'BK-101', floor: 'Blok C12', capacity: 60, category: 'Bilik Kuliah', desc: 'Bilik Kuliah 101 at Blok C12. PIC: En. Sahidan bin Paran', status: 'available' },

    // Blok L Perpustakaan
    { code: 'BT1', name: 'Bilik Tutorial 1', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 1 at Blok L Perpustakaan. PIC: En. Muhammad Afiq bin Mazni', status: 'available' },
    { code: 'Bt10', name: 'Bilik Tutorial 10', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 10 at Blok L Perpustakaan. PIC: En. Muhammad Afiq bin Mazni', status: 'available' },
    { code: 'BT5', name: 'Bilik Tutorial 5', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 5 at Blok L Perpustakaan. PIC: En. Mohammad Hafiz bin Mt. Saidun', status: 'available' },
    { code: 'BT6', name: 'Bilik Tutorial 6', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 6 at Blok L Perpustakaan. PIC: En. Mohammad Hafiz bin Mt. Saidun', status: 'available' },
    { code: 'BT8', name: 'Bilik Tutorial 8', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 8 at Blok L Perpustakaan. PIC: En. Mohd Al Hafiz bin Nordin', status: 'available' },
    { code: 'BT9', name: 'Bilik Tutorial 9', floor: 'Blok L Perpustakaan', capacity: 35, category: 'Tutorial Room', desc: 'Bilik Tutorial 9 at Blok L Perpustakaan. PIC: En. Mohd Al Hafiz bin Nordin', status: 'available' }
  ];

  const locMap = {};
  for (const loc of locations) {
    const res = await query(
      `INSERT INTO locations (code, name, floor, capacity, category, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING location_id, code;`,
      [loc.code, loc.name, loc.floor, loc.capacity, loc.category, loc.desc, loc.status]
    );
    locMap[loc.code] = res.rows[0].location_id;
  }
  console.log(`✓ Seeded ${locations.length} FSKTM locations.`);

  console.log('Seeding device inventory...');
  const devices = [
    // Non-loanable devices fixed in rooms
    { name: 'Cisco 2901 Integrated Services Router', category: 'Networking', serial: 'RTR-CSC-2901', locCode: 'CISCO', specs: '2 GE Ports, 4 EHWIC Slots, 2 DSP Slots. Fixed Rack Unit.', is_loanable: false, status: 'available' },
    { name: 'Cisco Catalyst 2960-X Switch', category: 'Networking', serial: 'SW-CSC-2960X', locCode: 'CISCO', specs: '48 Port Gigabit, PoE+, 4x 1G SFP. Fixed Rack Unit.', is_loanable: false, status: 'available' },
    { name: 'Aruba 2930F 24G PoE+ Switch', category: 'Networking', serial: 'SW-ARU-2930F', locCode: 'HPA', specs: 'Layer 3 switch, 4 SFP+ uplink ports. Fixed Rack Unit.', is_loanable: false, status: 'available' },
    { name: 'Rigol DS1054Z Digital Oscilloscope', category: 'Testing & Lab', serial: 'OSC-RGL-1054', locCode: 'MSK', specs: '50 MHz, 4 Channels, 1 GSa/s. Fixed Lab Bench Unit.', is_loanable: false, status: 'available' },
    { name: 'NVIDIA RTX 4090 Deep Learning Rig #1', category: 'Workstation', serial: 'WS-GPU-4090-1', locCode: 'MSD', specs: 'Ryzen 9 7950X, 64GB DDR5, RTX 4090 24GB. Fixed Lab Station.', is_loanable: false, status: 'available' },
    { name: 'Dell Precision 3660 Workstation #08', category: 'Workstation', serial: 'WS-DEL-3660-8', locCode: 'MKP', specs: 'Core i7 13700, 32GB RAM, RTX A2000. Fixed Lab Station.', is_loanable: false, status: 'available' },
    { name: 'Tableau Forensic Universal Bridge T35u', category: 'Forensics', serial: 'FRN-TAB-T35U', locCode: 'MFD', specs: 'Write-blocker for SATA, SAS, PCIe, USB 3.0. Fixed Lab Bench.', is_loanable: false, status: 'available' },
    { name: 'Epson EB-2250U 3LCD Projector', category: 'Audio/Visual', serial: 'PRJ-EPS-2250', locCode: 'SEM-2', specs: '5000 Lumens, Full HD WUXGA, Ceiling Mounted.', is_loanable: false, status: 'available' },
    { name: 'Rode RodeCaster Pro II Audio Studio Console', category: 'Audio/Visual', serial: 'AUD-ROD-CP2', locCode: 'SAV', specs: 'Integrated audio production studio, 4 XLR inputs, 8 motorized faders. Fixed Studio Console.', is_loanable: false, status: 'available' },
    { name: 'Blackmagic Studio Camera 4K Pro G2', category: 'Media', serial: 'CAM-BMD-ST4K', locCode: 'SAV', specs: '12G-SDI, 7" HDR touchscreen, Micro Four Thirds mount. Fixed Studio Pedestal Camera.', is_loanable: false, status: 'available' },
    { name: 'Genelec 8030C Studio Monitors (Pair)', category: 'Audio/Visual', serial: 'SPK-GEN-8030', locCode: 'SAV', specs: 'Bi-amplified active studio monitors, sound-isolated acoustic mount. Fixed Studio Monitors.', is_loanable: false, status: 'available' },
    { name: 'HTC Vive Pro 2 Space Tracking Rig (Fixed)', category: 'VR / AR', serial: 'VR-VIVE-FIXED', locCode: 'MRM', specs: 'Fixed ceiling-mounted SteamVR 2.0 Base Stations, tethered workstation rig.', is_loanable: false, status: 'available' },
    
    // Loanable devices not associated with specific rooms (General Loan Pool)
    { name: 'Meta Quest 2 VR Headset #01', category: 'VR / AR', serial: 'VR-MQ2-001', locCode: null, specs: '128GB, Elite Strap, 2x Touch Controllers (Portable Loan Asset)', is_loanable: true, status: 'maintenance' },
    { name: 'Meta Quest 2 VR Headset #02', category: 'VR / AR', serial: 'VR-MQ2-002', locCode: null, specs: '256GB, Hand Tracking Enabled (Portable Loan Asset)', is_loanable: true, status: 'available' },
    { name: 'HTC Vive Pro Rig #01', category: 'VR / AR', serial: 'VR-VIVE-001', locCode: null, specs: 'Base Stations 2.0, Wireless Adapter (Portable Loan Kit)', is_loanable: true, status: 'available' },
    { name: 'Sony Alpha A7 IV Video Kit', category: 'Media', serial: 'CAM-SNY-A7IV', locCode: null, specs: '33MP Full-frame, 4K 60p, 24-70mm GM Lens, Hard Case (Loan Asset)', is_loanable: true, status: 'checked_out' },
    { name: 'DJI RS 3 Pro Camera Gimbal', category: 'Media', serial: 'GMB-DJI-RS3P', locCode: null, specs: 'Carbon fiber, 4.5kg tested payload (Loan Asset)', is_loanable: true, status: 'available' },
    { name: 'MacBook Pro 16" M2 Max (Mobile Testing)', category: 'Workstation', serial: 'LAP-APL-MBP16', locCode: null, specs: '32GB RAM, 1TB SSD, macOS Ventura (Loan Asset)', is_loanable: true, status: 'available' },
    { name: 'Dell XPS 15 9530 (Mobile Testing)', category: 'Workstation', serial: 'LAP-DEL-XPS15', locCode: null, specs: 'Core i9, 32GB RAM, RTX 4070, Win 11 Pro (Loan Asset)', is_loanable: true, status: 'available' }
  ];

  const deviceMap = {};
  for (const dev of devices) {
    const locId = dev.locCode && locMap[dev.locCode] ? locMap[dev.locCode] : null;
    const isLoanable = dev.is_loanable !== undefined ? dev.is_loanable : (locId === null);
    const barcodeVal = dev.barcode || `BC-${dev.serial}`;
    const res = await query(
      `INSERT INTO devices (name, category, serial_number, barcode, location_id, is_loanable, specs, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING device_id, serial_number;`,
      [dev.name, dev.category, dev.serial, barcodeVal, locId, isLoanable, dev.specs, dev.status]
    );
    deviceMap[dev.serial] = res.rows[0].device_id;
  }
  console.log(`✓ Seeded ${devices.length} devices.`);

  console.log('Seeding sample bookings...');
  const now = new Date();
  const todayAt = (h, m = 0) => {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const tomorrowAt = (h, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  // Sample bookings
  if (locMap['MSD'] && lecturerUser && managerUser) {
    await query(
      `INSERT INTO location_bookings (location_id, user_id, start_time, end_time, purpose, is_recurring, recurrence_pattern, course_id, status, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9)`,
      [locMap['MSD'], lecturerUser.user_id, todayAt(10), todayAt(12), 'WIF3001 Machine Learning Lab Practical', true, 'WEEKLY:FRIDAY', 'WIF3001', managerUser.user_id]
    );
  }

  if (locMap['SEM-2'] && lecturerUser && managerUser) {
    await query(
      `INSERT INTO location_bookings (location_id, user_id, start_time, end_time, purpose, is_recurring, course_id, status, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', $8)`,
      [locMap['SEM-2'], lecturerUser.user_id, tomorrowAt(14), tomorrowAt(16), 'Postgraduate Research Colloquium Lecture', false, 'WIB7001', managerUser.user_id]
    );
  }

  if (locMap['BT-01'] && studentUser) {
    await query(
      `INSERT INTO location_bookings (location_id, user_id, start_time, end_time, purpose, is_recurring, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [locMap['BT-01'], studentUser.user_id, todayAt(16), todayAt(18), 'Final Year Project Group Peer Discussion', false]
    );
  }

  console.log('Seeding device loan...');
  if (deviceMap['CAM-SNY-A7IV'] && studentUser && techUser) {
    await query(
      `INSERT INTO device_bookings (device_id, user_id, checkout_time, expected_return_time, status, purpose, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [deviceMap['CAM-SNY-A7IV'], studentUser.user_id, todayAt(9), tomorrowAt(17), 'checked_out', 'Faculty Annual Tech Showcase Video Recording', techUser.user_id]
    );
  }

  console.log('Seeding sample breakdown/issue report...');
  let reportId = null;
  if (studentUser && locMap['MRM']) {
    const reportRes = await query(
      `INSERT INTO issue_reports (reported_by, location_id, device_id, description, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING report_id;`,
      [studentUser.user_id, locMap['MRM'], deviceMap['VR-MQ2-001'] || null, 'Left controller tracking sensor flickering intermittently and room air-conditioning leaking water.', 'in_progress']
    );
    reportId = reportRes.rows[0].report_id;
  }

  console.log('Seeding maintenance log linked to report...');
  if (techUser && locMap['MRM']) {
    await query(
      `INSERT INTO maintenance_logs (device_id, location_id, technician_id, description, cost, date_performed, linked_report_id, scheduled_reminder_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, CURRENT_DATE + INTERVAL '90 days')`,
      [deviceMap['VR-MQ2-001'] || null, locMap['MRM'], techUser.user_id, 'Replaced tracking sensor battery cradle on controller #01 and serviced HVAC blower condenser.', 180.50, reportId]
    );
  }

  console.log('=== Database seed completed successfully! ===');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
