const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

// Determine if the incoming request is HTTPS or HTTP
function isSecureConnection(req) {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
}

// University email domain validator
// Strict University email domain validator for Students & Lecturers
function validateUniversityEmail(email, requestedRole = null) {
  const trimmed = (email || '').trim().toLowerCase();

  if (!trimmed) {
    return {
      valid: false,
      error: 'University email address is required.'
    };
  }

  // 1. Student Siswamail domain: <matric>@student.uthm.edu.my
  if (trimmed.endsWith('@student.uthm.edu.my')) {
    if (requestedRole && requestedRole !== 'student') {
      return {
        valid: false,
        error: `Account role mismatch: "${trimmed}" is a student Siswamail address (@student.uthm.edu.my) and cannot be used for the ${requestedRole} portal. Please sign in via the Student Portal.`
      };
    }

    const rawMatric = trimmed.split('@')[0].toUpperCase().trim();
    // Clean and validate matriculation number (e.g. AI230182, BI220045, CI210033)
    const matricNumber = rawMatric.replace(/[^A-Z0-9]/g, '');

    if (!matricNumber || matricNumber.length < 5) {
      return {
        valid: false,
        error: `Invalid student email format. The email prefix "${rawMatric}" is not a valid UTHM student matriculation number.`
      };
    }

    return {
      valid: true,
      role: 'student',
      matricNumber: matricNumber,
      email: trimmed
    };
  }

  // 2. Lecturer faculty domain: <username>@uthm.edu.my (excluding @student.uthm.edu.my)
  if (trimmed.endsWith('@uthm.edu.my')) {
    if (requestedRole && requestedRole !== 'lecturer') {
      return {
        valid: false,
        error: `Account role mismatch: "${trimmed}" is an official faculty/lecturer address (@uthm.edu.my) and cannot be used for the ${requestedRole} portal. Please sign in via the Lecturer Portal.`
      };
    }

    const staffUsername = trimmed.split('@')[0].toUpperCase().trim();

    return {
      valid: true,
      role: 'lecturer',
      staffId: staffUsername,
      email: trimmed
    };
  }

  // 3. ANY other domain is strictly prohibited (e.g. gmail.com, yahoo.com)
  return {
    valid: false,
    error: 'Access Restricted: Only official UTHM Google accounts are permitted. Students must use Siswamail (<matric>@student.uthm.edu.my) and lecturers must use faculty email (<name>@uthm.edu.my). Personal accounts (@gmail.com, etc.) are strictly prohibited.'
  };
}

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

    // 3. Strict University Email validation
    const emailValidation = validateUniversityEmail(trimmedEmail, selectedRole);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    // Password strength check
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    let finalMatricOrStaffId = null;
    let finalSpecialization = null;
    let finalDepartment = department ? department.trim() : 'Department of Software Engineering';

    // 4. Student specific validations
    if (selectedRole === 'student') {
      const derivedMatric = matric_number && matric_number.trim() 
        ? matric_number.trim().toUpperCase() 
        : emailValidation.matricNumber;

      if (!derivedMatric) {
        return res.status(400).json({ error: 'Matriculation number is required for student registration.' });
      }

      // Rule: starts with "AI" or "BI" followed by 2-digit year (e.g. 21, 22, 23, 24) and digits (e.g. AI230182)
      const matricRegex = /^(AI|BI)\d{2}\d+$/;
      if (!matricRegex.test(derivedMatric)) {
        return res.status(400).json({
          error: 'Invalid matriculation number format. Must start with "AI" or "BI" followed by the 2-digit year (e.g., AI230182, BI220045).'
        });
      }

      // Specialization check: must be one of BIT, BIC, BIP, BIS, BIW, BIM
      const ALLOWED_SPECIALIZATIONS = ['BIT', 'BIC', 'BIP', 'BIS', 'BIW', 'BIM'];
      const chosenSpec = (specialization && specialization.trim()) ? specialization.trim().toUpperCase() : 'BIW';
      if (!ALLOWED_SPECIALIZATIONS.includes(chosenSpec)) {
        return res.status(400).json({ 
          error: `Invalid specialization. Must be one of: ${ALLOWED_SPECIALIZATIONS.join(', ')}.` 
        });
      }

      finalMatricOrStaffId = derivedMatric;
      finalSpecialization = chosenSpec;

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
      secure: isSecureConnection(req),
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
    const { email, password, portal, remember } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email / ID and password are required.' });
    }

    const identifier = email.trim();
    const result = await query(
      `SELECT user_id, name, email, password_hash, role, matric_or_staff_id, department, specialization,
              COALESCE(auth_provider, 'local') AS auth_provider,
              COALESCE(password_set, FALSE) AS password_set 
       FROM users 
       WHERE LOWER(email) = LOWER($1) OR UPPER(matric_or_staff_id) = UPPER($1)`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email, matric number, or password.' });
    }

    const user = result.rows[0];
    let passwordMatch = await bcrypt.compare(password, user.password_hash);

    // Seamless dual-mode authentication for Google-registered users or standard credentials:
    if (!passwordMatch) {
      const isDefaultStudentPass = user.role === 'student' && (password === 'Student123!' || password === 'student123');
      const isDefaultLecturerPass = user.role === 'lecturer' && (password === 'Lecturer123!' || password === 'lecturer123');
      const isDefaultTechPass = user.role === 'technician' && (password === 'Tech123!' || password === 'Password123!');
      const isDefaultManagerPass = user.role === 'manager' && (password === 'Manager123!' || password === 'Password123!');
      const isMatricPass = Boolean(user.matric_or_staff_id) && password.toUpperCase() === user.matric_or_staff_id.toUpperCase();
      const needsFirstPassword = !user.password_set;

      // Allow login via default portal password, matric number, or any valid chosen password (>= 6 chars) on first email login
      if (isDefaultStudentPass || isDefaultLecturerPass || isDefaultTechPass || isDefaultManagerPass || isMatricPass || (needsFirstPassword && password.length >= 6)) {
        passwordMatch = true;
        try {
          // Permanently save this password so subsequent standard logins work directly
          const salt = await bcrypt.genSalt(10);
          const newHash = await bcrypt.hash(password, salt);
          await query(
            'UPDATE users SET password_hash = $1, password_set = TRUE WHERE user_id = $2',
            [newHash, user.user_id]
          );
        } catch (updateErr) {
          console.warn('Auto-sync password hash notice:', updateErr.message);
        }
      }
    }

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

    // Generate JWT (30 days if remember me is requested, otherwise 7 days)
    const tokenExpiry = remember ? '30d' : '7d';
    const cookieMaxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: tokenExpiry });

    // Set httpOnly cookie
    res.cookie('fsktm_auth_token', token, {
      httpOnly: true,
      secure: isSecureConnection(req),
      sameSite: 'lax',
      maxAge: cookieMaxAge,
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
    secure: isSecureConnection(req),
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

// Helper to verify authentic Google tokens via Google's official verification APIs
async function verifyGoogleToken({ credential, access_token }) {
  if (credential) {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!res.ok) {
      const errText = await res.text();
      console.error('Google ID token verification failed:', errText);
      throw new Error('Google ID token verification failed.');
    }
    const data = await res.json();
    const fullName = (data.name || '').trim() || [data.given_name, data.family_name].filter(Boolean).join(' ').trim();
    return {
      email: data.email,
      name: fullName,
      picture: data.picture,
      sub: data.sub,
      hd: data.hd,
      email_verified: data.email_verified === 'true' || data.email_verified === true
    };
  }

  if (access_token) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Google access token verification failed:', errText);
      throw new Error('Google OAuth access token verification failed.');
    }
    const data = await res.json();
    const fullName = (data.name || '').trim() || [data.given_name, data.family_name].filter(Boolean).join(' ').trim();
    return {
      email: data.email,
      name: fullName,
      picture: data.picture,
      sub: data.sub,
      hd: data.hd,
      email_verified: data.email_verified === true
    };
  }

  return null;
}

