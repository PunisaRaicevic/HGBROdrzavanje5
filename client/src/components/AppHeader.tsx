import { Button } from '@/components/ui/button';
import { LogOut, Globe, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [audioEnabled, setAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('soundNotificationsEnabled');
    return saved === 'true';
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousTasksCountRef = useRef<number>(-1);
  const [acknowledgedTaskIds, setAcknowledgedTaskIds] = useState<Set<string>>(new Set());

  const handleLanguageToggle = () => {
    const newLang = i18n.language === 'en' ? 'sr' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const toggleAudio = () => {
    const newValue = !audioEnabled;
    setAudioEnabled(newValue);
    localStorage.setItem('soundNotificationsEnabled', String(newValue));
    
    if (newValue && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    
    toast({
      title: newValue ? 'Zvuk omogućen / Sound Enabled' : 'Zvuk onemogućen / Sound Disabled',
      description: newValue 
        ? 'Zvučne notifikacije su omogućene. / Sound notifications enabled.'
        : 'Zvučne notifikacije su onemogućene. / Sound notifications disabled.',
      duration: 3000,
    });
  };

  // Fetch new tasks for workers
  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks'],
    enabled: user?.role === 'radnik',
    refetchInterval: 5000, // Poll every 5 seconds for new tasks
  });

  // Load acknowledged task IDs from localStorage on mount and listen for updates
  useEffect(() => {
    if (user?.role === 'radnik') {
      const loadAcknowledgedTasks = () => {
        const stored = localStorage.getItem(`acknowledgedTasks_${user.email}`);
        if (stored) {
          setAcknowledgedTaskIds(new Set(JSON.parse(stored)));
        }
      };
      
      loadAcknowledgedTasks();
      
      // Listen for storage changes (when worker clicks on task)
      window.addEventListener('storage', loadAcknowledgedTasks);
      
      return () => {
        window.removeEventListener('storage', loadAcknowledgedTasks);
      };
    }
  }, [user]);

  // Count new tasks (assigned to worker but not yet acknowledged)
  useEffect(() => {
    if (user?.role === 'radnik' && Array.isArray(tasks)) {
      const assignedTasks = tasks.filter((task: any) => {
        // Check if task is assigned to this user
        if (!task.assigned_to || !user?.id) return false;
        
        // Handle multiple technicians (comma-separated IDs)
        const assignedIds = task.assigned_to.split(',').map((id: string) => id.trim());
        return assignedIds.includes(user.id) && task.status === 'assigned_to_radnik';
      });
      
      // Filter out acknowledged tasks
      const unacknowledgedTasks = assignedTasks.filter((task: any) => 
        !acknowledgedTaskIds.has(task.id)
      );
      
      const currentCount = unacknowledgedTasks.length;
      
      // Check if there are genuinely new tasks (skip on first fetch)
      if (currentCount > 0 && previousTasksCountRef.current >= 0) {
        const previousCount = previousTasksCountRef.current;
        
        // Only notify if the count increased
        if (currentCount > previousCount) {
          // Play notification sound only if audio is enabled
          if (audioEnabled && audioRef.current) {
            audioRef.current.play().catch(err => console.log('Audio play failed:', err));
          }
          
          // Show toast notification
          toast({
            title: t('newNotifications'),
            description: t('newTaskAssigned'),
            duration: 5000,
          });
        }
      }
      
      previousTasksCountRef.current = currentCount;
    }
  }, [tasks, user, t, toast, acknowledgedTaskIds, audioEnabled]);

  // Initialize audio context (single instance, reusable)
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    
    const initAudioContext = () => {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      // Resume context on user interaction to avoid autoplay blocking
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      return audioContext;
    };
    
    const playNotificationSound = () => {
      const ctx = initAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    };
    
    // Create audio handler
    audioRef.current = {
      play: () => {
        playNotificationSound();
        return Promise.resolve();
      }
    } as any;
    
    // Cleanup
    return () => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, []);

  return (
    <header className="flex items-center justify-between px-4 py-4 border-b bg-background sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{t('hotelManagement')}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          onClick={handleLanguageToggle}
          data-testid="button-language-toggle"
          className="gap-2 min-h-11"
        >
          <Globe className="h-5 w-5" />
          <span className="text-base font-medium">{i18n.language.toUpperCase()}</span>
        </Button>

        {/* Sound toggle - only for workers */}
        {user?.role === 'radnik' && (
          <Button
            variant={audioEnabled ? "default" : "outline"}
            onClick={toggleAudio}
            data-testid="button-toggle-sound"
            className="gap-2 min-h-11"
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span className="hidden sm:inline text-base">
              {audioEnabled ? 'Zvuk ON / Sound ON' : 'Zvuk OFF / Sound OFF'}
            </span>
          </Button>
        )}

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-base">{getInitials(user.fullName)}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block text-base">{user.fullName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-3">
                <p className="text-base font-medium">{user.fullName}</p>
                <p className="text-base text-muted-foreground">{t(user.role)}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} data-testid="button-logout" className="text-base py-2">
                <LogOut className="w-5 h-5 mr-2" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
