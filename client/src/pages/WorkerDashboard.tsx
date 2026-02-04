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
import { CheckCircle, Camera, Send, ClipboardList, Clock, XCircle, X, RotateCcw, ImagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';
import type { TaskStatus, Priority } from '@shared/types';
import { capacitorHaptics } from '@/services/capacitorHaptics';
import { capacitorNotifications } from '@/services/capacitorNotifications';
import { capacitorCamera } from '@/services/capacitorCamera';
import { upsertTaskInCache, scheduleBackgroundHydration, optimisticUpdateTask, removeTaskFromCache } from '@/lib/taskCache';
import { apiRequest } from '@/lib/queryClient';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { getApiUrl } from '@/lib/apiUrl';
import { Capacitor } from '@capacitor/core';

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
  parent_task_id?: string | null;
  scheduled_for?: string | null;
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
  const [actionType, setActionType] = useState<'completed' | 'return' | 'return_to_operator' | null>(null);
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  
  // Use refs to avoid stale closures in socket listener
  const nativeNotificationsGrantedRef = useRef(false);
  const permissionRequestedRef = useRef(false);
  const soundEnabledRef = useRef(
    localStorage.getItem('soundNotificationsEnabled') === 'true'
  );
  const browserNotificationsEnabledRef = useRef(browserNotificationsEnabled);
  
  // Sync sound enabled ref with localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('soundNotificationsEnabled');
      soundEnabledRef.current = saved === 'true';
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  useEffect(() => {
    browserNotificationsEnabledRef.current = browserNotificationsEnabled;
  }, [browserNotificationsEnabled]);

  // Check notification permissions on mount (separate effect to avoid socket reconnect)
  useEffect(() => {
    if (!user?.id) return;

    // Check if Capacitor notifications are already granted (OneSignal handles native)
    if (capacitorNotifications.isAvailable()) {
      // OneSignal manages native permissions automatically
      console.log('[NOTIFICATIONS] OneSignal handles native permissions');
    } else {
      // Web platform - check browser notifications
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          setBrowserNotificationsEnabled(true);
          console.log('[NOTIFICATIONS] Browser notifications already granted');
        } else if (Notification.permission === 'default') {
          // Request permission on mount for web (safe - won't crash like native)
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
    
    // Check if we've already requested permission (localStorage persistence)
    const requested = localStorage.getItem('notificationPermissionRequested') === 'true';
    permissionRequestedRef.current = requested;
  }, [user?.id]);

  // Initialize Socket.IO connection (separate effect with stable dependencies)
  useEffect(() => {
    if (!user?.id) return;

    // Initialize audio element for sound notifications
    audioRef.current = new Audio('https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/bell_ring.mp3');
    audioRef.current.volume = 0.7;

    // Connect to Socket.IO server - use same logic as API calls
    // For mobile (Capacitor): use backend URL
    // For web: use current origin
    let socketUrl: string;
    if (Capacitor.isNativePlatform()) {
      socketUrl = import.meta.env.VITE_API_URL || "https://0f8348da-785a-4a32-a048-3781e2402d8c-00-1ifebzeou9igx.picard.replit.dev";
    } else {
      socketUrl = window.location.origin;
    }
    console.log('[SOCKET.IO DEBUG] Connecting to:', socketUrl);
    console.log('[SOCKET.IO DEBUG] Platform:', Capacitor.isNativePlatform() ? 'Mobile' : 'Web');
    
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
      console.log('[SOCKET.IO] Transport:', socket.io.engine.transport.name);
      // Join worker room with user ID
      socket.emit('worker:join', user.id);
    });

    socket.on('worker:connected', (data) => {
      console.log('[SOCKET.IO] Worker connected to room:', data);
    });

    socket.on('task:assigned', (taskData) => {
      console.log('[SOCKET.IO] New task assigned:', taskData);

      // INSTANT CACHE UPDATE - Update UI immediately with socket data
      // taskCache will auto-detect if payload is complete based on assigned_to + status fields
      upsertTaskInCache(taskData, { 
        markForHydration: false, // Will be overridden if payload is incomplete
        prepend: true
      });

      // Schedule background hydration ONLY if payload was incomplete
      // (taskCache sets needsHydration flag if critical fields are missing)
      const hasRequiredFields = taskData.assigned_to && taskData.status;
      if (!hasRequiredFields) {
        console.log('[SOCKET.IO] Incomplete payload detected, scheduling hydration');
        scheduleBackgroundHydration(2000);
      } else {
        console.log('[SOCKET.IO] Complete payload received, skipping hydration');
      }

      // Show in-app toast notification (Always show - synchronous, fast)
      toast({
        title: t('newTaskAssigned') || 'Nova reklamacija dodeljena',
        description: `${taskData.title} - ${taskData.location}`,
        duration: 8000,
      });

      // NON-BLOCKING NOTIFICATIONS - Run in background, don't block UI
      void (async () => {
        try {
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

          // Haptic feedback - Native mobile vibration (with fallback)
          await capacitorHaptics.taskAssigned();

          // Native notification (Only if granted)
          if (soundEnabledRef.current) {
            if (localGranted && capacitorNotifications.isAvailable()) {
              await capacitorNotifications.showTaskAssigned(taskData.title, taskData.location);
            }
            // Fallback: Play audio if native not available/granted
            else if (audioRef.current) {
              audioRef.current.play().catch(err => {
                console.warn('[AUDIO] Failed to play notification sound:', err);
              });
            }
          }

          // Browser notification (fallback for web - verify permission before showing)
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
                setBrowserNotificationsEnabled(false); // Sync state
              }
            } else {
              browserNotificationsEnabledRef.current = false;
              setBrowserNotificationsEnabled(false); // Sync state
            }
          }
        } catch (error) {
          console.error('[NOTIFICATIONS] Error in background notification handling:', error);
        }
      })();
    });

    socket.on('task:updated', (data) => {
      console.log('[SOCKET.IO] Task updated:', data);
      
      // INSTANT CACHE UPDATE - Update existing task with new data
      // taskCache will auto-detect if payload is complete
      upsertTaskInCache(data, { 
        markForHydration: false, // Will be overridden if payload is incomplete
        prepend: false
      });

      // Schedule background hydration ONLY if payload was incomplete
      const hasRequiredFields = data.assigned_to && data.status;
      if (!hasRequiredFields) {
        console.log('[SOCKET.IO] Incomplete payload detected, scheduling hydration');
        scheduleBackgroundHydration(2000);
      } else {
        console.log('[SOCKET.IO] Complete payload received, skipping hydration');
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('[SOCKET.IO] ⚠️ Disconnected. Reason:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[SOCKET.IO] ❌ Connection error:', error.message);
      console.error('[SOCKET.IO] Error details:', error);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[SOCKET.IO] 🔄 Reconnection attempt:', attemptNumber);
    });

    socket.on('reconnect_failed', () => {
      console.error('[SOCKET.IO] ❌ Reconnection failed after all attempts');
    });

    socket.on('error', (error) => {
      console.error('[SOCKET.IO] ❌ Socket error:', error);
    });

    // Cleanup on unmount
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
  }, [user?.id, toast, t]); // Removed browserNotificationsEnabled and soundEnabled to prevent socket reconnect loop

  // Fetch all tasks from API (keeping as fallback + initial load)
  const { data: tasksResponse } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    refetchInterval: 30000, // Reduced to 30 seconds - Socket.IO handles real-time updates
  });

  // Helper function to check if a date is today
  const isToday = (date: Date | null | undefined): boolean => {
    if (!date) return false;
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.getDate() === today.getDate() &&
           checkDate.getMonth() === today.getMonth() &&
           checkDate.getFullYear() === today.getFullYear();
  };

  // Filter tasks assigned to this worker and map to UI format
  const allTasks: Task[] = (tasksResponse?.tasks || [])
    .filter(task => {
      // Check if task is assigned to this user
      if (!task.assigned_to || !user?.id) return false;
      
      // Handle multiple technicians (comma-separated IDs)
      const assignedIds = task.assigned_to.split(',').map((id: string) => id.trim());
      return assignedIds.includes(user.id);
    })
    .map(task => ({
      id: task.id,
      title: task.title,
      assignedBy: task.created_by_name || 'Unknown',
      priority: task.priority as Priority,
      location: task.location,
      status: task.status as TaskStatus,
      description: task.description || '',
      receivedAt: new Date(task.created_at),
      completedAt: task.completed_at ? new Date(task.completed_at) : null,
      reporterName: task.created_by_name,
      reporterImages: task.images || [],
      worker_report: task.worker_report || '',
      receipt_confirmed_at: task.receipt_confirmed_at,
      parent_task_id: task.parent_task_id,
      scheduled_for: task.scheduled_for
    }));

  // Helper function to check if task is due today or earlier (timezone-safe)
  const isDueToday = (task: any): boolean => {
    // For recurring child tasks, use scheduled_for date
    if (task.parent_task_id && task.scheduled_for) {
      // Parse dates as pure date strings (ignore time/timezone)
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Extract date part from scheduled_for (handles both "2025-11-20" and "2025-11-20T00:00:00Z" formats)
      const scheduledDateStr = task.scheduled_for.split('T')[0];
      
      // Compare date strings directly (timezone-safe)
      return scheduledDateStr <= todayStr;
    }
    
    // For regular tasks or recurring templates, they're always due
    return true;
  };

  const activeTasks = allTasks.filter(t => {
    const isActiveStatus = t.status === 'assigned_to_radnik' || 
                          t.status === 'with_sef' || 
                          t.status === 'with_external';
    
    // Only show if active status AND due today or earlier
    return isActiveStatus && isDueToday(t);
  });
  
  const completedTasks = allTasks.filter(t => t.status === 'completed' && isToday(t.completedAt));
  const returnedTasks = allTasks.filter(t => t.status === 'returned_to_sef');

  const selectedTask = allTasks.find(t => t.id === selectedTaskId);

  const getElapsedTime = (receivedAt: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - receivedAt.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m`;
    }
    return `${diffMins}m`;
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDialogOpen(true);
    setWorkerReport('');
    setUploadedPhotos([]);
    setActionType(null);
    
    // Mark task as acknowledged in localStorage
    if (user?.email) {
      const storageKey = `acknowledgedTasks_${user.email}`;
      const stored = localStorage.getItem(storageKey);
      const acknowledgedIds = stored ? JSON.parse(stored) : [];
      
      if (!acknowledgedIds.includes(taskId)) {
        acknowledgedIds.push(taskId);
        localStorage.setItem(storageKey, JSON.stringify(acknowledgedIds));
        
        // Trigger a re-render by dispatching a storage event
        window.dispatchEvent(new Event('storage'));
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTaskId(null);
    setWorkerReport('');
    setUploadedPhotos([]);
    setActionType(null);
    setIsConfirmingReceipt(false);
  };

  const handleTaskCompleted = () => {
    setActionType('completed');
  };

  const handleReturnTask = () => {
    setActionType('return');
  };

  const handleReturnToOperator = () => {
    setActionType('return_to_operator');
  };

  const handleConfirmReceipt = async () => {
    if (!selectedTask || !user) return;
    
    setIsConfirmingReceipt(true);
    
    // OPTIMISTIC UPDATE - Update UI immediately (don't change status, only update receipt fields)
    const optimisticUpdate = optimisticUpdateTask(selectedTask.id, {
      worker_report: 'Prijem reklamacije potvrđen / Receipt confirmed',
      receipt_confirmed_at: new Date().toISOString(),
    });
    
    try {
      console.log('[CONFIRM RECEIPT] Sending request for task:', selectedTask.id);
      
      // NEVER send status with receipt confirmation - let server handle status preservation
      // This prevents overwriting completed status with stale cached status
      const requestData: any = {
        worker_report: 'Prijem reklamacije potvrđen / Receipt confirmed',
        receipt_confirmed_at: new Date().toISOString()
      };
      
      const response = await apiRequest('PATCH', `/api/tasks/${selectedTask.id}`, requestData);

      console.log('[CONFIRM RECEIPT] Response status:', response.status);

      // Schedule background hydration
      scheduleBackgroundHydration(1000);

      toast({
        title: t('success'),
        description: t('taskUpdated'),
      });
    } catch (error) {
      // ROLLBACK on error
      console.error('[CONFIRM RECEIPT] Exception:', error);
      optimisticUpdate.rollback();
      
      toast({
        title: t('errorOccurred'),
        description: 'Failed to confirm task receipt',
        variant: 'destructive',
      });
      setIsConfirmingReceipt(false);
    }
  };

  const handlePhotoUpload = () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleTakePhoto = async () => {
    try {
      const dataUrl = await capacitorCamera.takePhoto();
      if (dataUrl) {
        const newPhoto: PhotoPreview = {
          id: `photo-${Date.now()}`,
          dataUrl,
        };
        setUploadedPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error('[CAMERA] Error taking photo:', error);
      toast({
        title: t('errorOccurred'),
        description: 'Failed to take photo',
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Process each selected file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file (JPG, PNG, etc.)",
          variant: "destructive",
        });
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be smaller than 5MB",
          variant: "destructive",
        });
        continue;
      }

      // Read file as data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newPhoto: PhotoPreview = {
          id: `photo-${Date.now()}-${i}`,
          dataUrl,
        };
        setUploadedPhotos(prev => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input value so same file can be selected again
    event.target.value = '';
  };

  const handleRemovePhoto = (photoId: string) => {
    setUploadedPhotos(uploadedPhotos.filter(p => p.id !== photoId));
  };

  // Mutation to update task status with optimistic updates
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, report, images }: { 
      taskId: string; 
      status: string; 
      report: string;
      images?: string[];
    }) => {
      console.log('[MUTATION] Updating task:', taskId, 'to status:', status);
      
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}`, {
        status, 
        user_id: user?.id,
        user_name: user?.fullName,
        worker_report: report,
        worker_images: images || []
      });

      console.log('[MUTATION] Response status:', response.status);
      const result = await response.json();
      console.log('[MUTATION] Success:', result);
      return result;
    },
    onMutate: async ({ taskId, status, report, images }) => {
      console.log('[OPTIMISTIC UPDATE] Starting for task:', taskId, 'status:', status);
      
      // OPTIMISTIC UPDATE - Update UI immediately before API call completes
      const optimisticUpdate = optimisticUpdateTask(taskId, {
        status: status as TaskStatus,
        worker_report: report,
        reporterImages: images,
        completedAt: status === 'completed' ? new Date() : undefined,
      });
      
      return { rollback: optimisticUpdate.rollback };
    },
    onSuccess: async (data, variables, context) => {
      console.log('[OPTIMISTIC UPDATE] Success - scheduling background hydration');
      
      // Schedule background hydration to ensure all fields are synced
      scheduleBackgroundHydration(1000);
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      
      handleCloseDialog();
    },
    onError: (error: Error, variables, context) => {
      console.error('[OPTIMISTIC UPDATE] Failed - rolling back:', error);
      
      // ROLLBACK optimistic update on error
      if (context?.rollback) {
        context.rollback();
      }
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitReport = async (e?: React.MouseEvent | React.TouchEvent) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('[SUBMIT REPORT] Button clicked/touched');
    
    if (!selectedTaskId) {
      console.log('[SUBMIT REPORT] No selected task ID');
      return;
    }

    if (!workerReport.trim()) {
      console.log('[SUBMIT REPORT] Report is empty');
      toast({
        title: "Error",
        description: "Please provide a report description",
        variant: "destructive",
      });
      return;
    }

    console.log('[SUBMIT REPORT] Submitting...', { selectedTaskId, actionType, reportLength: workerReport.length });

    // Convert photo previews to data URLs
    const photoDataUrls = uploadedPhotos.map(photo => photo.dataUrl);

    // Determine new status based on action type
    let newStatus = 'completed';
    if (actionType === 'return') {
      newStatus = 'returned_to_sef';
    } else if (actionType === 'return_to_operator') {
      newStatus = 'returned_to_operator';
    }

    try {
      await updateTaskMutation.mutateAsync({
        taskId: selectedTaskId,
        status: newStatus,
        report: workerReport,
        images: photoDataUrls.length > 0 ? photoDataUrls : undefined,
      });
      console.log('[SUBMIT REPORT] Success!');
    } catch (error) {
      console.error('[SUBMIT REPORT] Error:', error);
    }
  };

  const renderTaskCard = (task: Task) => (
    <Card 
      key={task.id} 
      className="p-6 cursor-pointer hover-elevate active-elevate-2 bg-secondary/30"
      onClick={() => handleTaskClick(task.id)}
      data-testid={`card-task-${task.id}`}
    >
      <div className="space-y-5">
        <div>
          <h3 className="font-medium text-2xl text-foreground">{task.title}</h3>
          <p className="text-lg text-foreground mt-2">
            From: {task.assignedBy}
          </p>
        </div>
        
        {task.description && (
          <p className="text-lg text-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center gap-3">
          {/* Don't show elapsed time for recurring tasks */}
          {!task.parent_task_id && (
            <div className="flex items-center gap-2 text-lg text-foreground">
              <Clock className="w-6 h-6" />
              <span>{getElapsedTime(task.receivedAt)}</span>
            </div>
          )}
          <Badge 
            variant={
              task.priority === 'urgent' ? 'destructive' : 
              task.priority === 'normal' ? 'default' : 
              'secondary'
            }
            className="text-lg px-3 py-1 ml-auto"
          >
            {task.priority === 'urgent' ? 'Hitno' : 
             task.priority === 'normal' ? 'Normalno' : 
             'Može Sačekati'}
          </Badge>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-medium">{t('myTasks')}</h1>
        <p className="text-muted-foreground mt-0.5 text-base">
          {user?.fullName} - {user?.role}
        </p>
      </div>

      {/* My Tasks with Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-11 gap-2">
              <TabsTrigger 
                value="active" 
                className="text-base data-[state=active]:bg-secondary/50 data-[state=active]:text-foreground w-full" 
                data-testid="tab-active-tasks"
              >
                <span className="hidden sm:inline">{t('activeTasks')}</span>
                <span className="sm:hidden">Aktivni</span>
              </TabsTrigger>
              <TabsTrigger 
                value="returned" 
                className="text-base data-[state=active]:bg-destructive/20 data-[state=active]:text-foreground w-full" 
                data-testid="tab-returned"
              >
                <span className="hidden sm:inline">{t('returnedTasks') || 'Vraćeni'}</span>
                <span className="sm:hidden">Vraćeni</span>
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="text-base data-[state=active]:bg-secondary/50 data-[state=active]:text-foreground w-full" 
                data-testid="tab-completed"
              >
                <span className="hidden sm:inline">{t('completedToday')}</span>
                <span className="sm:hidden">Završeno</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {activeTasks.length > 0 ? (
                    activeTasks.map(renderTaskCard)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-base">{t('noActiveTasks')}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="returned" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {returnedTasks.length > 0 ? (
                    returnedTasks.map((task) => (
                      <Card 
                        key={task.id} 
                        className="p-6 cursor-pointer hover-elevate active-elevate-2 bg-destructive/10"
                        onClick={() => handleTaskClick(task.id)}
                        data-testid={`card-task-${task.id}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <p className="text-2xl font-medium text-foreground">{task.title}</p>
                            <p className="text-lg text-foreground">
                              {task.description}
                            </p>
                            {/* Don't show elapsed time for recurring tasks */}
                            {!task.parent_task_id && (
                              <p className="text-lg text-foreground">
                                {getElapsedTime(task.receivedAt)} {t('ago')}
                              </p>
                            )}
                          </div>
                          <XCircle className="w-8 h-8 text-orange-500 flex-shrink-0" />
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-base">{t('noReturnedTasks') || 'Nema vraćenih zadataka'}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {completedTasks.length > 0 ? (
                    completedTasks.map((task) => (
                      <Card 
                        key={task.id} 
                        className="p-6 cursor-pointer hover-elevate active-elevate-2 bg-secondary/30"
                        onClick={() => handleTaskClick(task.id)}
                        data-testid={`card-task-${task.id}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <p className="text-2xl font-medium text-foreground">{task.title}</p>
                            <p className="text-lg text-foreground">
                              {/* Don't show elapsed time for recurring tasks */}
                              {!task.parent_task_id 
                                ? `${task.location} • ${t('completedAgo')} ${getElapsedTime(task.receivedAt)} ${t('ago')}`
                                : task.location
                              }
                            </p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-base">{t('noCompletedTasksToday')}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto p-6" data-testid="dialog-task-details">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Task Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={
                        selectedTask.priority === 'urgent' ? 'destructive' : 
                        selectedTask.priority === 'normal' ? 'default' : 
                        'secondary'
                      }
                      className="text-base"
                    >
                      {selectedTask.priority === 'urgent' ? t('urgent') : 
                       selectedTask.priority === 'normal' ? t('normal') : 
                       t('can_wait')}
                    </Badge>
                  </div>

                  {/* Original Reporter Info */}
                  {selectedTask.reporterName && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {selectedTask.reporterName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-base font-medium">{t('reportedBy')}</p>
                          <p className="text-base text-muted-foreground">{selectedTask.reporterName}</p>
                        </div>
                      </div>
                      
                      {/* Display reporter's uploaded images */}
                      {selectedTask.reporterImages && selectedTask.reporterImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {selectedTask.reporterImages.map((imageUrl, index) => (
                            <div 
                              key={index} 
                              className="relative aspect-square bg-muted rounded-md overflow-hidden cursor-pointer hover-elevate min-w-[96px] min-h-[96px]"
                              onClick={() => setSelectedImage(imageUrl)}
                              data-testid={`img-reporter-${index}`}
                            >
                              <img 
                                src={imageUrl} 
                                alt={`${t('reporterPhoto')} ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                    <div className="min-w-0">
                      <span className="text-muted-foreground">{t('assignedByLabel')}</span>
                      <p className="font-medium break-words">{selectedTask.assignedBy}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">{t('reportedAt')}</span>
                      <p className="font-medium break-words">
                        {selectedTask.receivedAt.toLocaleDateString('sr-Latn-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })} {selectedTask.receivedAt.toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {/* Don't show elapsed time for recurring tasks */}
                    {!selectedTask.parent_task_id && (
                      <div className="min-w-0">
                        <span className="text-muted-foreground">{t('timeElapsed')}</span>
                        <p className="font-medium break-words">{getElapsedTime(selectedTask.receivedAt)}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-base text-muted-foreground">{t('descriptionLabel')}</span>
                    <p className="text-base mt-1">{selectedTask.description}</p>
                  </div>
                </div>

                {/* Action Buttons for Assigned Tasks */}
                {selectedTask.status === 'assigned_to_radnik' && !actionType && (
                  <div className="space-y-3 pt-4 border-t">
                    {/* Confirm Receipt Button */}
                    {(() => {
                      const isReceiptConfirmed = selectedTask.worker_report?.includes('Prijem reklamacije potvrđen') || isConfirmingReceipt || !!selectedTask.receipt_confirmed_at;
                      return (
                        <Button 
                          className={`w-full min-h-14 touch-manipulation ${isReceiptConfirmed ? 'bg-gray-400 hover:bg-gray-400 text-gray-700 border-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white border-green-700'}`}
                          onClick={(e) => {
                            console.log('[BUTTON] Confirm Receipt clicked');
                            e.preventDefault();
                            e.stopPropagation();
                            handleConfirmReceipt();
                          }}
                          onTouchStart={() => console.log('[BUTTON] Confirm Receipt touched')}
                          disabled={isReceiptConfirmed}
                          data-testid={`button-confirm-receipt-${selectedTask.id}`}
                          type="button"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          <span className="text-lg">
                            {isReceiptConfirmed ? '✓ ' + t('confirmReceipt') : t('confirmReceipt')}
                          </span>
                        </Button>
                      );
                    })()}
                    
                    {/* Task Completion and Return Buttons */}
                    <div className="flex flex-col gap-3">
                      <Button 
                        className="w-full min-h-14 touch-manipulation"
                        onClick={(e) => {
                          console.log('[BUTTON] Task Completed clicked');
                          e.preventDefault();
                          e.stopPropagation();
                          handleTaskCompleted();
                        }}
                        onTouchStart={() => console.log('[BUTTON] Task Completed touched')}
                        data-testid={`button-task-completed-${selectedTask.id}`}
                        type="button"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span className="text-lg">{t('taskCompleted')}</span>
                      </Button>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button 
                          className="flex-1 min-h-14 touch-manipulation bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
                          onClick={(e) => {
                            console.log('[BUTTON] Return to Operator clicked');
                            e.preventDefault();
                            e.stopPropagation();
                            handleReturnToOperator();
                          }}
                          onTouchStart={() => console.log('[BUTTON] Return to Operator touched')}
                          data-testid={`button-return-to-operator-${selectedTask.id}`}
                          type="button"
                        >
                          <RotateCcw className="w-5 h-5 mr-2" />
                          <span className="text-lg">{t('returnToOperator')}</span>
                        </Button>
                        <Button 
                          variant="destructive"
                          className="flex-1 min-h-14 touch-manipulation"
                          onClick={(e) => {
                            console.log('[BUTTON] Return Task clicked');
                            e.preventDefault();
                            e.stopPropagation();
                            handleReturnTask();
                          }}
                          onTouchStart={() => console.log('[BUTTON] Return Task touched')}
                          data-testid={`button-return-task-${selectedTask.id}`}
                          type="button"
                        >
                          <XCircle className="w-5 h-5 mr-2" />
                          <span className="text-lg">{t('returnToSupervisor')}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Work Report Section for Assigned Tasks after action selected */}
                {selectedTask.status === 'assigned_to_radnik' && actionType && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium text-base">
                      {actionType === 'completed' 
                        ? t('taskCompletionReport') 
                        : actionType === 'return_to_operator' 
                          ? t('returnToOperatorReason') 
                          : t('returnReason')}
                    </h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-task-report" className="text-base">
                        {actionType === 'completed' 
                          ? t('whatDidYouDo')
                          : actionType === 'return_to_operator'
                            ? t('whyReturnToOperator')
                            : t('whyCantComplete')}
                      </Label>
                      <Textarea
                        id="new-task-report"
                        placeholder={actionType === 'completed'
                          ? t('describeWorkPlaceholder')
                          : actionType === 'return_to_operator'
                            ? t('describeReturnToOperatorPlaceholder')
                            : t('describeReturnPlaceholder')
                        }
                        value={workerReport}
                        onChange={(e) => setWorkerReport(e.target.value)}
                        rows={6}
                        data-testid="textarea-new-task-report"
                        className="text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base">{t('fieldPhotos')}</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          variant="outline" 
                          onClick={handleTakePhoto}
                          type="button"
                          data-testid="button-take-photo"
                          className="flex-1 min-h-11"
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          {t('takePhoto')}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handlePhotoUpload}
                          type="button"
                          data-testid="button-upload-photo"
                          className="flex-1 min-h-11"
                        >
                          <ImagePlus className="w-5 h-5 mr-2" />
                          {t('uploadPhoto')}
                        </Button>
                      </div>
                      
                      {/* Display uploaded photos */}
                      {uploadedPhotos.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                          {uploadedPhotos.map((photo) => (
                            <div 
                              key={photo.id} 
                              className="relative aspect-square bg-muted rounded-md overflow-hidden cursor-pointer min-w-[96px] min-h-[96px]"
                              onClick={() => setSelectedImage(photo.dataUrl)}
                            >
                              <img 
                                src={photo.dataUrl} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                                data-testid={`img-uploaded-${photo.id}`}
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 min-h-11 min-w-11 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePhoto(photo.id);
                                }}
                                type="button"
                                data-testid={`button-remove-photo-${photo.id}`}
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button 
                      className="w-full min-h-14 touch-manipulation"
                      onClick={(e) => {
                        console.log('[BUTTON] onClick triggered');
                        handleSubmitReport(e);
                      }}
                      onTouchStart={(e) => {
                        console.log('[BUTTON] onTouchStart triggered');
                      }}
                      disabled={updateTaskMutation.isPending}
                      data-testid={`button-submit-report-${selectedTask.id}`}
                      type="button"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      <span className="text-lg">
                        {updateTaskMutation.isPending 
                          ? t('submitting') 
                          : actionType === 'completed' 
                            ? t('submitCompletionReport') 
                            : actionType === 'return_to_operator'
                              ? t('submitReturnToOperator')
                              : t('submitReturnReason')}
                      </span>
                    </Button>
                  </div>
                )}


                {/* View Details for Completed Tasks */}
                {selectedTask.status === 'completed' && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-green-600 mb-4">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium text-base">{t('taskCompleted')}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full min-h-11"
                      onClick={handleCloseDialog}
                      data-testid="button-close-dialog"
                    >
                      {t('close')}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <ImagePreviewModal 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
    </div>
  );
}
