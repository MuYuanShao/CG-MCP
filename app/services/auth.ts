import { requestJson } from '../lib/api';

export type LoginResponse = {
  token: string;
  username: string;
  role: string;
  permissions: string[];
};

function storeAuth(data: LoginResponse) {
  window.localStorage.removeItem('spd_refresh_token');
  window.localStorage.setItem('spd_auth_token', data.token);
  window.localStorage.setItem('spd_auth_user', JSON.stringify(data));
}

export async function login(username: string, password: string) {
  const result = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  storeAuth(result.data);
  return result.data;
}

export async function refreshAuth() {
  const result = await requestJson<LoginResponse>('/auth/refresh', {
    method: 'POST',
  });
  storeAuth(result.data);
  return result.data;
}

export async function logout() {
  try {
    await requestJson<void>('/auth/logout', {
      method: 'POST',
    });
  } catch {
  }
  window.localStorage.removeItem('spd_auth_token');
  window.localStorage.removeItem('spd_refresh_token');
  window.localStorage.removeItem('spd_auth_user');
}

export function getStoredAuthUser() {
  window.localStorage.removeItem('spd_refresh_token');
  const raw = window.localStorage.getItem('spd_auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LoginResponse;
  } catch {
    window.localStorage.removeItem('spd_auth_token');
    window.localStorage.removeItem('spd_refresh_token');
    window.localStorage.removeItem('spd_auth_user');
    return null;
  }
}
