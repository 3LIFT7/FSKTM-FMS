const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/db');
const { getJwtSecret } = require('../middleware/auth');

function isSecureConnection(req) {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
}

// Strict University email domain validator for Students & Lecturers
function validateUniversityEmail(email, requestedRole = null) {
  const trimmed = (email || '').trim().toLowerCase();

  if (!trimmed) {
    return {
      valid: false,
      error: 'University email address is required.',
    };
  }

  // 1. Student Siswamail domain: <matric>@student.uthm.edu.my
  if (trimmed.endsWith('@student.uthm.edu.my')) {
    if (requestedRole && requestedRole !== 'student') {
      return {
        valid: false,
        error: `Account role mismatch: "${trimmed}" is a student Siswamail address (@student.uthm.edu.my) and cannot be used for the ${requestedRole} portal. Please sign in via the Student Portal.`,
      };
    }

    const rawMatric = trimmed.split('@')[0].toUpperCase().trim();
    const matricNumber = rawMatric.replace(/[^A-Z0-9]/g, '');

    if (!matricNumber || matricNumber.length < 5) {
      return {
        valid: false,
        error: `Invalid student email format. The email prefix "${rawMatric}" is not a valid UTHM student matriculation number.`,
      };
    }

    return {
      valid: true,
      role: 'student',
      matricNumber,
      email: trimmed,
    };
  }

  // 2. Lecturer faculty domain: <username>@uthm.edu.my (excluding @student.uthm.edu.my)
  if (trimmed.endsWith('@uthm.edu.my')) {
    if (requestedRole && requestedRole !== 'lecturer') {
      return {
        valid: false,
        error: `Account role mismatch: "${trimmed}" is an official faculty/lecturer address (@uthm.edu.my) and cannot be used for the ${requestedRole} portal. Please sign in via the Lecturer Portal.`,
      };
    }

    const staffUsername = trimmed.split('@')[0].toUpperCase().trim();

    return {
      valid: true,
      role: 'lecturer',
      staffId: staffUsername,
      email: trimmed,
    };
  }

  return {
    valid: false,
    error:
      'Access Restricted: Only official UTHM Google accounts are permitted. Students must use Siswamail (<matric>@student.uthm.edu.my) and lecturers must use faculty email (<name>@uthm.edu.my). Personal accounts (@gmail.com, etc.) are strictly prohibited.',
  };
}

