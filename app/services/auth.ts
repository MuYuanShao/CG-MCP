import { clearAuthToken, requestJson, setAuthToken } from '../lib/api';

export type LoginResponse = {
  token: string;
  username: string;
  role: string;
  permissions: string[];
};

/** User info persisted across refreshes (never contains the access token). */
export type StoredUser = Omit<LoginResponse, 'token'>;

function storeUserInfo(data: LoginResponse) {
  const { token: _token, ...userInfo } = data;
  setAuthToken(_token);
  try {
    sessionStorage.setItem('spd_auth_user', JSON.stringify(userInfo));
  } catch {
    // sessionStorage may be unavailable (private browsing, etc.)
  }
}

function clearSession() {
  clearAuthToken();
  try {
    sessionStorage.removeItem('spd_auth_user');
  } catch {
    // ignore
  }
}

export async function login(username: string, password: string) {
  const result = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  storeUserInfo(result.data);
  return result.data;
}

export async function refreshAuth() {
  clearAuthToken();
  const result = await requestJson<LoginResponse>('/auth/refresh', {
    method: 'POST',
  });
  storeUserInfo(result.data);
  return result.data;
}

export async function logout() {
  try {
    await requestJson<void>('/auth/logout', {
      method: 'POST',
    });
  } catch {
    // best-effort
  }
  clearSession();
}

export function getStoredAuthUser(): StoredUser | null {
  try {
    const raw = sessionStorage.getItem('spd_auth_user');
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    clearSession();
    return null;
  }
}
