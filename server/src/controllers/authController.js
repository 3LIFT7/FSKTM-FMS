const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password, role, matric_number, specialization, staff_id, department } = req.body;

    // 1. Basic presence checks
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Full name, university email, password, and role are required.' });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const selectedRole = role.trim().toLowerCase();

    // 2. Role restriction: Students and Lecturers only
    if (selectedRole !== 'student' && selectedRole !== 'lecturer') {
      return res.status(403).json({ 
        error: 'Registration is restricted to students and lecturers only. Staff & technician accounts must be provisioned by faculty administration.' 
      });
    }

    // 3. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid university email address.' });
    }

    // Password strength check
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    let finalMatricOrStaffId = null;
    let finalSpecialization = null;
    let finalDepartment = department ? department.trim() : 'FSKTM';

    // 4. Student specific validations
    if (selectedRole === 'student') {
      if (!matric_number || !matric_number.trim()) {
        return res.status(400).json({ error: 'Matriculation number is required for student registration.' });
      }

      const trimmedMatric = matric_number.trim().toUpperCase();

      // Rule: starts with "AI" or "BI" followed by 2-digit year (e.g. 21, 22, 23, 24) and digits (e.g. AI230182)
      const matricRegex = /^(AI|BI)\d{2}\d+$/;
      if (!matricRegex.test(trimmedMatric)) {
        return res.status(400).json({
          error: 'Invalid matriculation number format. Must start with "AI" or "BI" followed by the 2-digit year (e.g., AI230182, BI220045).'
        });
      }

      // Specialization check: must be one of BIT, BIC, BIP, BIS, BIW, BIM
      const ALLOWED_SPECIALIZATIONS = ['BIT', 'BIC', 'BIP', 'BIS', 'BIW', 'BIM'];
      if (!specialization || !specialization.trim()) {
        return res.status(400).json({ 
          error: 'Specialization is required for students. Choose from: BIT, BIC, BIP, BIS, BIW, BIM.' 
        });
      }

      const trimmedSpec = specialization.trim().toUpperCase();
      if (!ALLOWED_SPECIALIZATIONS.includes(trimmedSpec)) {
        return res.status(400).json({ 
          error: `Invalid specialization. Must be one of: ${ALLOWED_SPECIALIZATIONS.join(', ')}.` 
        });
      }

      finalMatricOrStaffId = trimmedMatric;
      finalSpecialization = trimmedSpec;

      const specDepartments = {
        BIT: 'Information Technology',
        BIC: 'Computer Systems and Networking',
        BIP: 'Artificial Intelligence',
        BIS: 'Information Systems',
        BIW: 'Software Engineering',
        BIM: 'Multimedia Computing'
      };
      finalDepartment = specDepartments[trimmedSpec] || 'FSKTM';
    }

    // 5. Lecturer specific validations
    if (selectedRole === 'lecturer') {
      finalMatricOrStaffId = staff_id ? staff_id.trim().toUpperCase() : null;
      if (department && department.trim()) {
        finalDepartment = department.trim();
      }
    }

    // 6. Check if email already registered
    const existingEmail = await query('SELECT user_id FROM users WHERE LOWER(email) = $1', [trimmedEmail]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please sign in.' });
    }

    // 7. Check if matric number already registered (for students)
    if (finalMatricOrStaffId && selectedRole === 'student') {
      const existingMatric = await query('SELECT user_id FROM users WHERE UPPER(matric_or_staff_id) = $1', [finalMatricOrStaffId]);
      if (existingMatric.rows.length > 0) {
        return res.status(400).json({ error: 'An account with this matriculation number already exists.' });
      }
    }

    // 8. Hash password and insert user
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertResult = await query(
      `INSERT INTO users (name, email, password_hash, role, matric_or_staff_id, department, specialization)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, name, email, role, matric_or_staff_id, department, specialization, created_at`,
      [trimmedName, trimmedEmail, passwordHash, selectedRole, finalMatricOrStaffId, finalDepartment, finalSpecialization]
    );

    const newUser = insertResult.rows[0];

    // 9. Generate JWT token for immediate access
    const payload = {
      user_id: newUser.user_id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      matric_or_staff_id: newUser.matric_or_staff_id,
      department: newUser.department,
      specialization: newUser.specialization
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('fsktm_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.status(201).json({
      success: true,
      message: `Account registered successfully! Welcome to FSKTM FMS, ${newUser.name}.`,
      user: newUser,
      token
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Failed to complete registration. Please try again.' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email / ID and password are required.' });
    }

    const identifier = email.trim();
    const result = await query(
      `SELECT user_id, name, email, password_hash, role, matric_or_staff_id, department, specialization 
       FROM users 
       WHERE LOWER(email) = LOWER($1) OR UPPER(matric_or_staff_id) = UPPER($1)`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email, matric number, or password.' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Role mismatch validation based on entry portal
    if (portal === 'student' && user.role !== 'student') {
      return res.status(403).json({
        error: `Role Mismatch: You are attempting to log in as ${user.role.toUpperCase()} using the Student Portal. Please use the ${user.role === 'lecturer' ? 'Lecturer' : 'Staff'} Portal.`,
        code: 'PORTAL_ROLE_MISMATCH',
        actualRole: user.role
      });
    }

    if (portal === 'lecturer' && user.role !== 'lecturer') {
      return res.status(403).json({
        error: `Role Mismatch: You are attempting to log in as ${user.role.toUpperCase()} using the Lecturer Portal. Please use the ${user.role === 'student' ? 'Student' : 'Staff'} Portal.`,
        code: 'PORTAL_ROLE_MISMATCH',
        actualRole: user.role
      });
    }

    if (portal === 'staff' && (user.role !== 'technician' && user.role !== 'manager')) {
      return res.status(403).json({
        error: `Role Mismatch: You are attempting to log in as ${user.role.toUpperCase()} using the Staff Portal. Please use the ${user.role === 'student' ? 'Student' : 'Lecturer'} Portal.`,
        code: 'PORTAL_ROLE_MISMATCH',
        actualRole: user.role
      });
    }

    // Generate JWT
    const payload = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      matric_or_staff_id: user.matric_or_staff_id,
      department: user.department,
      specialization: user.specialization
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Set httpOnly cookie
    res.cookie('fsktm_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    const userProfile = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      matric_or_staff_id: user.matric_or_staff_id,
      department: user.department,
      specialization: user.specialization
    };

    return res.json({
      success: true,
      message: 'Login successful',
      user: userProfile,
      token // Also returned in body for optional bearer token use
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  res.clearCookie('fsktm_auth_token', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const result = await query(
      'SELECT user_id, name, email, role, matric_or_staff_id, department, specialization, created_at FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    return res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ error: 'Failed to retrieve current user session.' });
  }
}

// POST /api/auth/forgot-password (Stubbed for now)
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'University email address is required.' });
  }

  const result = await query('SELECT user_id, email, name FROM users WHERE LOWER(email) = $1', [email.trim().toLowerCase()]);
  if (result.rows.length === 0) {
    // For security, do not leak whether account exists
    return res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been generated.',
      stub_token: null
    });
  }

  // Generate stub token
  const resetToken = crypto.randomBytes(24).toString('hex');
  return res.json({
    success: true,
    message: `Password reset request registered for ${email}. (Email delivery is stubbed for development).`,
    stub_token: resetToken,
    expires_in: '1 hour'
  });
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword
};
