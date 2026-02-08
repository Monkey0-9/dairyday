export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  // This is now just a hint. The real check happens server-side via cookies.
  return !!localStorage.getItem('user_role');
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('user_role');
}

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('user_id');
}

export function setAuthData(role: string, userId: string, name?: string) {
  localStorage.setItem('user_role', role);
  localStorage.setItem('user_id', userId);
  if (name) localStorage.setItem('user_name', name);
}

export function clearAuthData() {
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_name');
}

export function requireAuth(role?: 'ADMIN' | 'USER') {
  if (typeof window === 'undefined') return true;

  const userRole = getUserRole();
  if (!userRole) {
    window.location.href = '/login';
    return false;
  }
  if (role && userRole !== role) {
    window.location.href = '/';
    return false;
  }
  return true;
}
