import AppHeader from '../AppHeader';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function AppHeaderExample() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppHeader />
      </AuthProvider>
    </ThemeProvider>
  );
}
