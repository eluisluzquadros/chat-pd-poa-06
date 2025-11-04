import { useAuth } from '@/context/AuthContext';
import { PublicStatusPage } from './PublicStatusPage';
import { AdminStatusPage } from './AdminStatusPage';

export function StatusPage() {
  const { isAdmin } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const forcePublicView = searchParams.get('view') === 'public';

  // Admin vê versão completa, usuário comum vê versão simplificada
  if (isAdmin && !forcePublicView) {
    return <AdminStatusPage />;
  }

  return <PublicStatusPage />;
}
