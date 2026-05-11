import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, CheckCircle, XCircle, Clock, TrendingUp, FileText, Trash2, Calendar, History, RefreshCw, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import StatCard from '@/components/StatCard';
import SelectTechnicianDialog from '@/components/SelectTechnicianDialog';
import WorkerProfileDialog from '@/components/WorkerProfileDialog';
import TeamPerformanceDialog from '@/components/TeamPerformanceDialog';
import DailyReportDialog from '@/components/DailyReportDialog';
import CreateRecurringTaskDialog from '@/components/CreateRecurringTaskDialog';
import TaskDetailsDialog from '@/components/TaskDetailsDialog';
import EditTaskDialog from '@/components/EditTaskDialog';
import { PhotoUpload, PhotoPreview } from '@/components/PhotoUpload';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Skeleton } from '@/components/ui/skeleton';

// Helper function to calculate elapsed time
const getElapsedTime = (createdAt: Date): string => {
  const now = new Date();
  const diff = now.getTime() - createdAt.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export default function SupervisorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectTechnicianOpen, setSelectTechnicianOpen] = useState(false);
  const [currentTaskForTechnician, setCurrentTaskForTechnician] = useState<{ id: string; title: string } | null>(null);
  const [workerProfileOpen, setWorkerProfileOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [teamPerformanceOpen, setTeamPerformanceOpen] = useState(false);
  const [dailyReportOpen, setDailyReportOpen] = useState(false);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<any | null>(null);
  const [selectedTaskForDetailsId, setSelectedTaskForDetailsId] = useState<string | null>(null);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  
  // State for external task completion dialog
  const [externalCompletionOpen, setExternalCompletionOpen] = useState(false);
  const [externalCompletionTask, setExternalCompletionTask] = useState<{ id: string; title: string } | null>(null);
  const [externalCompletionNotes, setExternalCompletionNotes] = useState('');
  const [externalCompletionPhotos, setExternalCompletionPhotos] = useState<PhotoPreview[]>([]);
  
  // Filter state for "Zadaci" tab - same as AdminDashboard
  const [taskViewTab, setTaskViewTab] = useState('upcoming');
  const [tasksPeriodFilter, setTasksPeriodFilter] = useState('7d');
  const [tasksStatusFilter, setTasksStatusFilter] = useState('all');
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState('7d');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [statsGranularity, setStatsGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [statsRange, setStatsRange] = useState(() => {
    const n = new Date();
    return {
      start: new Date(n.getFullYear(), n.getMonth(), n.getDate()),
      end: new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1),
    };
  });
  
  // Sound notification state
  const [audioEnabled, setAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('soundNotificationsEnabled');
    return saved === 'true';
  });
  const [previousNewTaskCount, setPreviousNewTaskCount] = useState<number>(0);
  const [previousReturnedTaskCount, setPreviousReturnedTaskCount] = useState<number>(0);

  // Listen for sound setting changes from header toggle
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('soundNotificationsEnabled');
      setAudioEnabled(saved === 'true');
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event for same-tab updates
    const handleCustomEvent = () => handleStorageChange();
    window.addEventListener('soundSettingChanged', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('soundSettingChanged', handleCustomEvent);
    };
  }, []);

  // Play notification sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create a pleasant notification sound (two-tone)
      oscillator.frequency.value = 800; // First tone
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);

      // Second tone
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.frequency.value = 1000; // Second tone (higher pitch)
        oscillator2.type = 'sine';
        
        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.1);
      }, 100);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  // Fetch all tasks from API
  const { data: tasksResponse, isLoading } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    refetchInterval: 25000, // Refetch every 25s (was 10s)
  });

  // Fetch full task details (including images) when a task is selected
  const { data: taskDetailForDetails } = useQuery<{ task: any }>({
    queryKey: ['/api/tasks', selectedTaskForDetailsId, 'detail'],
    enabled: !!selectedTaskForDetailsId,
  });

  // Sync selectedTaskForDetails with latest data from tasks query
  useEffect(() => {
    if (selectedTaskForDetails && tasksResponse?.tasks) {
      const updatedTask = tasksResponse.tasks.find(t => t.id === selectedTaskForDetails.id);
      if (updatedTask && updatedTask.status !== selectedTaskForDetails.status) {
        setSelectedTaskForDetails(updatedTask);
      }
    }
  }, [tasksResponse?.tasks, selectedTaskForDetails?.id]);

  // Fetch technicians
  const { data: techniciansResponse } = useQuery<{ technicians: any[] }>({
    queryKey: ['/api/technicians'],
  });

  // Mutation to update task status
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, assigned_to, assigned_to_name }: { 
      taskId: string; 
      status: string;
      assigned_to?: string;
      assigned_to_name?: string;
    }) => {
      return apiRequest('PATCH', `/api/tasks/${taskId}`, { 
        status, 
        assigned_to, 
        assigned_to_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Uspešno!",
        description: "Zadatak je dodeljen majstoru.",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Nije moguće ažurirati zadatak. Pokušajte ponovo.",
        variant: "destructive"
      });
      console.error('Error updating task:', error);
    }
  });

  // Mutation for sending task to external company
  const sendToExternalMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest('PATCH', `/api/tasks/${taskId}`, { 
        status: 'with_external'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Uspešno!",
        description: "Zadatak je poslat eksternoj firmi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Nije moguće poslati zadatak eksternoj firmi.",
        variant: "destructive"
      });
      console.error('Error sending to external:', error);
    }
  });

  // Mutation for completing external task with notes and photos
  const completeExternalTaskMutation = useMutation({
    mutationFn: async ({ taskId, completionNotes, photos }: { taskId: string; completionNotes: string; photos: string[] }) => {
      return apiRequest('PATCH', `/api/tasks/${taskId}`, { 
        status: 'completed',
        worker_report: completionNotes,
        worker_images: photos,
        completed_by: user?.id,
        completed_by_name: user?.fullName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setExternalCompletionOpen(false);
      setExternalCompletionTask(null);
      setExternalCompletionNotes('');
      setExternalCompletionPhotos([]);
      toast({
        title: "Uspešno!",
        description: "Zadatak externe firme je označen kao završen.",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Nije moguće završiti zadatak.",
        variant: "destructive"
      });
      console.error('Error completing external task:', error);
    }
  });

  // Mutation for deleting recurring task
  const deleteRecurringTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest('DELETE', `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Uspešno!",
        description: "Ponavljajući zadatak je obrisan.",
      });
    },
    onError: (error) => {
      toast({
        title: "Greška",
        description: "Nije moguće obrisati zadatak.",
        variant: "destructive"
      });
      console.error('Error deleting recurring task:', error);
    }
  });

  // Get tasks sent to supervisor (with_sef, with_external, OR returned_to_sef status)
  const tasksFromOperator = (tasksResponse?.tasks || []).filter(task => 
    task.status === 'with_sef' || task.status === 'with_external' || task.status === 'returned_to_sef'
  );

  // Monitor new tasks and returned tasks - play sound when count increases
  useEffect(() => {
    if (isLoading) return;
    
    const allTasks = tasksResponse?.tasks || [];
    
    // Count tasks with 'with_sef' status (new tasks from operator)
    const newTaskCount = allTasks.filter(task => task.status === 'with_sef').length;
    
    // Count tasks with 'returned_to_sef' status (returned from worker)
    const returnedTaskCount = allTasks.filter(task => task.status === 'returned_to_sef').length;
    
    // Only play sound if not initial load and count increased
    if (previousNewTaskCount > 0 && newTaskCount > previousNewTaskCount) {
      if (audioEnabled) {
        playNotificationSound();
      }
      toast({
        title: "Novi zadatak!",
        description: `Primljen ${newTaskCount - previousNewTaskCount} novi zadatak od operatera.`,
      });
    }
    
    if (previousReturnedTaskCount > 0 && returnedTaskCount > previousReturnedTaskCount) {
      if (audioEnabled) {
        playNotificationSound();
      }
      toast({
        title: "Zadatak vracen!",
        description: `Majstor je vratio ${returnedTaskCount - previousReturnedTaskCount} zadatak.`,
      });
    }
    
    setPreviousNewTaskCount(newTaskCount);
    setPreviousReturnedTaskCount(returnedTaskCount);
  }, [tasksResponse, isLoading, audioEnabled]);
  
  // Get technicians
  const myWorkers = techniciansResponse?.technicians || [];
  
  
  // Calculate stats
  // Assigned today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const assignedTasks = (tasksResponse?.tasks || []).filter(task => {
    const createdDate = new Date(task.created_at);
    createdDate.setHours(0, 0, 0, 0);
    return task.status === 'assigned_to_radnik' && createdDate.getTime() === today.getTime();
  }).length;
  
  // In progress (with_operator status)
  const inProgressTasks = (tasksResponse?.tasks || []).filter(task => 
    task.status === 'with_operator'
  ).length;

  // Get available workers in current shift
  const getCurrentShift = () => {
    const currentHour = new Date().getHours();
    // Day shift: 07:00 - 15:00
    // Night shift: 15:00 - 23:00
    if (currentHour >= 7 && currentHour < 15) return 'day';
    if (currentHour >= 15 && currentHour < 23) return 'night';
    return null; // Outside working hours
  };

  const currentShift = getCurrentShift();
  const availableWorkersCount = currentShift 
    ? myWorkers.filter(worker => worker.shift === currentShift).length 
    : myWorkers.length; // Show all if outside working hours

  // Handle opening technician selection dialog
  const handleAssignToWorker = (taskId: string, taskTitle: string) => {
    setCurrentTaskForTechnician({ id: taskId, title: taskTitle });
    setSelectTechnicianOpen(true);
  };

  // Handle technician selection and assignment
  const handleTechnicianSelect = (technicianIds: string[], technicianNames: string[]) => {
    if (!currentTaskForTechnician) return;

    updateTaskMutation.mutate({
      taskId: currentTaskForTechnician.id,
      status: 'assigned_to_radnik',
      assigned_to: technicianIds.join(','),
      assigned_to_name: technicianNames.join(', ')
    });

    setSelectTechnicianOpen(false);
    setCurrentTaskForTechnician(null);
  };

  // Handle opening worker profile
  const handleViewWorkerProfile = (worker: any) => {
    setSelectedWorker(worker);
    setWorkerProfileOpen(true);
  };

  // Handle opening task details
  const handleViewTaskDetails = (task: any) => {
    setSelectedTaskForDetails(task);
    setSelectedTaskForDetailsId(task.id);
    setTaskDetailsOpen(true);
  };

  // Handle opening external completion dialog
  const handleOpenExternalCompletion = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setExternalCompletionTask({ id: task.id, title: task.title });
    setExternalCompletionNotes('');
    setExternalCompletionPhotos([]);
    setExternalCompletionOpen(true);
  };

  // Handle submitting external task completion
  const handleSubmitExternalCompletion = () => {
    if (!externalCompletionTask) return;
    const photoDataUrls = externalCompletionPhotos.map(p => p.dataUrl);
    completeExternalTaskMutation.mutate({
      taskId: externalCompletionTask.id,
      completionNotes: externalCompletionNotes,
      photos: photoDataUrls
    });
  };

  // Safely parse images from task
  const parseTaskImages = (images: any): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  return (
    <>
      <SelectTechnicianDialog
        open={selectTechnicianOpen}
        onOpenChange={setSelectTechnicianOpen}
        onSelectTechnician={handleTechnicianSelect}
        taskTitle={currentTaskForTechnician?.title || ''}
      />
      <WorkerProfileDialog
        open={workerProfileOpen}
        onOpenChange={setWorkerProfileOpen}
        worker={selectedWorker}
      />
      <TeamPerformanceDialog
        open={teamPerformanceOpen}
        onOpenChange={setTeamPerformanceOpen}
      />
      <DailyReportDialog
        open={dailyReportOpen}
        onOpenChange={setDailyReportOpen}
      />
      <TaskDetailsDialog
        open={taskDetailsOpen}
        onOpenChange={setTaskDetailsOpen}
        task={selectedTaskForDetails ? {
          id: selectedTaskForDetails.id,
          title: selectedTaskForDetails.title,
          description: selectedTaskForDetails.description,
          location: selectedTaskForDetails.location,
          room_number: selectedTaskForDetails.room_number,
          priority: selectedTaskForDetails.priority,
          status: selectedTaskForDetails.status,
          time: selectedTaskForDetails.created_at || new Date().toISOString(),
          fromName: selectedTaskForDetails.created_by_name || 'Unknown',
          from: selectedTaskForDetails.created_by || 'operator',
          images: parseTaskImages(taskDetailForDetails?.task?.images ?? selectedTaskForDetails.images),
          worker_images: parseTaskImages(taskDetailForDetails?.task?.worker_images ?? selectedTaskForDetails.worker_images),
          assigned_to_name: selectedTaskForDetails.assigned_to_name,
          is_recurring: selectedTaskForDetails.is_recurring,
          recurrence_pattern: selectedTaskForDetails.recurrence_pattern,
          worker_report: selectedTaskForDetails.worker_report,
          created_at: selectedTaskForDetails.created_at,
          parent_task_id: selectedTaskForDetails.parent_task_id,
          scheduled_for: selectedTaskForDetails.scheduled_for
        } : null}
        currentUserRole={user?.role}
        onAssignToWorker={handleAssignToWorker}
        onEdit={(taskId) => {
          setEditTaskId(taskId);
          setEditTaskOpen(true);
        }}
      />
      <EditTaskDialog
        open={editTaskOpen}
        onOpenChange={setEditTaskOpen}
        taskId={editTaskId}
      />
      
      {/* External Task Completion Dialog */}
      <Dialog open={externalCompletionOpen} onOpenChange={setExternalCompletionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Završi zadatak externe firme
            </DialogTitle>
            <DialogDescription>
              {externalCompletionTask?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="completion-notes">Napomene o popravci</Label>
              <Textarea
                id="completion-notes"
                placeholder="Unesite detalje o izvršenoj popravci, korištenim materijalima, trajanju radova..."
                value={externalCompletionNotes}
                onChange={(e) => setExternalCompletionNotes(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-completion-notes"
              />
            </div>
            <div className="space-y-2">
              <Label>Fotografije popravke</Label>
              <PhotoUpload
                photos={externalCompletionPhotos}
                onPhotosChange={setExternalCompletionPhotos}
                label="Dodajte fotografije sa popravke (opciono)"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setExternalCompletionOpen(false)}
              data-testid="button-cancel-completion"
            >
              Odustani
            </Button>
            <Button
              onClick={handleSubmitExternalCompletion}
              disabled={completeExternalTaskMutation.isPending}
              data-testid="button-confirm-completion"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {completeExternalTaskMutation.isPending ? 'Završavam...' : 'Označi kao završeno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium">{t('supervisorDashboard')}</h1>
          <p className="text-muted-foreground mt-1">
            {user?.fullName} - {user?.role}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <CreateRecurringTaskDialog 
              trigger={
                <Button 
                  variant="outline" 
                  className="justify-start w-full"
                  data-testid="button-create-recurring"
                >
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  <span className="font-medium">{t('assignTask')}</span>
                </Button>
              }
            />
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => setTeamPerformanceOpen(true)}
              data-testid="button-view-performance"
            >
              <TrendingUp className="w-4 h-4 mr-2 text-primary" />
              <span className="font-medium">Statistika</span>
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => setDailyReportOpen(true)}
              data-testid="button-generate-report"
            >
              <FileText className="w-4 h-4 mr-2 text-primary" />
              <span className="font-medium">Izveštaj (period)</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="my-tasks" className="space-y-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="my-tasks" data-testid="tab-my-tasks">
                Moji zadaci
              </TabsTrigger>
              <TabsTrigger value="all-tasks" data-testid="tab-all-tasks">
                Zadaci
              </TabsTrigger>
              <TabsTrigger value="overview" data-testid="tab-overview">
                Pregled
              </TabsTrigger>
            </TabsList>

            {/* Moji zadaci Tab */}
            <TabsContent value="my-tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Zadaci vraćeni od majstora</span>
                    <Badge variant="secondary">{tasksFromOperator.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className={tasksFromOperator.length > 3 ? "overflow-y-auto pr-2" : ""}
                    style={{
                      maxHeight: tasksFromOperator.length > 3 ? '600px' : 'auto'
                    }}
                  >
                    <div className="space-y-4">
                      {tasksFromOperator.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nema novih zadataka
                        </p>
                      ) : (
                        tasksFromOperator
                          .sort((a, b) => {
                            // Sort by execution date (earliest first)
                            const getExecutionDate = (task: any) => {
                              if (task.is_recurring && !task.parent_task_id && task.next_occurrence) {
                                return new Date(task.next_occurrence);
                              }
                              if (task.parent_task_id && task.scheduled_for) {
                                return new Date(task.scheduled_for);
                              }
                              return new Date(task.created_at);
                            };
                            return getExecutionDate(a).getTime() - getExecutionDate(b).getTime();
                          })
                          .map((task) => (
                    <Card key={task.id} className="p-4">
                      <div className="space-y-4">
                        <div 
                          className="space-y-4 cursor-pointer hover-elevate rounded-md p-2 -m-2"
                          onClick={() => handleViewTaskDetails(task)}
                          data-testid={`task-card-clickable-${task.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3 className="font-medium">{task.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                From: {task.created_by_name || 'Unknown'}
                              </p>
                              {task.status === 'returned_to_sef' && task.assignment_path && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Vratio: {task.assignment_path.split(' → ').slice(-1)[0]}
                                </p>
                              )}
                            </div>
                            <Badge 
                              variant={
                                task.priority === 'urgent' ? 'destructive' : 
                                task.priority === 'normal' ? 'default' : 
                                'secondary'
                              }
                            >
                              {task.priority === 'urgent' ? t('urgent') : 
                               task.priority === 'normal' ? t('normal') : 
                               t('can_wait')}
                            </Badge>
                          </div>
                          
                          <p className="text-sm">{task.description}</p>
                          <p className="text-xs text-muted-foreground">{getElapsedTime(new Date(task.created_at))}</p>
                        </div>

                        <div className="space-y-2" data-testid={`assignment-section-${task.id}`}>
                          {(task.status === 'with_sef' || task.status === 'returned_to_sef') ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssignToWorker(task.id, task.title);
                                }}
                                data-testid={`button-assign-${task.id}`}
                              >
                                <CheckCircle className="w-3 h-3 mr-2" />
                                {t('assignToWorker')}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sendToExternalMutation.mutate(task.id);
                                }}
                                disabled={sendToExternalMutation.isPending}
                                data-testid={`button-send-to-external-${task.id}`}
                              >
                                <Send className="w-3 h-3 mr-2" />
                                {t('notifyExternalCompany')}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                variant="secondary"
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600"
                                disabled
                                data-testid={`button-external-notified-${task.id}`}
                              >
                                <Send className="w-3 h-3 mr-2" />
                                {t('externalCompanyNotified')}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenExternalCompletion(task, e);
                                }}
                                disabled={completeExternalTaskMutation.isPending}
                                data-testid={`button-complete-external-${task.id}`}
                              >
                                <CheckCircle className="w-3 h-3 mr-2" />
                                {t('complete')}
                              </Button>
                            </>
                          )}
                          
                          {/* Delete button for recurring tasks */}
                          {task.is_recurring && (
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Da li ste sigurni da želite da obrišete ovaj ponavljajući zadatak?')) {
                                  deleteRecurringTaskMutation.mutate(task.id);
                                }
                              }}
                              disabled={deleteRecurringTaskMutation.isPending}
                              data-testid={`button-delete-recurring-${task.id}`}
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Obriši Zadatak
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Tasks Tab - Same as AdminDashboard with Predstojeći/Istorija tabs */}
            <TabsContent value="all-tasks" className="space-y-4">
              <Card>
                <CardHeader className="space-y-3 pb-3">
                  <Tabs value={taskViewTab} onValueChange={setTaskViewTab} className="w-full">
                    <div className="flex flex-row items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <TabsList className="grid w-auto grid-cols-2 gap-1 bg-blue-100 p-1">
                          <TabsTrigger 
                            value="upcoming" 
                            data-testid="tab-upcoming-tasks"
                            className="flex items-center gap-2 px-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                          >
                            <Calendar className="h-4 w-4" />
                            Predstojeći
                          </TabsTrigger>
                          <TabsTrigger 
                            value="history" 
                            data-testid="tab-history-tasks"
                            className="flex items-center gap-2 px-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                          >
                            <History className="h-4 w-4" />
                            Istorija
                          </TabsTrigger>
                        </TabsList>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/tasks'] })}
                        data-testid="button-refresh-tasks"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>

                    <TabsContent value="upcoming" className="mt-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          { value: '1d', label: 'Danas' },
                          { value: '7d', label: '7 dana' },
                          { value: '30d', label: '30 dana' },
                          { value: '3m', label: '3 mjeseca' },
                          { value: '6m', label: '6 mjeseci' },
                        ].map((period) => (
                          <Button
                            key={period.value}
                            type="button"
                            variant={tasksPeriodFilter === period.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTasksPeriodFilter(period.value)}
                            data-testid={`period-filter-${period.value}`}
                          >
                            {period.label}
                          </Button>
                        ))}
                        <div className="ml-2 border-l pl-2">
                          <Select 
                            value={tasksStatusFilter} 
                            onValueChange={setTasksStatusFilter}
                          >
                            <SelectTrigger className="w-36" data-testid="select-status-filter">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Svi statusi</SelectItem>
                              <SelectItem value="completed">Završeno</SelectItem>
                              <SelectItem value="in_progress">U toku</SelectItem>
                              <SelectItem value="pending">Na čekanju</SelectItem>
                              <SelectItem value="external">Eksterna</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          { value: '7d', label: '7 dana' },
                          { value: '30d', label: '30 dana' },
                          { value: '3m', label: '3 mjeseca' },
                          { value: '6m', label: '6 mjeseci' },
                        ].map((period) => (
                          <Button
                            key={period.value}
                            type="button"
                            variant={historyPeriodFilter === period.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setHistoryPeriodFilter(period.value)}
                            data-testid={`history-period-filter-${period.value}`}
                          >
                            {period.label}
                          </Button>
                        ))}
                        <div className="ml-2 border-l pl-2">
                          <Select 
                            value={historyStatusFilter} 
                            onValueChange={setHistoryStatusFilter}
                          >
                            <SelectTrigger className="w-36" data-testid="select-history-status-filter">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Svi statusi</SelectItem>
                              <SelectItem value="completed">Završeno</SelectItem>
                              <SelectItem value="in_progress">U toku</SelectItem>
                              <SelectItem value="pending">Na čekanju</SelectItem>
                              <SelectItem value="external">Eksterna</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      <div className="h-20 bg-muted animate-pulse rounded" />
                      <div className="h-20 bg-muted animate-pulse rounded" />
                      <div className="h-20 bg-muted animate-pulse rounded" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-3">
                        {taskViewTab === 'upcoming' ? (
                          (() => {
                            const tasks = tasksResponse?.tasks || [];
                            const getFilteredTasks = () => {
                              const now = new Date();
                              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                              const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                              let endDate: Date | null = null;
                              
                              // Isključi recurring templates - prikazujemo samo child taskove i jednokratne zadatke
                              const activeTasks = tasks.filter(task => {
                                if (task.is_recurring && !task.parent_task_id) {
                                  return false;
                                }
                                return true;
                              });
                              
                              let periodFiltered = activeTasks;
                              
                              if (tasksPeriodFilter === '1d') {
                                periodFiltered = activeTasks.filter(task => {
                                  if (task.status === 'returned_to_sef') return true;
                                  if (task.scheduled_for) {
                                    const scheduledDate = new Date(task.scheduled_for);
                                    const isScheduledToday = scheduledDate >= todayStart && scheduledDate < todayEnd;
                                    return isScheduledToday;
                                  }
                                  const createdDate = new Date(task.created_at);
                                  return createdDate >= todayStart && createdDate < todayEnd;
                                });
                              } else {
                                switch (tasksPeriodFilter) {
                                  case '7d':
                                    endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                                    break;
                                  case '30d':
                                    endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                                    break;
                                  case '3m':
                                    endDate = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
                                    break;
                                  case '6m':
                                    endDate = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
                                    break;
                                }
                                
                                if (endDate) {
                                  periodFiltered = activeTasks.filter(task => {
                                    if (task.status === 'returned_to_sef') return true;
                                    if (task.scheduled_for) {
                                      const scheduledDate = new Date(task.scheduled_for);
                                      return scheduledDate >= todayStart && scheduledDate <= endDate!;
                                    }
                                    
                                    const createdDate = new Date(task.created_at);
                                    return createdDate >= todayStart && createdDate <= endDate!;
                                  });
                                }
                              }
                              
                              if (tasksStatusFilter === 'all') {
                                return periodFiltered;
                              }
                              
                              return periodFiltered.filter(task => {
                                switch (tasksStatusFilter) {
                                  case 'completed':
                                    return task.status === 'completed';
                                  case 'in_progress':
                                    return task.status === 'assigned_to_radnik' || 
                                           task.status === 'with_operator' || 
                                           task.status === 'in_progress';
                                  case 'pending':
                                    return task.status === 'new' || 
                                           task.status === 'pending' || 
                                           task.status === 'assigned_to_operator';
                                  case 'external':
                                    return task.status === 'with_external';
                                  default:
                                    return true;
                                }
                              });
                            };
                            
                            const filteredTasks = getFilteredTasks();
                            
                            if (filteredTasks.length === 0) {
                              return (
                                <p className="text-center text-muted-foreground py-8">
                                  Nema predstojećih zadataka
                                </p>
                              );
                            }
                            
                            return filteredTasks
                              .sort((a, b) => {
                                const dateA = a.scheduled_for ? new Date(a.scheduled_for) : new Date(a.created_at);
                                const dateB = b.scheduled_for ? new Date(b.scheduled_for) : new Date(b.created_at);
                                return dateA.getTime() - dateB.getTime();
                              })
                              .map((task) => {
                              const getStatusBadge = (status: string) => {
                                if (status === 'completed') {
                                  return <Badge variant="default" className="bg-green-600">Završeno</Badge>;
                                } else if (status === 'assigned_to_radnik' || status === 'with_operator') {
                                  return <Badge variant="secondary">U toku</Badge>;
                                } else if (status === 'with_external') {
                                  return <Badge variant="outline">Eksterna firma</Badge>;
                                }
                                return <Badge variant="secondary">{status}</Badge>;
                              };

                              const formatDate = (dateStr: string) => {
                                const date = new Date(dateStr);
                                return date.toLocaleDateString('sr-RS', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              };

                              return (
                                <div 
                                  key={task.id} 
                                  className="p-4 border rounded-md hover-elevate cursor-pointer"
                                  data-testid={`task-item-${task.id}`}
                                  onClick={() => handleViewTaskDetails(task)}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                                        {task.scheduled_for ? (
                                          <span>Zakazano: {formatDate(task.scheduled_for)}</span>
                                        ) : (
                                          formatDate(task.created_at)
                                        )}
                                      </div>
                                      <div className="flex flex-col gap-1 items-end">
                                        {getStatusBadge(task.status)}
                                        {(task.parent_task_id || task.is_recurring) ? (
                                          <Badge 
                                            variant="outline" 
                                            className={`text-xs ${task.recurrence_pattern === 'cancelled' 
                                              ? 'bg-red-50 border-red-200 text-red-700' 
                                              : 'bg-purple-50 border-purple-200 text-purple-700'}`}
                                          >
                                            Periodicni{task.recurrence_pattern === 'cancelled' && ' (Ukinut)'}
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-600">
                                            Jednokratan
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <h3 className="font-medium text-base mb-2">{task.title}</h3>
                                      {task.description && (
                                        <p className="text-sm mb-2">{task.description}</p>
                                      )}
                                      <div className="space-y-1 text-sm text-muted-foreground">
                                        {task.created_by_name && (
                                          <p>Prijavio: {task.created_by_name}</p>
                                        )}
                                        {task.assigned_to_name && (
                                          <div className="flex items-start gap-1.5 flex-wrap">
                                            <span>{task.status === 'completed' ? 'Izvršio' : 'Dodeljeno'}:</span>
                                            {(() => {
                                              const names = task.assigned_to_name.split(',').map((n: string) => n.trim()).filter(Boolean);
                                              const confirmedSet = new Set(((task as any).receipt_confirmed_by_name || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean));
                                              const showPending = task.status !== 'completed' && task.status !== 'cancelled';
                                              return names.map((name: string, idx: number) => {
                                                const isConfirmed = confirmedSet.has(name.toLowerCase());
                                                const tooltipText = task.status === 'completed' ? 'Obavio zadatak' : 'Potvrdio prijem';
                                                return (
                                                  <span key={idx} className="inline-flex items-center gap-1">
                                                    <span>{name}</span>
                                                    {isConfirmed ? (
                                                      <CheckCircle className="w-4 h-4 text-green-600" data-testid={`status-receipt-confirmed-${task.id}-${idx}`}>
                                                        <title>{tooltipText}</title>
                                                      </CheckCircle>
                                                    ) : showPending ? (
                                                      <Clock className="w-4 h-4 text-orange-500" data-testid={`status-receipt-pending-${task.id}-${idx}`}>
                                                        <title>Nije potvrdio prijem</title>
                                                      </Clock>
                                                    ) : null}
                                                    {idx < names.length - 1 && <span>,</span>}
                                                  </span>
                                                );
                                              });
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {/* Button to complete external company task */}
                                    {task.status === 'with_external' && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="mt-3 w-full"
                                        onClick={(e) => handleOpenExternalCompletion(task, e)}
                                        data-testid={`button-complete-external-${task.id}`}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Završi zadatak
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()
                        ) : (
                          (() => {
                            const tasks = tasksResponse?.tasks || [];
                            const getHistoryTasks = () => {
                              const now = new Date();
                              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                              let startDate: Date | null = null;
                              
                              // Isključi recurring templates - prikazujemo samo child taskove i jednokratne zadatke
                              const activeTasks = tasks.filter(task => {
                                if (task.is_recurring && !task.parent_task_id) {
                                  return false;
                                }
                                return true;
                              });
                              
                              // Odredi relevantni datum za svaki zadatak
                              const getTaskDate = (task: any): Date => {
                                // Za završene zadatke - koristi completed_at
                                if (task.status === 'completed' && task.completed_at) {
                                  return new Date(task.completed_at);
                                }
                                // Za periodične/zakazane zadatke - koristi scheduled_for
                                if (task.scheduled_for) {
                                  return new Date(task.scheduled_for);
                                }
                                // Za jednokratne - koristi created_at
                                return new Date(task.created_at);
                              };
                              
                              // Odredi početni datum na osnovu izabranog perioda
                              switch (historyPeriodFilter) {
                                case '7d':
                                  startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                                  break;
                                case '30d':
                                  startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                                  break;
                                case '3m':
                                  startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                                  break;
                                case '6m':
                                  startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                                  break;
                                default:
                                  startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                              }
                              
                              // Filtriraj zadatke koji su u izabranom periodu
                              // Završeni zadaci se prikazuju u istoriji (uključujući danas završene)
                              // Nezavršeni zadaci se prikazuju samo ako su kreirani/zakazani pre danas
                              const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                              let periodFiltered = activeTasks.filter(task => {
                                const taskDate = getTaskDate(task);
                                // Završeni zadaci - prikaži ako su završeni u izabranom periodu (uključujući danas)
                                if (task.status === 'completed') {
                                  return taskDate >= startDate! && taskDate < todayEnd;
                                }
                                // Nezavršeni zadaci - prikaži samo ako su pre danas
                                return taskDate >= startDate! && taskDate < todayStart;
                              });
                              
                              if (historyStatusFilter === 'all') {
                                return periodFiltered;
                              }
                              
                              return periodFiltered.filter(task => {
                                switch (historyStatusFilter) {
                                  case 'completed':
                                    return task.status === 'completed';
                                  case 'in_progress':
                                    return task.status === 'assigned_to_radnik' || 
                                           task.status === 'with_operator' || 
                                           task.status === 'in_progress';
                                  case 'pending':
                                    return task.status === 'new' || 
                                           task.status === 'pending' || 
                                           task.status === 'assigned_to_operator';
                                  case 'external':
                                    return task.status === 'with_external';
                                  default:
                                    return true;
                                }
                              });
                            };
                            
                            const historyTasks = getHistoryTasks();
                            
                            if (historyTasks.length === 0) {
                              return (
                                <p className="text-center text-muted-foreground py-8">
                                  Nema zadataka u istoriji
                                </p>
                              );
                            }
                            
                            return historyTasks
                              .sort((a, b) => {
                                const dateA = a.completed_at ? new Date(a.completed_at) : new Date(a.created_at);
                                const dateB = b.completed_at ? new Date(b.completed_at) : new Date(b.created_at);
                                return dateB.getTime() - dateA.getTime();
                              })
                              .map((task) => {
                              const getStatusBadge = (status: string) => {
                                if (status === 'completed') {
                                  return <Badge variant="default" className="bg-green-600">Završeno</Badge>;
                                } else if (status === 'assigned_to_radnik' || status === 'with_operator') {
                                  return <Badge variant="secondary">U toku</Badge>;
                                } else if (status === 'with_external') {
                                  return <Badge variant="outline">Eksterna firma</Badge>;
                                }
                                return <Badge variant="secondary">{status}</Badge>;
                              };

                              const formatDate = (dateStr: string) => {
                                const date = new Date(dateStr);
                                return date.toLocaleDateString('sr-RS', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              };

                              return (
                                <div 
                                  key={task.id} 
                                  className="p-4 border rounded-md hover-elevate cursor-pointer"
                                  data-testid={`history-task-item-${task.id}`}
                                  onClick={() => handleViewTaskDetails(task)}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                                        {task.completed_at ? (
                                          <span>Završeno: {formatDate(task.completed_at)}</span>
                                        ) : task.scheduled_for ? (
                                          <span>Zakazano: {formatDate(task.scheduled_for)}</span>
                                        ) : (
                                          formatDate(task.created_at)
                                        )}
                                      </div>
                                      <div className="flex flex-col gap-1 items-end">
                                        {getStatusBadge(task.status)}
                                        {(task.parent_task_id || task.is_recurring) ? (
                                          <Badge 
                                            variant="outline" 
                                            className={`text-xs ${task.recurrence_pattern === 'cancelled' 
                                              ? 'bg-red-50 border-red-200 text-red-700' 
                                              : 'bg-purple-50 border-purple-200 text-purple-700'}`}
                                          >
                                            Periodicni{task.recurrence_pattern === 'cancelled' && ' (Ukinut)'}
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-600">
                                            Jednokratan
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <h3 className="font-medium text-base mb-2">{task.title}</h3>
                                      {task.description && (
                                        <p className="text-sm mb-2">{task.description}</p>
                                      )}
                                      <div className="space-y-1 text-sm text-muted-foreground">
                                        {task.created_by_name && (
                                          <p>Prijavio: {task.created_by_name}</p>
                                        )}
                                        {task.assigned_to_name && (
                                          <div className="flex items-start gap-1.5 flex-wrap">
                                            <span>{task.status === 'completed' ? 'Izvršio' : 'Dodeljeno'}:</span>
                                            {(() => {
                                              const names = task.assigned_to_name.split(',').map((n: string) => n.trim()).filter(Boolean);
                                              const confirmedSet = new Set(((task as any).receipt_confirmed_by_name || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean));
                                              const showPending = task.status !== 'completed' && task.status !== 'cancelled';
                                              return names.map((name: string, idx: number) => {
                                                const isConfirmed = confirmedSet.has(name.toLowerCase());
                                                const tooltipText = task.status === 'completed' ? 'Obavio zadatak' : 'Potvrdio prijem';
                                                return (
                                                  <span key={idx} className="inline-flex items-center gap-1">
                                                    <span>{name}</span>
                                                    {isConfirmed ? (
                                                      <CheckCircle className="w-4 h-4 text-green-600" data-testid={`status-receipt-confirmed-${task.id}-${idx}`}>
                                                        <title>{tooltipText}</title>
                                                      </CheckCircle>
                                                    ) : showPending ? (
                                                      <Clock className="w-4 h-4 text-orange-500" data-testid={`status-receipt-pending-${task.id}-${idx}`}>
                                                        <title>Nije potvrdio prijem</title>
                                                      </Clock>
                                                    ) : null}
                                                    {idx < names.length - 1 && <span>,</span>}
                                                  </span>
                                                );
                                              });
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {/* Button to complete external company task */}
                                    {task.status === 'with_external' && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="mt-3 w-full"
                                        onClick={(e) => handleOpenExternalCompletion(task, e)}
                                        data-testid={`button-complete-external-history-${task.id}`}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Završi zadatak
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pregled Tab - Statistika realizacije zadataka */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader className="space-y-3 pb-4">
                  <CardTitle>Statistika realizacije zadataka</CardTitle>
                  <PeriodPicker
                    value={statsRange}
                    onChange={setStatsRange}
                    granularity={statsGranularity}
                    onGranularityChange={setStatsGranularity}
                    data-testid="period-picker-supervisor-stats"
                  />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                    </div>
                  ) : (
                    (() => {
                      const tasks = tasksResponse?.tasks || [];
                      const periodTasks = tasks.filter((t: any) => {
                        if (t.status === 'cancelled') return false;
                        const rangeStartLocal = new Date(statsRange.start.getFullYear(), statsRange.start.getMonth(), statsRange.start.getDate());
                        const rangeEndLocal = new Date(statsRange.end.getFullYear(), statsRange.end.getMonth(), statsRange.end.getDate());
                        if (t.scheduled_for && t.parent_task_id) {
                          const sd = new Date(t.scheduled_for);
                          const sl = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate());
                          return sl >= rangeStartLocal && sl < rangeEndLocal;
                        }
                        const td = new Date(t.created_at);
                        const tl = new Date(td.getFullYear(), td.getMonth(), td.getDate());
                        return tl >= rangeStartLocal && tl < rangeEndLocal;
                      });
                      const completedTasks = periodTasks.filter((t: any) => t.status === 'completed');
                      const inProgressTasks = periodTasks.filter((t: any) =>
                        t.status === 'assigned_to_radnik' ||
                        t.status === 'with_operator' ||
                        t.status === 'in_progress' ||
                        t.status === 'returned_to_operator' ||
                        t.status === 'returned_to_sef'
                      );
                      const pendingTasks = periodTasks.filter((t: any) =>
                        t.status === 'new' ||
                        t.status === 'pending' ||
                        t.status === 'assigned_to_operator' ||
                        t.status === 'with_sef'
                      );
                      const externalTasks = periodTasks.filter((t: any) => t.status === 'with_external');
                      const receiptConfirmedTasks = periodTasks.filter((t: any) => t.receipt_confirmed_at);
                      const receiptUnconfirmedTasks = periodTasks.filter((t: any) =>
                        !t.receipt_confirmed_at && t.status !== 'completed' && t.status !== 'cancelled'
                      );
                      const completionRate = periodTasks.length > 0
                        ? Math.round((completedTasks.length / periodTasks.length) * 100)
                        : 0;

                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 border rounded-md bg-muted/30">
                              <p className="text-xs text-muted-foreground">Izabrani period</p>
                              <p className="text-xl font-bold mt-0.5">{periodTasks.length}</p>
                              <p className="text-xs text-muted-foreground">Ukupno</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'receipt_confirmed' ? null : 'receipt_confirmed')}
                              className={`p-3 border rounded-md bg-muted/30 text-left cursor-pointer transition-all duration-200 hover:shadow-md ${selectedStatusFilter === 'receipt_confirmed' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                              data-testid="sup-stat-receipt-confirmed"
                            >
                              <p className="text-xs text-muted-foreground">Potvrđen prijem</p>
                              <p className="text-xl font-bold text-blue-600 mt-0.5">{receiptConfirmedTasks.length}</p>
                              <p className="text-xs text-muted-foreground">Majstor primio</p>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'receipt_unconfirmed' ? null : 'receipt_unconfirmed')}
                              className={`p-3 border rounded-md bg-muted/30 text-left cursor-pointer transition-all duration-200 hover:shadow-md ${selectedStatusFilter === 'receipt_unconfirmed' ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                              data-testid="sup-stat-receipt-unconfirmed"
                            >
                              <p className="text-xs text-muted-foreground">Nepotvrđen prijem</p>
                              <p className="text-xl font-bold text-red-600 mt-0.5">{receiptUnconfirmedTasks.length}</p>
                              <p className="text-xs text-muted-foreground">Majstor nije primio</p>
                            </button>
                            <div className="p-3 border rounded-md bg-muted/30">
                              <p className="text-xs text-muted-foreground">Stopa realizacije</p>
                              <p className="text-xl font-bold text-green-600 mt-0.5">{completionRate}%</p>
                            </div>
                          </div>

                          <div className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <button
                                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'completed' ? null : 'completed')}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${selectedStatusFilter === 'completed' ? 'bg-green-50 border-green-500 shadow-md scale-105' : 'border-green-300 hover:border-green-500 hover:shadow-md hover:scale-102'}`}
                                data-testid="sup-filter-button-completed"
                              >
                                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Završeno</p>
                                <p className="text-3xl font-bold text-green-600 mt-2">{completedTasks.length}</p>
                              </button>
                              <button
                                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'in_progress' ? null : 'in_progress')}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${selectedStatusFilter === 'in_progress' ? 'bg-blue-50 border-blue-500 shadow-md scale-105' : 'border-blue-300 hover:border-blue-500 hover:shadow-md hover:scale-102'}`}
                                data-testid="sup-filter-button-in-progress"
                              >
                                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">U toku</p>
                                <p className="text-3xl font-bold text-blue-600 mt-2">{inProgressTasks.length}</p>
                              </button>
                              <button
                                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'pending' ? null : 'pending')}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${selectedStatusFilter === 'pending' ? 'bg-yellow-50 border-yellow-500 shadow-md scale-105' : 'border-yellow-300 hover:border-yellow-500 hover:shadow-md hover:scale-102'}`}
                                data-testid="sup-filter-button-pending"
                              >
                                <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Na čekanju</p>
                                <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingTasks.length}</p>
                              </button>
                              <button
                                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'external' ? null : 'external')}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${selectedStatusFilter === 'external' ? 'bg-purple-50 border-purple-500 shadow-md scale-105' : 'border-purple-300 hover:border-purple-500 hover:shadow-md hover:scale-102'}`}
                                data-testid="sup-filter-button-external"
                              >
                                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Eksterna</p>
                                <p className="text-3xl font-bold text-purple-600 mt-2">{externalTasks.length}</p>
                              </button>
                            </div>
                          </div>

                          {selectedStatusFilter && (
                            <div className="mt-6 pt-6 border-t">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">
                                  {selectedStatusFilter === 'completed' && 'Završeni zadaci'}
                                  {selectedStatusFilter === 'in_progress' && 'Zadaci u toku'}
                                  {selectedStatusFilter === 'pending' && 'Zadaci na čekanju'}
                                  {selectedStatusFilter === 'external' && 'Zadaci - Eksterna firma'}
                                  {selectedStatusFilter === 'receipt_confirmed' && 'Zadaci - Majstor potvrdio prijem'}
                                  {selectedStatusFilter === 'receipt_unconfirmed' && 'Zadaci - Majstor nije potvrdio prijem'}
                                </h3>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedStatusFilter(null)}
                                  data-testid="sup-button-clear-filter"
                                >
                                  Obriši filter
                                </Button>
                              </div>
                              <ScrollArea className="h-[400px] border rounded-md pr-4">
                                <div className="space-y-3 p-4">
                                  {(() => {
                                    let filteredTasks: any[] = [];
                                    if (selectedStatusFilter === 'completed') filteredTasks = completedTasks;
                                    else if (selectedStatusFilter === 'in_progress') filteredTasks = inProgressTasks;
                                    else if (selectedStatusFilter === 'pending') filteredTasks = pendingTasks;
                                    else if (selectedStatusFilter === 'external') filteredTasks = externalTasks;
                                    else if (selectedStatusFilter === 'receipt_confirmed') filteredTasks = receiptConfirmedTasks;
                                    else if (selectedStatusFilter === 'receipt_unconfirmed') filteredTasks = receiptUnconfirmedTasks;

                                    if (filteredTasks.length === 0) {
                                      return (
                                        <p className="text-center text-muted-foreground py-6 text-sm">
                                          Nema zadataka za izabrani period
                                        </p>
                                      );
                                    }

                                    const fmt = (s: string) => new Date(s).toLocaleDateString('sr-RS', {
                                      day: '2-digit', month: '2-digit', year: 'numeric',
                                      hour: '2-digit', minute: '2-digit'
                                    });
                                    const statusBadge = (status: string) => {
                                      if (status === 'completed') return <Badge variant="default" className="bg-green-600">Završeno</Badge>;
                                      if (status === 'assigned_to_radnik' || status === 'with_operator' || status === 'in_progress') return <Badge variant="secondary">U toku</Badge>;
                                      if (status === 'returned_to_operator' || status === 'returned_to_sef') return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">Vraćeno</Badge>;
                                      if (status === 'with_external') return <Badge variant="outline">Eksterna firma</Badge>;
                                      if (status === 'new') return <Badge variant="outline">Novo</Badge>;
                                      return <Badge variant="secondary">{status}</Badge>;
                                    };

                                    return filteredTasks
                                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                      .map((task: any) => (
                                        <div
                                          key={task.id}
                                          className="p-3 border rounded-md hover-elevate cursor-pointer"
                                          data-testid={`sup-filtered-task-item-${task.id}`}
                                          onClick={() => handleViewTaskDetails(task)}
                                        >
                                          <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className="text-xs text-muted-foreground">{fmt(task.created_at)}</span>
                                            <div className="flex flex-col gap-1 items-end">
                                              {statusBadge(task.status)}
                                              {(task.parent_task_id || task.is_recurring) ? (
                                                <Badge
                                                  variant="outline"
                                                  className={`text-xs ${task.recurrence_pattern === 'cancelled'
                                                    ? 'bg-red-50 border-red-200 text-red-700'
                                                    : 'bg-purple-50 border-purple-200 text-purple-700'}`}
                                                >
                                                  Periodicni{task.recurrence_pattern === 'cancelled' && ' (Ukinut)'}
                                                </Badge>
                                              ) : (
                                                <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-600">
                                                  Jednokratan
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                          <h4 className="font-medium text-sm">{task.title}</h4>
                                          {task.description && (
                                            <p className="text-xs text-foreground mt-1 whitespace-pre-wrap break-words">{task.description}</p>
                                          )}
                                          {task.created_by_name && (
                                            <p className="text-xs text-muted-foreground mt-1">Prijavio: {task.created_by_name}</p>
                                          )}
                                          {task.assigned_to_name && (
                                            <div className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5 flex-wrap">
                                              <span>{task.status === 'completed' ? 'Izvršio' : 'Dodijeljeno'}:</span>
                                              {(() => {
                                                const names = task.assigned_to_name.split(',').map((n: string) => n.trim()).filter(Boolean);
                                                const confirmedSet = new Set((task.receipt_confirmed_by_name || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean));
                                                const showPending = task.status !== 'completed' && task.status !== 'cancelled';
                                                return names.map((name: string, idx: number) => {
                                                  const isConfirmed = confirmedSet.has(name.toLowerCase());
                                                  const tooltipText = task.status === 'completed' ? 'Obavio zadatak' : 'Potvrdio prijem';
                                                  return (
                                                    <span key={idx} className="inline-flex items-center gap-1">
                                                      <span>{name}</span>
                                                      {isConfirmed ? (
                                                        <CheckCircle className="w-3.5 h-3.5 text-green-600">
                                                          <title>{tooltipText}</title>
                                                        </CheckCircle>
                                                      ) : showPending ? (
                                                        <Clock className="w-3.5 h-3.5 text-orange-500">
                                                          <title>Nije potvrdio prijem</title>
                                                        </Clock>
                                                      ) : null}
                                                      {idx < names.length - 1 && <span>,</span>}
                                                    </span>
                                                  );
                                                });
                                              })()}
                                            </div>
                                          )}
                                        </div>
                                      ));
                                  })()}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Workers and Tasks Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('myTeam')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myWorkers.length > 0 ? myWorkers.map((worker) => (
                  <div 
                    key={worker.id}
                    className="p-3 border rounded-md cursor-pointer hover-elevate"
                    onClick={() => handleViewWorkerProfile(worker)}
                    data-testid={`worker-card-${worker.id}`}
                  >
                    <div className="mb-2">
                      <span className="font-medium">{worker.full_name}</span>
                    </div>
                    {worker.phone && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {worker.phone}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {worker.department}
                    </p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nema dostupnih majstora
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </>
  );
}
