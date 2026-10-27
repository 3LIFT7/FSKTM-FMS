/**
 * Resolves the target destination URL after successful authentication,
 * preserving pathname, query string (?code=..., ?tab=...), and hash.
 */
export function getRedirectDestination(location, fallbackPath = '/') {
  // 1. From React Router location state
  const fromState = location?.state?.from;
  if (fromState) {
    if (typeof fromState === 'string' && fromState.trim().length > 0) {
      return fromState;
    }
    if (typeof fromState === 'object' && fromState.pathname) {
      const path = fromState.pathname;
      const search = fromState.search || '';
      const hash = fromState.hash || '';
      return `${path}${search}${hash}`;
    }
  }

  // 2. From URL query params (?redirect=... or ?from=...)
  if (location?.search) {
    const params = new URLSearchParams(location.search);
    const redirectParam = params.get('redirect') || params.get('from');
    if (redirectParam && redirectParam.startsWith('/')) {
      return redirectParam;
    }
  }

  return fallbackPath;
}
