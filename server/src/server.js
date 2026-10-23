const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const { seedDatabase } = require('./db/seed');
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/locations');
const bookingRoutes = require('./routes/bookings');
const deviceRoutes = require('./routes/devices');
const deviceLoanRoutes = require('./routes/deviceLoans');
const issueRoutes = require('./routes/issues');
const maintenanceRoutes = require('./routes/maintenance');
const scheduleRoutes = require('./routes/schedule');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload and data directories exist
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads serving
app.use('/uploads', express.static(uploadDir));

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/device-loans', deviceLoanRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'FSKTM Integrated Facility Booking & Maintenance Management System'
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

async function startServer() {
  try {
    console.log('Initializing database schema and initial seed...');
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`  FSKTM FMS Backend API Server is running!`);
      console.log(`  URL: http://localhost:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
