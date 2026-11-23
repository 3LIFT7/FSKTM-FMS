const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const DEFAULT_DEV_SECRET = 'fsktm_fms_super_secret_jwt_key_2026';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret === DEFAULT_DEV_SECRET || secret.length < 16) {
      throw new Error(
        'CRITICAL SECURITY ERROR: A strong, explicitly configured JWT_SECRET (>= 16 chars) is required in production.'
      );
    }
    return secret;
  }
  return secret || DEFAULT_DEV_SECRET;
}

// Fail fast if started in production with an insecure secret
if (process.env.NODE_ENV === 'production') {
  getJwtSecret();
}

function extractToken(req) {
  if (req.cookies && req.cookies.fsktm_auth_token) {
    return req.cookies.fsktm_auth_token;
  }
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
}

async function fetchActiveUser(userId) {
  if (!userId) return null;
  const res = await query(
    `SELECT user_id, name, email, role, matric_or_staff_id, department, specialization
     FROM users
     WHERE user_id = $1`,
    [userId]
  );
  return res.rows[0] || null;
}

async function authenticateToken(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. Please log in to continue.',
      code: 'UNAUTHENTICATED',
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (err) {
    return res.status(401).json({
      error: 'Session expired or invalid token. Please log in again.',
      code: 'INVALID_TOKEN',
    });
  }

  try {
    // Always verify against the live database so deleted accounts or role changes take effect immediately
    const liveUser = await fetchActiveUser(decoded.user_id);
    if (!liveUser) {
      return res.status(401).json({
        error: 'User account no longer exists or has been deactivated.',
        code: 'USER_NOT_FOUND',
      });
    }

    req.user = liveUser;
    next();
  } catch (dbErr) {
    console.error('authenticateToken DB verification error:', dbErr);
    return res.status(500).json({ error: 'Internal authentication verification error.' });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
    }

    const userRole = req.user.role;
    const hasPermission = allowedRoles.includes(userRole);

    if (!hasPermission) {
      return res.status(403).json({
        error: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${userRole}`,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const liveUser = await fetchActiveUser(decoded.user_id);
    req.user = liveUser || null;
  } catch (_) {
    req.user = null;
  }
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  getJwtSecret,
  get JWT_SECRET() {
    return getJwtSecret();
  },
};
