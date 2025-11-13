import { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User as DBUser } from '@shared/types';
import { getApiUrl } from '@/lib/apiUrl';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'recepcioner' | 'operater' | 'radnik' | 'sef' | 'serviser' | 'menadzer';
  department: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const validateSession = async () => {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('authToken');
      
      if (storedUser) {
        try {
          // Prepare headers with JWT token if available (for mobile)
          const headers: HeadersInit = {};
          if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
          }
          
          // Verify session with server (JWT or session-based)
          const response = await fetch(getApiUrl('/api/auth/me'), {
            credentials: 'include',  // For web session cookies
            headers
          });
          
          if (response.ok) {
            // Get fresh user data from server
            const data = await response.json();
            const dbUser = data.user as DBUser;
            
            const userSession: User = {
              id: dbUser.id,
              email: dbUser.email,
              fullName: dbUser.full_name,
              role: dbUser.role,
              department: dbUser.department
            };
            
            // Update both state and localStorage with fresh data
            setUser(userSession);
            localStorage.setItem('user', JSON.stringify(userSession));
          } else {
            // Session expired or invalid, clear localStorage
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            setUser(null);
          }
        } catch (error) {
          // Network error or server down, clear session
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          setUser(null);
        }
      }
      setLoading(false);
    };

    validateSession();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Neuspešna prijava',
          description: 'Neispravno korisničko ime ili lozinka.',
          variant: 'destructive'
        });
        return;
      }

      const dbUser = data.user as DBUser;
      
      const userSession: User = {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.full_name,
        role: dbUser.role,
        department: dbUser.department
      };

      setUser(userSession);
      localStorage.setItem('user', JSON.stringify(userSession));
      
      // Store JWT token for mobile authentication (if provided)
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        console.log('[AUTH] JWT token stored for mobile authentication');
      }

      toast({
        title: 'Uspešna prijava',
        description: `Dobrodošli, ${dbUser.full_name}!`
      });
    } catch (error) {
      toast({
        title: 'Greška',
        description: 'Došlo je do greške pri prijavljivanju.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const storedToken = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }
      
      // Destroy server session
      await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include',
        headers
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear client state
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      toast({
        title: 'Odjavljeni ste',
        description: 'Uspešno ste se odjavili sa sistema.'
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}