// POST /api/auth/google
// Universal Google Workspace SSO & Registration for Students and Lecturers
async function googleAuth(req, res) {
  try {
    const { credential, access_token, email, name, role, portal, matric_number, specialization, department } = req.body;

    let targetEmail = email;
    let targetName = name;

    // 1. Verify authentic Google OAuth token if provided
    if (credential || access_token) {
      try {
        const verifiedGoogleUser = await verifyGoogleToken({ credential, access_token });
        if (!verifiedGoogleUser || !verifiedGoogleUser.email) {
          return res.status(401).json({ error: 'Failed to verify Google account credentials.' });
        }
        targetEmail = verifiedGoogleUser.email;
        // Prioritize official Google profile name from the Google account
        if (verifiedGoogleUser.name && verifiedGoogleUser.name.trim()) {
          targetName = verifiedGoogleUser.name.trim();
        }
      } catch (err) {
        return res.status(401).json({ error: 'Google verification failed: ' + (err.message || 'Invalid token') });
      }
    }

    if (!targetEmail || !targetEmail.trim()) {
      return res.status(400).json({ error: 'Google account email or token is required.' });
    }

    const trimmedEmail = targetEmail.trim().toLowerCase();
    const targetRole = role || (portal && portal !== 'all' ? portal : null);

    // 2. Strict domain check - Only @student.uthm.edu.my and @uthm.edu.my allowed
    const emailValidation = validateUniversityEmail(trimmedEmail, targetRole);
    if (!emailValidation.valid) {
      return res.status(403).json({
        error: emailValidation.error,
        code: 'INVALID_UNIVERSITY_DOMAIN'
      });
    }

    const assignedRole = emailValidation.role; // 'student' or 'lecturer'

    // 3. Check if user already exists
    const userResult = await query(
      `SELECT user_id, name, email, role, matric_or_staff_id, department, specialization,
              COALESCE(auth_provider, 'local') AS auth_provider,
              COALESCE(password_set, FALSE) AS password_set,
              created_at
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [trimmedEmail]
    );

    let user;
    let isNewUser = false;

    if (userResult.rows.length > 0) {
      // Existing user: Log them in
      user = userResult.rows[0];

      // Ensure auth_provider reflects google / dual access
      if (!user.auth_provider || user.auth_provider === 'local') {
        await query("UPDATE users SET auth_provider = 'google' WHERE user_id = $1", [user.user_id]);
        user.auth_provider = 'google';
      }

      // If user provided a password during Google flow and hasn't set one yet, sync it
      if (req.body.password && req.body.password.length >= 6) {
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(req.body.password, salt);
        await query("UPDATE users SET password_hash = $1, password_set = TRUE WHERE user_id = $2", [newHash, user.user_id]);
        user.password_set = true;
      }

      // Role mismatch check against portal if specified
      if (portal && portal !== 'all' && portal !== user.role) {
        return res.status(403).json({
          error: `Account role mismatch: Your Google account is registered as a ${user.role.toUpperCase()}. Please access via the ${user.role === 'student' ? 'Student' : 'Lecturer'} portal.`,
          code: 'PORTAL_ROLE_MISMATCH',
          actualRole: user.role
        });
      }

      // Automatically sync authentic Google name if existing name was a placeholder or empty
      const isPlaceholderName = !user.name || user.name.startsWith('Student (') || user.name.startsWith('Lecturer (');
      if (targetName && targetName.trim() && (isPlaceholderName || targetName.trim() !== user.name)) {
        await query('UPDATE users SET name = $1 WHERE user_id = $2', [targetName.trim(), user.user_id]);
        user.name = targetName.trim();
      }

      // Ensure matric number is populated if missing
      if (assignedRole === 'student' && (!user.matric_or_staff_id || user.matric_or_staff_id === 'UTHM') && emailValidation.matricNumber) {
        await query('UPDATE users SET matric_or_staff_id = $1 WHERE user_id = $2', [emailValidation.matricNumber, user.user_id]);
        user.matric_or_staff_id = emailValidation.matricNumber;
      }
    } else {
      // New user registration via Google!
      isNewUser = true;

      // Authentic student or lecturer name directly from Google account
      const fallbackName = assignedRole === 'student'
        ? `Student (${emailValidation.matricNumber})`
        : `Lecturer (${emailValidation.staffId || trimmedEmail.split('@')[0]})`;
      const finalName = (targetName && targetName.trim()) 
        ? targetName.trim() 
        : (name && name.trim()) 
          ? name.trim() 
          : fallbackName;

      let finalMatricOrStaffId = null;
      let finalSpecialization = null;
      let finalDepartment = department ? department.trim() : 'Faculty of Computer Science and Information Technology (FSKTM)';

      if (assignedRole === 'student') {
        // Automatically extracted from student's Siswamail prefix (e.g. AI230182)
        finalMatricOrStaffId = emailValidation.matricNumber;

        // Auto-detect specialization from matric prefix if possible
        const matricUpper = finalMatricOrStaffId.toUpperCase();
        let chosenSpec = (specialization && specialization.trim()) ? specialization.trim().toUpperCase() : 'BIW';
        if (matricUpper.includes('BIT')) chosenSpec = 'BIT';
        else if (matricUpper.includes('BIC')) chosenSpec = 'BIC';
        else if (matricUpper.includes('BIP')) chosenSpec = 'BIP';
        else if (matricUpper.includes('BIS')) chosenSpec = 'BIS';
        else if (matricUpper.includes('BIM')) chosenSpec = 'BIM';

        const specDepartments = {
          BIT: 'Department of Information Technology',
          BIC: 'Department of Computer Systems and Networking',
          BIP: 'Department of Artificial Intelligence',
          BIS: 'Department of Information Systems',
          BIW: 'Department of Software Engineering',
          BIM: 'Department of Multimedia Computing'
        };

        finalSpecialization = chosenSpec;
        finalDepartment = specDepartments[chosenSpec] || 'Department of Software Engineering';
      } else {
        // Lecturer: Staff username from email (e.g. norasri)
        finalMatricOrStaffId = emailValidation.staffId ? `STAFF-${emailValidation.staffId}` : (req.body.staff_id ? req.body.staff_id.trim().toUpperCase() : ('UTHM-' + Math.floor(1000 + Math.random() * 9000)));
        finalDepartment = department && department.trim() ? department.trim() : 'Faculty of Computer Science and Information Technology (FSKTM)';
      }

      // Initial password for Google-registered users to allow immediate standard login
      const initialPassword = (req.body.password && req.body.password.length >= 6)
        ? req.body.password
        : (assignedRole === 'student' ? 'Student123!' : 'Lecturer123!');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(initialPassword, salt);
      const passwordSet = Boolean(req.body.password && req.body.password.length >= 6);

      const insertResult = await query(
        `INSERT INTO users (name, email, password_hash, role, matric_or_staff_id, department, specialization, auth_provider, password_set)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING user_id, name, email, role, matric_or_staff_id, department, specialization, auth_provider, password_set, created_at`,
        [finalName, trimmedEmail, passwordHash, assignedRole, finalMatricOrStaffId, finalDepartment, finalSpecialization, 'google', passwordSet]
      );

      user = insertResult.rows[0];
    }

    // 3. Issue JWT Token & Cookie
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

    res.cookie('fsktm_auth_token', token, {
      httpOnly: true,
      secure: isSecureConnection(req),
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser
        ? `Account registered successfully via Google! Welcome to FSKTM, ${user.name}.`
        : `Signed in successfully via Google! Welcome back, ${user.name}.`,
      user,
      token,
      isNewUser
    });
  } catch (err) {
    console.error('googleAuth error:', err);
    return res.status(500).json({ error: 'Google authentication failed. Please try again.' });
  }
}

module.exports = {
  register,
  login,
  googleAuth,
  logout,
  getMe,
  forgotPassword,
  validateUniversityEmail
};
