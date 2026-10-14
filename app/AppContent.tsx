import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getStoredAuthUser, type StoredUser } from './services/auth';
import LoginPage from './components/LoginPage';
import AppLayout from './components/AppLayout';

export default function AppContent() {
  const queryClient = useQueryClient();
  const [authUser, setAuthUser] = useState<StoredUser | null>(() => getStoredAuthUser());

  if (!authUser) {
    return <LoginPage onLoginSuccess={(user) => { setAuthUser(user); queryClient.clear(); }} />;
  }

  return <AppLayout authUser={authUser} onLogout={() => setAuthUser(null)} />;
}
