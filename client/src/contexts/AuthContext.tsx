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
      
      // IMPORTANT: Clear old tokens BEFORE login to prevent stale data
      console.log('[AUTH] Clearing old authentication data before login...');
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      
      console.log('[AUTH] Attempting login for:', username);
      
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
        console.error('[AUTH] Login failed:', data);
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

      console.log('[AUTH] Login successful for:', dbUser.full_name, 'Role:', dbUser.role);
      
      setUser(userSession);
      localStorage.setItem('user', JSON.stringify(userSession));
      
      // Store JWT token for mobile authentication (if provided)
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        console.log('[AUTH] ✅ NEW JWT token stored:', data.token.substring(0, 50) + '...');
        
        // Send pending OneSignal Player ID if exists (received before login)
        const pendingPlayerId = localStorage.getItem('pending_onesignal_player_id');
        if (pendingPlayerId) {
          console.log('[AUTH] 📱 Sending pending OneSignal Player ID to server...');
          fetch(getApiUrl('/api/users/onesignal-player-id'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`
            },
            body: JSON.stringify({ playerId: pendingPlayerId })
          })
            .then(response => {
              if (response.ok) {
                console.log('[AUTH] ✅ Pending OneSignal Player ID successfully sent!');
                localStorage.removeItem('pending_onesignal_player_id');
              } else {
                console.error('[AUTH] ❌ Failed to send pending OneSignal Player ID');
              }
            })
            .catch(error => {
              console.error('[AUTH] ❌ Error sending pending OneSignal Player ID:', error);
            });
        }
      } else {
        console.warn('[AUTH] ⚠️ No JWT token received from server');
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
      console.log('[AUTH] Logging out...');
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
      console.error('[AUTH] Logout error:', error);
    } finally {
      // Always clear client state
      console.log('[AUTH] Clearing localStorage and session...');
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      console.log('[AUTH] ✅ Logout complete - all tokens cleared');
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