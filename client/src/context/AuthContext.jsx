import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('fsktm_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clean up any legacy raw JWT stored in localStorage; rely on httpOnly cookie
    localStorage.removeItem('fsktm_auth_token');
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user) {
          localStorage.setItem('fsktm_user', JSON.stringify(data.user));
        }
      } else if (res.status === 401) {
        setUser(null);
        localStorage.removeItem('fsktm_auth_token');
        localStorage.removeItem('fsktm_user');
      }
    } catch (err) {
      console.error('Session restore failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password, portal, remember = false) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, portal, remember }),
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {
      data = { error: res.statusText || 'Unexpected server response' };
    }

    if (!res.ok) {
      const errorMsg = data.error || 'Login failed. Please check your credentials.';
      const err = new Error(errorMsg);
      err.code = data.code;
      err.actualRole = data.actualRole;
      throw err;
    }

    localStorage.removeItem('fsktm_auth_token');
    sessionStorage.removeItem('fsktm_logged_out');
    if (data.user) {
      localStorage.setItem('fsktm_user', JSON.stringify(data.user));
    }

    setUser(data.user);
    return data.user;
  }

  async function googleAuth(authData) {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(authData),
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {
      data = { error: res.statusText || 'Unexpected server response' };
    }

    if (!res.ok) {
      const errorMsg = data.error || 'Google authentication failed. Please try again.';
      const err = new Error(errorMsg);
      err.code = data.code;
      err.actualRole = data.actualRole;
      throw err;
    }

    localStorage.removeItem('fsktm_auth_token');
    sessionStorage.removeItem('fsktm_logged_out');
    if (data.user) {
      localStorage.setItem('fsktm_user', JSON.stringify(data.user));
    }

    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('fsktm_auth_token');
      localStorage.removeItem('fsktm_user');
      sessionStorage.setItem('fsktm_logged_out', 'true');
      setUser(null);
    }
  }

  const value = {
    user,
    loading,
    login,
    googleAuth,
    logout,
    checkSession,
    isAuthenticated: !!user,
    isStudent: user?.role === 'student',
    isLecturer: user?.role === 'lecturer',
    isTechnician: user?.role === 'technician',
    isManager: user?.role === 'manager',
    isStaff: user?.role === 'technician' || user?.role === 'manager',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
