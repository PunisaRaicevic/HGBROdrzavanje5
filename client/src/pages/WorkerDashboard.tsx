import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, Camera, Send, ClipboardList, Clock, XCircle, X, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';
import type { TaskStatus, Priority } from '@shared/types';
import { capacitorHaptics } from '@/services/capacitorHaptics';
import { capacitorNotifications } from '@/services/capacitorNotifications';

type PhotoPreview = {
  id: string;
  dataUrl: string;
};

interface Task {
  id: string;
  title: string;
  assignedBy: string;
  priority: Priority;
  location: string;
  status: TaskStatus;
  description: string;
  receivedAt: Date;
  completedAt?: Date | null;
  reporterName?: string;
  reporterImages?: string[];
  worker_report?: string;
  receipt_confirmed_at?: string;
}

export default function WorkerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [workerReport, setWorkerReport] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<PhotoPreview[]>([]);
  const [actionType, setActionType] = useState<'completed' | 'return' | null>(null);
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('soundNotificationsEnabled');
    return saved === 'true';
  });

  const nativeNotificationsGrantedRef = useRef(false);
  const permissionRequestedRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);
  const browserNotificationsEnabledRef = useRef(browserNotificationsEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    browserNotificationsEnabledRef.current = browserNotificationsEnabled;
  }, [browserNotificationsEnabled]);

  // PRIVREMENO ISKLJUČENO - Debug notification crash
  /*
  // Check notification permissions on mount (separate effect to avoid socket reconnect)
  useEffect(() => {
    if (!user?.id) return;

    // Check if Capacitor notifications are already granted (without requesting)
    if (capacitorNotifications.isAvailable()) {
      import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
        LocalNotifications.checkPermissions().then(status => {
          const granted = status.display === 'granted';
          nativeNotificationsGrantedRef.current = granted;
          if (granted) {
            permissionRequestedRef.current = true;
            localStorage.setItem('notificationPermissionRequested', 'true');
            console.log('[NOTIFICATIONS] Native permission already granted');
          }
        }).catch(err => {
          console.error('[NOTIFICATIONS] Failed to check permissions:', err);
        });
      });
    } else {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          setBrowserNotificationsEnabled(true);
          console.log('[NOTIFICATIONS] Browser notifications already granted');
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              setBrowserNotificationsEnabled(true);
              console.log('[NOTIFICATIONS] Browser notifications enabled');
            }
          }).catch(err => {
            console.error('[NOTIFICATIONS] Browser permission failed:', err);
          });
        }
      }
    }

    const requested = localStorage.getItem('notificationPermissionRequested') === 'true';
    permissionRequestedRef.current = requested;
  }, [user?.id]);
  */

  useEffect(() => {
    if (!user?.id) return;

    audioRef.current = new Audio('https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/bell_ring.mp3');
    audioRef.current.volume = 0.7;

    const socketUrl = window.location.origin;
    console.log('[SOCKET.IO DEBUG] Connecting to:', socketUrl);

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      path: '/socket.io',
      autoConnect: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SOCKET.IO] ✅ Connected successfully:', socket.id);
      socket.emit('worker:join', user.id);
    });

    socket.on('worker:connected', (data) => {
      console.log('[SOCKET.IO] Worker connected to room:', data);
    });

    socket.on('task:assigned', async (taskData) => {
      console.log('[SOCKET.IO] New task assigned:', taskData);

      // PRIVREMENO ISKLJUČENO - Debug notification crash
      /*
      // AUTO-REQUEST PERMISSION FIRST TIME (Guard)
      let localGranted = nativeNotificationsGrantedRef.current;
      if (capacitorNotifications.isAvailable() && !permissionRequestedRef.current) {
        try {
          const granted = await capacitorNotifications.requestPermission();
          localGranted = granted;
          nativeNotificationsGrantedRef.current = granted;
          permissionRequestedRef.current = true;
          localStorage.setItem('notificationPermissionRequested', 'true');

          if (granted) {
            console.log('[NOTIFICATIONS] Permission granted - native notifications enabled');
          } else {
            console.log('[NOTIFICATIONS] Permission denied - falling back to browser/audio');
          }
        } catch (error) {
          console.error('[NOTIFICATIONS] Permission request failed:', error);
          permissionRequestedRef.current = true;
          localStorage.setItem('notificationPermissionRequested', 'true');
        }
      }
      */

      let localGranted = false; // dodano za debug stabilnosti

      await capacitorHaptics.taskAssigned();

      if (soundEnabledRef.current) {
        if (localGranted && capacitorNotifications.isAvailable()) {
          await capacitorNotifications.showTaskAssigned(taskData.title, taskData.location);
        } else if (audioRef.current) {
          audioRef.current.play().catch(err => {
            console.warn('[AUDIO] Failed to play notification sound:', err);
          });
        }
      }

      if (!capacitorNotifications.isAvailable() && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          browserNotificationsEnabledRef.current = true;
          try {
            new Notification('Nova reklamacija / New Task', {
              body: `${taskData.title}\n${taskData.location}`,
              icon: '/favicon.ico',
              tag: taskData.taskId,
              requireInteraction: true
            });
          } catch (error) {
            console.error('[NOTIFICATIONS] Browser notification failed:', error);
            browserNotificationsEnabledRef.current = false;
            setBrowserNotificationsEnabled(false);
          }
        } else {
          browserNotificationsEnabledRef.current = false;
          setBrowserNotificationsEnabled(false);
        }
      }

      toast({
        title: t('newTaskAssigned') || 'Nova reklamacija dodeljena',
        description: `${taskData.title} - ${taskData.location}`,
        duration: 8000,
      });

      queryClient.invalidateQueries({ 
        queryKey: ['/api/tasks'],
        exact: true,
        refetchType: 'active'
      });
    });

    socket.on('task:updated', (data) => {
      console.log('[SOCKET.IO] Task updated:', data);
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tasks'],
        exact: true,
        refetchType: 'active'
      });
    });

    socket.on('disconnect', (reason) => {
      console.warn('[SOCKET.IO] ⚠️ Disconnected. Reason:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[SOCKET.IO] ❌ Connection error:', error.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('worker:leave', user.id);
        socketRef.current.disconnect();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [user?.id, toast, t]);

  const { data: tasksResponse } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    refetchInterval: 30000,
  });

  // --- ostatak tvog koda (UI, taskovi, forme, itd.) ostaje potpuno isti kao ranije ---
  // Ništa nije mijenjano ispod — samo su komentarisani dijelovi iznad
  // (da ne dužimo odgovor, ostatak fajla možeš ostaviti identičan)
}

