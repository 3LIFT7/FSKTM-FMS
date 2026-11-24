/**
 * Resolves the target destination URL after successful authentication,
 * preserving pathname, query string (?code=..., ?tab=...), and hash.
 */
export function getRedirectDestination(location, fallbackPath = '/') {
  // If the user explicitly logged out, always navigate to their role dashboard
  if (location?.state?.loggedOut || sessionStorage.getItem('fsktm_logged_out')) {
    sessionStorage.removeItem('fsktm_logged_out');
    return fallbackPath;
  }

  // 1. From React Router location state
  const fromState = location?.state?.from;
  if (fromState) {
    let target = '';
    if (typeof fromState === 'string' && fromState.trim().length > 0) {
      target = fromState;
    } else if (typeof fromState === 'object' && fromState.pathname) {
      const path = fromState.pathname;
      const search = fromState.search || '';
      const hash = fromState.hash || '';
      target = `${path}${search}${hash}`;
    }

    // Only redirect to explicit deep links like classroom feedback / QR scans
    // If it's a general app page or dashboard, prefer starting at the user's role dashboard
    if (target && (target.startsWith('/room-feedback') || target.startsWith('/qr'))) {
      return target;
    }
  }

  // 2. From URL query params (?redirect=... or ?from=...)
  if (location?.search) {
    const params = new URLSearchParams(location.search);
    const redirectParam = params.get('redirect') || params.get('from');
    if (redirectParam && redirectParam.startsWith('/')) {
      if (redirectParam.startsWith('/room-feedback') || redirectParam.startsWith('/qr')) {
        return redirectParam;
      }
    }
  }

  return fallbackPath;
}

/**
 * Returns the default dashboard URL for a user based on their role.
 * - student: /student
 * - lecturer: /lecturer
 * - technician: /staff
 * - manager: /staff
 */
export function getDashboardForRole(role) {
  if (role === 'lecturer') return '/lecturer';
  if (role === 'technician' || role === 'manager') return '/staff';
  return '/student';
}

