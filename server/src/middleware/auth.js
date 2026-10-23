const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fsktm_fms_super_secret_jwt_key_2026';

// Role hierarchy mapping
const ROLE_PERMISSIONS = {
  student: ['student'],
  lecturer: ['student', 'lecturer'],
  technician: ['student', 'technician'],
  manager: ['student', 'lecturer', 'technician', 'manager']
};

function authenticateToken(req, res, next) {
  let token = null;

  // Check httpOnly cookies first
  if (req.cookies && req.cookies.fsktm_auth_token) {
    token = req.cookies.fsktm_auth_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. Please log in to continue.',
      code: 'UNAUTHENTICATED'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Session expired or invalid token. Please log in again.',
      code: 'INVALID_TOKEN'
    });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userRole = req.user.role;
    const effectiveRoles = ROLE_PERMISSIONS[userRole] || [userRole];

    const hasPermission = allowedRoles.some(role => effectiveRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        error: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${userRole}`,
        code: 'FORBIDDEN'
      });
    }

    next();
  };
}

function optionalAuth(req, res, next) {
  let token = null;
  if (req.cookies && req.cookies.fsktm_auth_token) {
    token = req.cookies.fsktm_auth_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (_) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  JWT_SECRET
};

