import { useAuth } from '@/context/AuthContext';
import { CookieBanner } from './CookieBanner';

export const GlobalCookieBanner = () => {
  const { isAuthenticated } = useAuth();

  // Only show for authenticated users
  // Non-authenticated users will see it on public pages if needed
  if (!isAuthenticated) {
    return null;
  }

  return <CookieBanner />;
};