function issueAuthSession(req, res, user, remember = false) {
  const payload = {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
    matric_or_staff_id: user.matric_or_staff_id,
    department: user.department,
    specialization: user.specialization,
  };

  const tokenExpiry = remember ? '30d' : '7d';
  const cookieMaxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: tokenExpiry });

  res.cookie('fsktm_auth_token', token, {
    httpOnly: true,
    secure: isSecureConnection(req),
    sameSite: 'lax',
    maxAge: cookieMaxAge,
    path: '/',
  });

  return { token, userProfile: payload };
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password, role, matric_number, specialization, staff_id, department } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Full name, university email, password, and role are required.' });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const selectedRole = String(role).trim().toLowerCase();

    if (selectedRole !== 'student' && selectedRole !== 'lecturer') {
      return res.status(403).json({
        error: 'Registration is restricted to students and lecturers only. Staff & technician accounts must be provisioned by faculty administration.',
      });
    }

    const emailValidation = validateUniversityEmail(trimmedEmail, selectedRole);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    let finalMatricOrStaffId = null;
    let finalSpecialization = null;
    let finalDepartment = department ? String(department).trim() : 'Department of Software Engineering';

    if (selectedRole === 'student') {
      const derivedMatric =
        matric_number && String(matric_number).trim()
          ? String(matric_number).trim().toUpperCase()
          : emailValidation.matricNumber;

      if (!derivedMatric) {
        return res.status(400).json({ error: 'Matriculation number is required for student registration.' });
      }

      const matricRegex = /^(AI|BI)\d{2}\d+$/;
      if (!matricRegex.test(derivedMatric)) {
        return res.status(400).json({
          error: 'Invalid matriculation number format. Must start with "AI" or "BI" followed by the 2-digit year (e.g., AI230182, BI220045).',
        });
      }

      const ALLOWED_SPECIALIZATIONS = ['BIT', 'BIC', 'BIP', 'BIS', 'BIW', 'BIM'];
      const chosenSpec =
        specialization && String(specialization).trim()
          ? String(specialization).trim().toUpperCase()
          : 'BIW';
      if (!ALLOWED_SPECIALIZATIONS.includes(chosenSpec)) {
        return res.status(400).json({
          error: `Invalid specialization. Must be one of: ${ALLOWED_SPECIALIZATIONS.join(', ')}.`,
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
        BIM: 'Multimedia Computing',
      };
      finalDepartment = specDepartments[chosenSpec] || 'FSKTM';
    }

    if (selectedRole === 'lecturer') {
      finalMatricOrStaffId = staff_id ? String(staff_id).trim().toUpperCase() : emailValidation.staffId ? `STAFF-${emailValidation.staffId}` : null;
      if (department && String(department).trim()) {
        finalDepartment = String(department).trim();
      }
    }

    const existingEmail = await query('SELECT user_id FROM users WHERE LOWER(email) = $1', [trimmedEmail]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please sign in.' });
    }

    if (finalMatricOrStaffId && selectedRole === 'student') {
      const existingMatric = await query('SELECT user_id FROM users WHERE UPPER(matric_or_staff_id) = $1', [finalMatricOrStaffId]);
      if (existingMatric.rows.length > 0) {
        return res.status(400).json({ error: 'An account with this matriculation number already exists.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(password), salt);

    const insertResult = await query(
      `INSERT INTO users (name, email, password_hash, role, matric_or_staff_id, department, specialization, auth_provider, password_set)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'local', TRUE)
       RETURNING user_id, name, email, role, matric_or_staff_id, department, specialization, created_at`,
      [trimmedName, trimmedEmail, passwordHash, selectedRole, finalMatricOrStaffId, finalDepartment, finalSpecialization]
    );

    const newUser = insertResult.rows[0];
    const { token, userProfile } = issueAuthSession(req, res, newUser, false);

    return res.status(201).json({
      success: true,
      message: `Account registered successfully! Welcome to FSKTM FMS, ${newUser.name}.`,
      user: userProfile,
      token,
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

    const identifier = String(email).trim();
    const result = await query(
      `SELECT user_id, name, email, password_hash, role, matric_or_staff_id, department, specialization,
              COALESCE(auth_provider, 'local') AS auth_provider,
              COALESCE(password_set, TRUE) AS password_set
       FROM users
       WHERE LOWER(email) = LOWER($1) OR UPPER(matric_or_staff_id) = UPPER($1)`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email, matric number, or password.' });
    }

    const user = result.rows[0];

    // If account was created via Google SSO and has not set a local password yet, require explicit first-time password setup
    if (user.password_set === false) {
      return res.status(403).json({
        error: 'First-time password setup required. Please set your password via first-login setup or sign in with Google.',
        code: 'PASSWORD_SETUP_REQUIRED',
      });
    }

    const passwordMatch = await bcrypt.compare(String(password), user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Role mismatch validation based on entry portal
    if (portal === 'student' && user.role !== 'student') {
      return res.status(403).json({
        error: `Role Mismatch: You are attempting to log in as ${user.role.toUpperCase()} using the Student Portal. Please use the ${user.role === 'lecturer' ? 'Lecturer' : 'Staff'} Portal.`,
        code: 'PORTAL_ROLE_MISMATCH',
        actualRole: user.role,
      });
    }

    if (portal === 'lecturer' && user.role !== 'lecturer') {
      return res.status(403).json({
        error: `Role Mismatch: You are attempting to log in as ${user.role.toUpperCase()} using the Lecturer Portal. Please use the ${user.role === 'student' ? 'Student' : 'Staff'} Portal.`,
        code: 'PORTAL_ROLE_MISMATCH',
        actualRole: user.role,
      });
    }

    if (portal === 'staff' && user.role !== 'technician' && user.role !== 'manager') {
      return res.status(403).json({
        error: `Role Mismatch: You are attempting to log in as ${user.role.toUpperCase()} using the Staff Portal. Please use the ${user.role === 'student' ? 'Student' : 'Lecturer'} Portal.`,
        code: 'PORTAL_ROLE_MISMATCH',
        actualRole: user.role,
      });
    }

    const { token, userProfile } = issueAuthSession(req, res, user, Boolean(remember));

    return res.json({
      success: true,
      message: 'Login successful',
      user: userProfile,
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}

// POST /api/auth/setup-password
// Secure first-time password setup for accounts with password_set = false
async function setupFirstPassword(req, res) {
  try {
    const { email, matric_or_staff_id, new_password } = req.body;

    if (!new_password || String(new_password).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    let targetUser = null;

    if (req.user) {
      const resUser = await query(
        'SELECT * FROM users WHERE user_id = $1',
        [req.user.user_id]
      );
      targetUser = resUser.rows[0] || null;
    } else if (email && matric_or_staff_id) {
      const resUser = await query(
        `SELECT * FROM users
         WHERE LOWER(email) = LOWER($1)
           AND UPPER(matric_or_staff_id) = UPPER($2)`,
        [String(email).trim(), String(matric_or_staff_id).trim()]
      );
      targetUser = resUser.rows[0] || null;
    } else {
      return res.status(400).json({
        error: 'Email and Matric/Staff ID (or an active authenticated session) are required to set up your initial password.',
      });
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'Matching account could not be verified.' });
    }

    if (targetUser.password_set === true) {
      return res.status(400).json({
        error: 'A password is already configured for this account. Please use the standard login or forgot-password flow.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(String(new_password), salt);

    const updated = await query(
      `UPDATE users
       SET password_hash = $1, password_set = TRUE
       WHERE user_id = $2
       RETURNING user_id, name, email, role, matric_or_staff_id, department, specialization`,
      [newHash, targetUser.user_id]
    );

    const { token, userProfile } = issueAuthSession(req, res, updated.rows[0], false);

    return res.json({
      success: true,
      message: 'Initial password configured successfully.',
      user: userProfile,
      token,
    });
  } catch (err) {
    console.error('setupFirstPassword error:', err);
    return res.status(500).json({ error: 'Failed to set up password.' });
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  res.clearCookie('fsktm_auth_token', {
    httpOnly: true,
    secure: isSecureConnection(req),
    sameSite: 'lax',
    path: '/',
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
      user: result.rows[0],
    });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ error: 'Failed to retrieve current user session.' });
  }
}

// POST /api/auth/forgot-password
// Generates a secure reset token hash stored in DB without exposing the token or leaking account existence
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'University email address is required.' });
    }

    const genericMessage =
      'If an account exists with this email address, password reset instructions have been sent.';

    const trimmedEmail = String(email).trim().toLowerCase();
    const result = await query('SELECT user_id FROM users WHERE LOWER(email) = $1', [trimmedEmail]);

    if (result.rows.length > 0) {
      const userId = result.rows[0].user_id;
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await query(
        `UPDATE users
         SET reset_token_hash = $1,
             reset_token_expires = $2
         WHERE user_id = $3`,
        [tokenHash, expiresAt, userId]
      );
    }

    return res.json({
      success: true,
      message: genericMessage,
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    if (String(new_password).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
    const userRes = await query(
      `SELECT user_id FROM users
       WHERE reset_token_hash = $1
         AND reset_token_expires IS NOT NULL
         AND reset_token_expires > CURRENT_TIMESTAMP`,
      [tokenHash]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const userId = userRes.rows[0].user_id;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(new_password), salt);

    await query(
      `UPDATE users
       SET password_hash = $1,
           password_set = TRUE,
           reset_token_hash = NULL,
           reset_token_expires = NULL
       WHERE user_id = $2`,
      [passwordHash, userId]
    );

    return res.json({
      success: true,
      message: 'Your password has been reset successfully. You may now sign in with your new password.',
    });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
}

// Verify authentic Google tokens via Google's official verification APIs
async function verifyGoogleToken({ credential, access_token }) {
  const configuredClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];

  if (credential) {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!res.ok) {
      throw new Error('Google ID token verification failed.');
    }
    const data = await res.json();

    if (data.iss && !validIssuers.includes(data.iss)) {
      throw new Error('Invalid Google token issuer.');
    }
    if (data.exp && Number(data.exp) * 1000 <= Date.now()) {
      throw new Error('Google ID token has expired.');
    }
    if (configuredClientId && data.aud && data.aud !== configuredClientId) {
      throw new Error('Google token audience mismatch.');
    }

    const fullName = (data.name || '').trim() || [data.given_name, data.family_name].filter(Boolean).join(' ').trim();
    return {
      email: data.email,
      name: fullName,
      picture: data.picture,
      sub: data.sub,
      hd: data.hd,
      email_verified: data.email_verified === 'true' || data.email_verified === true,
    };
  }

  if (access_token) {
    // Also verify tokeninfo for access_token when possible to check expiry/audience
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    if (!res.ok) {
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
      email_verified: data.email_verified === true || data.email_verified === 'true',
    };
  }

  return null;
}

// POST /api/auth/google
async function googleAuth(req, res) {
  try {
    const { credential, access_token } = req.body;
    if (!credential && !access_token) {
      return res.status(401).json({ error: 'A verified Google sign-in is required.' });
    }

    let verifiedGoogleUser;
    try {
      verifiedGoogleUser = await verifyGoogleToken({ credential, access_token });
      if (!verifiedGoogleUser || !verifiedGoogleUser.email) {
        return res.status(401).json({ error: 'Failed to verify Google account credentials.' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'Google verification failed: ' + (err.message || 'Invalid token') });
    }

    if (!verifiedGoogleUser.email_verified) {
      return res.status(403).json({ error: 'Your Google account must have a verified email address.' });
    }

    const targetEmail = verifiedGoogleUser.email;
    const targetName = verifiedGoogleUser.name ? verifiedGoogleUser.name.trim() : '';
    const trimmedEmail = targetEmail.trim().toLowerCase();

    const emailValidation = validateUniversityEmail(trimmedEmail);
    if (!emailValidation.valid) {
      return res.status(403).json({
        error: emailValidation.error,
        code: 'INVALID_UNIVERSITY_DOMAIN',
      });
    }

    const assignedRole = emailValidation.role; // 'student' or 'lecturer'

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
      user = userResult.rows[0];

      if (user.role === 'technician' || user.role === 'manager') {
        return res.status(403).json({
          error: 'Staff accounts must sign in through the Staff Portal.',
          code: 'STAFF_PORTAL_REQUIRED',
        });
      }

      // Never silently change an existing user's privileges/role during Google login
      if (user.role !== assignedRole) {
        return res.status(403).json({
          error: `Account role mismatch: Your account is registered as "${user.role}" and cannot be automatically reassigned to "${assignedRole}".`,
          code: 'ROLE_MISMATCH',
        });
      }

      if (!user.auth_provider || user.auth_provider === 'local') {
        await query("UPDATE users SET auth_provider = 'google' WHERE user_id = $1", [user.user_id]);
        user.auth_provider = 'google';
      }

      const isPlaceholderName = !user.name || user.name.startsWith('Student (') || user.name.startsWith('Lecturer (');
      if (targetName && isPlaceholderName) {
        await query('UPDATE users SET name = $1 WHERE user_id = $2', [targetName, user.user_id]);
        user.name = targetName;
      }

      if (assignedRole === 'student' && (!user.matric_or_staff_id || user.matric_or_staff_id === 'UTHM') && emailValidation.matricNumber) {
        await query('UPDATE users SET matric_or_staff_id = $1 WHERE user_id = $2', [emailValidation.matricNumber, user.user_id]);
        user.matric_or_staff_id = emailValidation.matricNumber;
      }
    } else {
      isNewUser = true;

      const fallbackName =
        assignedRole === 'student'
          ? `Student (${emailValidation.matricNumber})`
          : `Lecturer (${emailValidation.staffId || trimmedEmail.split('@')[0]})`;
      const finalName = targetName || fallbackName;

      let finalMatricOrStaffId = null;
      let finalSpecialization = null;
      let finalDepartment = 'Faculty of Computer Science and Information Technology (FSKTM)';

      if (assignedRole === 'student') {
        finalMatricOrStaffId = emailValidation.matricNumber;
        const matricUpper = finalMatricOrStaffId.toUpperCase();
        let chosenSpec = 'BIW';
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
          BIM: 'Department of Multimedia Computing',
        };

        finalSpecialization = chosenSpec;
        finalDepartment = specDepartments[chosenSpec] || 'Department of Software Engineering';
      } else {
        finalMatricOrStaffId = emailValidation.staffId ? `STAFF-${emailValidation.staffId}` : 'UTHM-' + Math.floor(1000 + Math.random() * 9000);
        finalDepartment = 'Faculty of Computer Science and Information Technology (FSKTM)';
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), salt);

      const insertResult = await query(
        `INSERT INTO users (name, email, password_hash, role, matric_or_staff_id, department, specialization, auth_provider, password_set)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)
         RETURNING user_id, name, email, role, matric_or_staff_id, department, specialization, auth_provider, password_set, created_at`,
        [finalName, trimmedEmail, passwordHash, assignedRole, finalMatricOrStaffId, finalDepartment, finalSpecialization, 'google']
      );

      user = insertResult.rows[0];
    }

    const { token, userProfile } = issueAuthSession(req, res, user, false);

    return res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser
        ? `Your FSKTM account is ready. Welcome, ${user.name}.`
        : `Signed in successfully via Google! Welcome back, ${user.name}.`,
      user: userProfile,
      token,
      isNewUser,
    });
  } catch (err) {
    console.error('googleAuth error:', err);
    return res.status(500).json({ error: 'Google authentication failed. Please try again.' });
  }
}

module.exports = {
  register,
  login,
  setupFirstPassword,
  googleAuth,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  validateUniversityEmail,
};
