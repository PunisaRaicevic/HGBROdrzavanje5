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
    // Load sound preference from localStorage
    const saved = localStorage.getItem('soundNotificationsEnabled');
    return saved === 'true';
  });

  // Initialize Socket.IO connection and notifications
  useEffect(() => {
    if (!user?.id) return;

    // Request Capacitor native notifications permission
    capacitorNotifications.requestPermission().then(granted => {
      if (granted) {
        console.log('[NOTIFICATIONS] Capacitor notifications enabled');
      }
    });

    // Request browser notification permission on mount (fallback for web)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          setBrowserNotificationsEnabled(true);
          console.log('[NOTIFICATIONS] Browser notifications enabled');
        }
      });
    } else if (Notification.permission === 'granted') {
      setBrowserNotificationsEnabled(true);
    }

    // Initialize audio element for sound notifications
    audioRef.current = new Audio('https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/bell_ring.mp3');
    audioRef.current.volume = 0.7;

    // Connect to Socket.IO server - use current origin for compatibility with external access
    const socketUrl = window.location.origin;
    console.log('[SOCKET.IO DEBUG] Connecting to:', socketUrl);
    console.log('[SOCKET.IO DEBUG] Current location:', window.location.href);
    
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

    socket.on('task:assigned', async (taskData) => {
      console.log('[SOCKET.IO] New task assigned:', taskData);

      // Haptic feedback - Native mobile vibration (with fallback)
      await capacitorHaptics.taskAssigned();

      // Sound notification
      if (soundEnabled) {
        // Try native notification with sound first
        await capacitorNotifications.showTaskAssigned(taskData.title, taskData.location);
        
        // Fallback: Play audio if native notifications not available
        if (!capacitorNotifications.isAvailable() && audioRef.current) {
          audioRef.current.play().catch(err => {
            console.warn('[AUDIO] Failed to play notification sound:', err);
          });
        }
      }

      // Browser notification (fallback for web)
      if (!capacitorNotifications.isAvailable() && browserNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Nova reklamacija / New Task', {
          body: `${taskData.title}\n${taskData.location}`,
          icon: '/favicon.ico',
          tag: taskData.taskId,
          requireInteraction: true
        });
      }

      // Show in-app toast notification
      toast({
        title: t('newTaskAssigned') || 'Nova reklamacija dodeljena',
        description: `${taskData.title} - ${taskData.location}`,
        duration: 8000,
      });

      // Refresh task list - force immediate refetch
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tasks'],
        exact: true,
        refetchType: 'active'
      });
    });

    socket.on('task:updated', (data) => {
      console.log('[SOCKET.IO] Task updated:', data);
      // Refresh task list on any task update - force immediate refetch
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
  }, [user?.id, toast, t, browserNotificationsEnabled, soundEnabled]);

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
      receipt_confirmed_at: task.receipt_confirmed_at
    }));

  const activeTasks = allTasks.filter(t => 
    t.status === 'assigned_to_radnik' || 
    t.status === 'with_sef' || 
    t.status === 'with_external'
  );
  const completedTasks = allTasks.filter(t => t.status === 'completed' && isToday(t.completedAt));

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

  const handleConfirmReceipt = async () => {
    if (!selectedTask || !user) return;
    
    setIsConfirmingReceipt(true);
    
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: 'assigned_to_radnik',
          worker_report: 'Prijem reklamacije potvrđen / Receipt confirmed',
          receipt_confirmed_at: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm receipt');
      }

      toast({
        title: t('success'),
        description: t('taskUpdated'),
      });

      await queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    } catch (error) {
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

  // Toggle sound notifications
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('soundNotificationsEnabled', String(newValue));
    
    // If enabling sound, try to initialize audio (requires user interaction)
    if (newValue && audioRef.current) {
      // Load and prepare the audio
      audioRef.current.load();
      toast({
        title: newValue ? 'Zvuk omogućen / Sound Enabled' : 'Zvuk onemogućen / Sound Disabled',
        description: newValue 
          ? 'Zvučne notifikacije su omogućene. Testirajte klikom na dugme. / Sound notifications enabled. Test with the button.'
          : 'Zvučne notifikacije su onemogućene. / Sound notifications disabled.',
        duration: 3000,
      });
    }
  };

  // Test sound notification
  const testSound = async () => {
    if (!audioRef.current) {
      toast({
        title: 'Greška / Error',
        description: 'Audio nije inicijalizovan / Audio not initialized',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Reset audio to beginning
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      
      // Vibrate as well
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      
      toast({
        title: 'Test uspešan / Test Successful',
        description: 'Čuli ste zvuk? Telefon je vibrirao? / Did you hear the sound? Did phone vibrate?',
        duration: 3000,
      });
    } catch (err) {
      console.error('[AUDIO TEST] Failed:', err);
      toast({
        title: 'Zvuk nije dostupan / Sound Not Available',
        description: 'Mobilni browser-i blokiraju automatski zvuk. Koristite vibracije. / Mobile browsers block auto-sound. Use vibrations.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  // Mutation to update task status
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, report, images }: { 
      taskId: string; 
      status: string; 
      report: string;
      images?: string[];
    }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          user_id: user?.id,
          user_name: user?.fullName,
          worker_report: report,
          worker_images: images || []
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update task');
      }

      return response.json();
    },
    onSuccess: async () => {
      // Wait for cache invalidation and refetch to complete before closing dialog
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/tasks'],
        refetchType: 'active'
      });
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitReport = async () => {
    if (!selectedTaskId) return;

    if (!workerReport.trim()) {
      toast({
        title: "Error",
        description: "Please provide a report description",
        variant: "destructive",
      });
      return;
    }

    // Convert photo previews to data URLs
    const photoDataUrls = uploadedPhotos.map(photo => photo.dataUrl);

    // Determine new status based on action type
    let newStatus = 'completed';
    if (actionType === 'return') {
      newStatus = 'returned_to_sef';
    }

    await updateTaskMutation.mutateAsync({
      taskId: selectedTaskId,
      status: newStatus,
      report: workerReport,
      images: photoDataUrls.length > 0 ? photoDataUrls : undefined,
    });
  };

  const renderTaskCard = (task: Task) => (
    <Card 
      key={task.id} 
      className="p-4 cursor-pointer hover-elevate active-elevate-2"
      onClick={() => handleTaskClick(task.id)}
      data-testid={`card-task-${task.id}`}
    >
      <div className="space-y-3">
        <div>
          <h3 className="font-medium text-base">{task.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            From: {task.assignedBy}
          </p>
        </div>
        
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{getElapsedTime(task.receivedAt)}</span>
          </div>
          <Badge 
            variant={
              task.priority === 'urgent' ? 'destructive' : 
              task.priority === 'normal' ? 'default' : 
              'secondary'
            }
            className="text-sm"
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-medium">{t('myTasks')}</h1>
          <p className="text-muted-foreground mt-1">
            {user?.fullName} - {user?.role}
          </p>
        </div>
        
        {/* Notification Controls */}
        <div className="flex gap-2">
          <Button
            variant={soundEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleSound}
            data-testid="button-toggle-sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
            <span className="hidden sm:inline">
              {soundEnabled ? 'Zvuk ON / Sound ON' : 'Zvuk OFF / Sound OFF'}
            </span>
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={testSound}
            data-testid="button-test-sound"
          >
            <Volume2 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Test</span>
          </Button>
        </div>
      </div>

      {/* My Tasks with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('myTasks')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="active" className="text-xs" data-testid="tab-active-tasks">
                {t('activeTasks')}
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs" data-testid="tab-completed">
                {t('completedToday')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {activeTasks.length > 0 ? (
                    activeTasks.map(renderTaskCard)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">{t('noActiveTasks')}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {completedTasks.length > 0 ? (
                    completedTasks.map((task) => (
                      <Card 
                        key={task.id} 
                        className="p-4 cursor-pointer hover-elevate active-elevate-2"
                        onClick={() => handleTaskClick(task.id)}
                        data-testid={`card-task-${task.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-base font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.location} • {t('completedAgo')} {getElapsedTime(task.receivedAt)} {t('ago')}
                            </p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">{t('noCompletedTasksToday')}</p>
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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto px-4 py-6 sm:p-6" data-testid="dialog-task-details">
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
                        <div className="grid grid-cols-3 gap-2">
                          {selectedTask.reporterImages.map((imageUrl, index) => (
                            <div 
                              key={index} 
                              className="relative aspect-square bg-muted rounded-md overflow-hidden cursor-pointer hover-elevate"
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
                      <span className="text-muted-foreground">{t('locationLabel')}</span>
                      <p className="font-medium break-words">{selectedTask.location}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">{t('timeElapsed')}</span>
                      <p className="font-medium break-words">{getElapsedTime(selectedTask.receivedAt)}</p>
                    </div>
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
                          className={`w-full ${isReceiptConfirmed ? 'bg-gray-400 hover:bg-gray-400 text-gray-700 border-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white border-green-700'}`}
                          onClick={handleConfirmReceipt}
                          disabled={isReceiptConfirmed}
                          data-testid={`button-confirm-receipt-${selectedTask.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {isReceiptConfirmed ? '✓ ' + t('confirmReceipt') : t('confirmReceipt')}
                        </Button>
                      );
                    })()}
                    
                    {/* Task Completion and Return Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        className="flex-1"
                        onClick={handleTaskCompleted}
                        data-testid={`button-task-completed-${selectedTask.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t('taskCompleted')}
                      </Button>
                      <Button 
                        variant="destructive"
                        className="sm:flex-1"
                        onClick={handleReturnTask}
                        data-testid={`button-return-task-${selectedTask.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {t('returnToSupervisor')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Work Report Section for Assigned Tasks after action selected */}
                {selectedTask.status === 'assigned_to_radnik' && actionType && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium text-base">
                      {actionType === 'completed' ? t('taskCompletionReport') : t('returnReason')}
                    </h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-task-report" className="text-base">
                        {actionType === 'completed' 
                          ? t('whatDidYouDo')
                          : t('whyCantComplete')}
                      </Label>
                      <Textarea
                        id="new-task-report"
                        placeholder={actionType === 'completed'
                          ? t('describeWorkPlaceholder')
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
                      <div className="border-2 border-dashed rounded-md p-6 text-center">
                        <Camera className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-3">
                          {t('uploadFieldPhotos')}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handlePhotoUpload}
                          type="button"
                          data-testid="button-upload-photo"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {t('uploadPhoto')}
                        </Button>
                      </div>
                      
                      {/* Display uploaded photos */}
                      {uploadedPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {uploadedPhotos.map((photo) => (
                            <div 
                              key={photo.id} 
                              className="relative aspect-square bg-muted rounded-md overflow-hidden cursor-pointer"
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
                                className="absolute top-1 right-1 h-6 w-6 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePhoto(photo.id);
                                }}
                                type="button"
                                data-testid={`button-remove-photo-${photo.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button 
                      className="w-full"
                      onClick={handleSubmitReport}
                      disabled={updateTaskMutation.isPending}
                      data-testid={`button-submit-report-${selectedTask.id}`}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {updateTaskMutation.isPending 
                        ? t('submitting') 
                        : actionType === 'completed' ? t('submitCompletionReport') : t('submitReturnReason')}
                    </Button>
                  </div>
                )}


                {/* View Details for Completed Tasks */}
                {selectedTask.status === 'completed' && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-500 mb-4">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">{t('taskCompleted')}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
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

      {/* Image Lightbox Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="w-[95vw] max-w-5xl h-[95vh] max-h-[95vh] p-2 sm:p-4">
          <DialogHeader>
            <DialogTitle>{t('imagePreview') || 'Prikaz slike / Image Preview'}</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-full flex items-center justify-center bg-black/5 rounded-md overflow-hidden">
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Enlarged view" 
                className="max-w-full max-h-[75vh] object-contain"
                data-testid="img-enlarged"
              />
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={() => setSelectedImage(null)}
            className="w-full mt-2"
            data-testid="button-close-image"
          >
            {t('close')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
