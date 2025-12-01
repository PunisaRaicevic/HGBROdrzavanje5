import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, Send, Plus, Clock, AlertCircle, MapPin, CheckCircle, PlayCircle, XCircle, Repeat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CreateTaskDialog from '@/components/CreateTaskDialog';
import SelectTechnicianDialog from '@/components/SelectTechnicianDialog';
import TaskDetailsDialog from '@/components/TaskDetailsDialog';

type Task = {
  id: string;
  title: string;
  description?: string;
  from: string;
  fromName: string;
  priority: 'urgent' | 'normal' | 'can_wait';
  time: string;
  location: string;
  images?: string[];
  worker_images?: string[];
  sentTo?: 'supervisor' | 'technician';
  sentAt?: string;
  assignedToName?: string;
  status: 'new' | 'with_operator' | 'assigned_to_radnik' | 'with_sef' | 'with_external' | 'returned_to_operator' | 'returned_to_sef' | 'completed' | 'cancelled' | 'in_progress';
  completedAt?: string;
  receipt_confirmed_at?: string;
  receipt_confirmed_by?: string;
  receipt_confirmed_by_name?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  parent_task_id?: string;
  scheduled_for?: string;
};

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

// Helper function to format recurrence pattern
const getRecurrenceLabel = (pattern: string | null | undefined): string | null => {
  if (!pattern || pattern === 'once') return null;
  
  const legacyLabels: Record<string, string> = {
    'daily': 'Svakog dana',
    'weekly': 'Nedjeljno',
    'monthly': 'Mjesecno'
  };
  if (legacyLabels[pattern]) return legacyLabels[pattern];
  
  const match = pattern.match(/^(\d+)_(days|weeks|months|years)$/);
  if (match) {
    const count = parseInt(match[1]);
    const unit = match[2];
    
    if (unit === 'days') {
      return count === 1 ? 'Svakog dana' : `Svaka ${count} dana`;
    } else if (unit === 'weeks') {
      if (count === 1) return 'Jednom nedjeljno';
      return `${count}x nedjeljno`;
    } else if (unit === 'months') {
      if (count === 1) return 'Jednom mjesecno';
      return `${count}x mjesecno`;
    } else if (unit === 'years') {
      if (count === 1) return 'Jednom godisnje';
      return `${count}x godisnje`;
    }
  }
  return null;
};

export default function OperatorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'new' | 'forwarded' | 'in-progress' | 'completed' | 'overdue'>('new');
  const [selectTechnicianOpen, setSelectTechnicianOpen] = useState(false);
  const [currentTaskForTechnician, setCurrentTaskForTechnician] = useState<{ id: string; title: string } | null>(null);
  const [previousNewTaskCount, setPreviousNewTaskCount] = useState<number>(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('soundNotificationsEnabled');
    return saved === 'true';
  });

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
  
  // Fetch all tasks from API
  const { data: tasksResponse, isLoading } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
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
      // Invalidate and refetch tasks
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
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

  // Helper function to parse task images (handles string arrays or JSON strings)
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

  // Map database tasks to UI format
  const mapApiTaskToUiTask = (task: any): Task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    from: task.created_by_department || 'Unknown',
    fromName: task.created_by_name || 'Unknown',
    priority: task.priority as 'urgent' | 'normal' | 'can_wait',
    time: task.created_at || new Date().toISOString(),
    location: task.location,
    images: parseTaskImages(task.images),
    worker_images: parseTaskImages(task.worker_images),
    status: task.status as Task['status'],
    sentTo: task.status === 'with_sef' ? 'supervisor' : 
            task.status === 'assigned_to_radnik' ? 'technician' : undefined,
    sentAt: task.assigned_at || task.updated_at || undefined,
    assignedToName: task.assigned_to_name || undefined,
    completedAt: task.status === 'completed' ? task.updated_at : undefined,
    receipt_confirmed_at: task.receipt_confirmed_at || undefined,
    receipt_confirmed_by: task.receipt_confirmed_by || undefined,
    receipt_confirmed_by_name: task.receipt_confirmed_by_name || undefined,
    is_recurring: task.is_recurring || false,
    recurrence_pattern: task.recurrence_pattern || undefined,
    parent_task_id: task.parent_task_id || undefined,
    scheduled_for: task.scheduled_for || undefined
  });
  
  // Get all tasks from API with smart recurring task filtering
  // Rules:
  // 1. Exclude recurring templates (is_recurring=true AND no parent_task_id)
  // 2. For recurring child tasks (has parent_task_id):
  //    - Show only tasks whose scheduled_for is today or in the past
  //    - If all are in the future, show only the earliest one (next occurrence)
  const allTasks = (() => {
    const rawTasks = tasksResponse?.tasks || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group child tasks by parent_task_id
    const childTasksByParent: Record<string, any[]> = {};
    const nonRecurringTasks: any[] = [];
    
    for (const task of rawTasks) {
      // Exclude recurring templates
      if (task.is_recurring && !task.parent_task_id) {
        continue;
      }
      
      // Group child tasks by parent
      if (task.parent_task_id) {
        if (!childTasksByParent[task.parent_task_id]) {
          childTasksByParent[task.parent_task_id] = [];
        }
        childTasksByParent[task.parent_task_id].push(task);
      } else {
        // Non-recurring task
        nonRecurringTasks.push(task);
      }
    }
    
    // Process each parent's children - keep only relevant ones
    const filteredChildTasks: any[] = [];
    for (const parentId in childTasksByParent) {
      const children = childTasksByParent[parentId];
      
      // Sort by scheduled_for date ascending
      children.sort((a, b) => {
        const dateA = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0;
        const dateB = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0;
        return dateA - dateB;
      });
      
      // Find tasks for today or past
      const todayOrPastTasks = children.filter(task => {
        if (!task.scheduled_for) return true; // No scheduled date = show it
        const scheduledDate = new Date(task.scheduled_for);
        scheduledDate.setHours(0, 0, 0, 0);
        return scheduledDate <= today;
      });
      
      if (todayOrPastTasks.length > 0) {
        // Show only today's or past tasks (most recent one that's not completed)
        const relevant = todayOrPastTasks.filter(t => t.status !== 'completed');
        if (relevant.length > 0) {
          filteredChildTasks.push(relevant[relevant.length - 1]); // Most recent
        } else {
          // All past ones completed - show earliest future one if exists
          const futureTasks = children.filter(t => {
            if (!t.scheduled_for) return false;
            const scheduledDate = new Date(t.scheduled_for);
            scheduledDate.setHours(0, 0, 0, 0);
            return scheduledDate > today;
          });
          if (futureTasks.length > 0) {
            filteredChildTasks.push(futureTasks[0]); // Earliest future
          }
        }
      } else {
        // All in future - show only the earliest one
        filteredChildTasks.push(children[0]);
      }
    }
    
    return [...nonRecurringTasks, ...filteredChildTasks].map(mapApiTaskToUiTask);
  })();
  
  // Filter tasks created by this operator (for "My Submitted Complaints" section)
  const mySubmittedTasks = allTasks.filter(task => {
    const dbTask = tasksResponse?.tasks.find((t: any) => t.id === task.id);
    return dbTask?.created_by === user?.id;
  });

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

  // Monitor new tasks and play sound when count increases
  useEffect(() => {
    const newTaskCount = allTasks.filter(task => task.status === 'new').length;
    
    // Only play sound if:
    // 1. Not initial load (previousNewTaskCount > 0)
    // 2. New task count has increased
    // 3. Not currently loading
    // 4. Audio is enabled
    if (!isLoading && previousNewTaskCount > 0 && newTaskCount > previousNewTaskCount) {
      if (audioEnabled) {
        playNotificationSound();
      }
      toast({
        title: "Nova reklamacija!",
        description: `Primljena ${newTaskCount - previousNewTaskCount} nova reklamacija.`,
      });
    }
    
    setPreviousNewTaskCount(newTaskCount);
  }, [allTasks, isLoading, audioEnabled]);

  // Filter tasks based on view mode
  const getFilteredTasks = () => {
    switch (viewMode) {
      case 'new':
        // Include tasks that need operator action: new, with_operator, returned_to_operator
        return allTasks.filter(task => 
          task.status === 'new' || 
          task.status === 'with_operator' || 
          task.status === 'returned_to_operator'
        );
      case 'forwarded':
        // Prosleđeni ali nepotvrđeni: šefu ili majstoru BEZ potvrde prijema
        return allTasks.filter(task => 
          task.status === 'with_sef' || 
          (task.status === 'assigned_to_radnik' && !task.receipt_confirmed_at)
        );
      case 'in-progress':
        // U toku: majstor potvrdio prijem, ili vraćeno šefu, ili in_progress
        return allTasks.filter(task => 
          task.status === 'returned_to_sef' || 
          task.status === 'in_progress' ||
          (task.status === 'assigned_to_radnik' && task.receipt_confirmed_at)
        );
      case 'completed':
        return allTasks.filter(task => task.status === 'completed'); // Završeni
      case 'overdue':
        return allTasks.filter(task => task.status === 'cancelled'); // Neizvršeni/otkazani
      default:
        return allTasks.filter(task => 
          task.status === 'new' || 
          task.status === 'with_operator' || 
          task.status === 'returned_to_operator'
        );
    }
  };

  const filteredTasks = getFilteredTasks();
  // Prosleđeni: šefu ili majstoru BEZ potvrde prijema
  const forwardedCount = allTasks.filter(task => 
    task.status === 'with_sef' || 
    (task.status === 'assigned_to_radnik' && !task.receipt_confirmed_at)
  ).length;
  // U toku: majstor potvrdio prijem, ili vraćeno šefu, ili in_progress
  const inProgressCount = allTasks.filter(task => 
    task.status === 'returned_to_sef' || 
    task.status === 'in_progress' ||
    (task.status === 'assigned_to_radnik' && task.receipt_confirmed_at)
  ).length;
  const completedCount = allTasks.filter(task => task.status === 'completed').length;
  const overdueCount = allTasks.filter(task => task.status === 'cancelled').length;

  const handleSendToSupervisor = (taskId: string, taskTitle: string) => {
    setProcessingTaskId(taskId);
    
    updateTaskMutation.mutate(
      { taskId, status: 'with_sef' },
      {
        onSuccess: () => {
          toast({
            title: "Zadatak poslat Šefu",
            description: `"${taskTitle}" je uspešno prosleđen supervizoru tehničke službe.`,
          });
          setProcessingTaskId(null);
        },
        onError: () => {
          setProcessingTaskId(null);
        }
      }
    );
  };

  const handleSendToTechnician = (taskId: string, taskTitle: string) => {
    // Open the technician selection dialog
    setCurrentTaskForTechnician({ id: taskId, title: taskTitle });
    setSelectTechnicianOpen(true);
  };

  const handleConfirmTechnicianSelection = (technicianIds: string[], technicianNames: string[]) => {
    if (!currentTaskForTechnician) return;
    
    // Capture task details in local variables before async operation
    const taskId = currentTaskForTechnician.id;
    const taskTitle = currentTaskForTechnician.title;
    
    setProcessingTaskId(taskId);
    // Clear current task immediately to prevent race conditions
    setCurrentTaskForTechnician(null);
    
    // Join technician IDs and names with commas for storage
    const assignedTo = technicianIds.join(',');
    const assignedToNames = technicianNames.join(', ');
    
    updateTaskMutation.mutate(
      { 
        taskId, 
        status: 'assigned_to_radnik',
        assigned_to: assignedTo,
        assigned_to_name: assignedToNames
      },
      {
        onSuccess: () => {
          const techCount = technicianIds.length;
          toast({
            title: "Zadatak poslat Majstorima",
            description: `"${taskTitle}" je uspešno prosleđen ${techCount === 1 ? 'majstoru' : `${techCount} majstora`}: ${assignedToNames}.`,
          });
          setProcessingTaskId(null);
        },
        onError: () => {
          setProcessingTaskId(null);
        }
      }
    );
  };

  const handleViewForwardedTasks = () => {
    setViewMode('forwarded');
  };

  const handleViewInProgressTasks = () => {
    setViewMode('in-progress');
  };

  const handleViewCompletedTasks = () => {
    setViewMode('completed');
  };

  const handleViewOverdueTasks = () => {
    setViewMode('overdue');
  };

  const handleBackToNewTasks = () => {
    setViewMode('new');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-medium">Panel Operatera</h1>
        <p className="text-muted-foreground mt-1">
          {user?.fullName} - {user?.role}
        </p>
        <div className="mt-4">
          <CreateTaskDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* New Tasks from Users - Dynamic size */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {viewMode === 'new' && t('newTasks')}
                {viewMode === 'forwarded' && t('forwardedTasks')}
                {viewMode === 'in-progress' && t('tasksInProgress')}
                {viewMode === 'completed' && t('completedTasks')}
                {viewMode === 'overdue' && t('overdueHistory')}
              </span>
              <Badge variant="secondary">{filteredTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea 
              className="pr-4" 
              style={{ 
                height: filteredTasks.length === 0 
                  ? '200px' 
                  : filteredTasks.length <= 2 
                    ? `${filteredTasks.length * 250}px` 
                    : 'calc(100vh - 280px)',
                maxHeight: 'calc(100vh - 280px)'
              }}
              data-testid="tasks-scroll-area"
            >
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('noTasks')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewMode === 'new' && t('allTasksProcessed')}
                    {viewMode === 'forwarded' && t('noForwardedTasks')}
                    {viewMode === 'in-progress' && t('noInProgressTasks')}
                    {viewMode === 'completed' && t('noCompletedTasksToday')}
                    {viewMode === 'overdue' && t('noOverdueTasks')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className="p-5 cursor-pointer hover-elevate transition-all" 
                    onClick={() => {
                      setSelectedTask(task);
                      setTaskDetailsOpen(true);
                    }}
                    data-testid={`card-task-${task.id}`}
                  >
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium" data-testid={`text-task-title-${task.id}`}>{task.title}</h3>
                        <p className="text-base text-muted-foreground mt-1" data-testid={`text-task-from-${task.id}`}>
                          {t('from')}: {task.fromName} ({task.from})
                        </p>
                        {task.assignedToName && (
                          <p className="text-base text-muted-foreground mt-1" data-testid={`text-task-assigned-to-${task.id}`}>
                            <span className="font-medium">{t('assignedTo')}:</span> {task.assignedToName}
                          </p>
                        )}
                        {task.description && (
                          <p className="text-base text-muted-foreground mt-2" data-testid={`text-task-description-${task.id}`}>
                            {task.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">{getElapsedTime(new Date(task.time))}</p>
                          {(task.is_recurring || task.parent_task_id) && getRecurrenceLabel(task.recurrence_pattern) && (
                            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-300 text-blue-700">
                              <Repeat className="w-3 h-3 mr-1" />
                              {getRecurrenceLabel(task.recurrence_pattern)}
                            </Badge>
                          )}
                        </div>
                        <Badge 
                          variant={
                            task.priority === 'urgent' ? 'destructive' : 
                            task.priority === 'normal' ? 'default' : 
                            'secondary'
                          }
                        >
                          {t(task.priority)}
                        </Badge>
                      </div>

                      {(task.status === 'new' || task.status === 'with_operator' || task.status === 'returned_to_operator') ? (
                        <div className="flex gap-2 flex-wrap" data-testid={`actions-task-${task.id}`} onClick={(e) => e.stopPropagation()}>
                          <Button 
                            className="flex-1 min-h-11 min-w-[160px]" 
                            data-testid={`button-send-to-supervisor-${task.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendToSupervisor(task.id, task.title);
                            }}
                            disabled={processingTaskId === task.id}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {t('sendToSupervisor')}
                          </Button>
                          <Button 
                            className="flex-1 min-h-11 min-w-[160px]"
                            data-testid={`button-send-to-technician-${task.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendToTechnician(task.id, task.title);
                            }}
                            disabled={processingTaskId === task.id}
                          >
                            {t('sendToTechnician')}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {task.sentTo && (
                            <div className="flex items-center justify-between text-base" data-testid={`sent-info-${task.id}`}>
                              <span className="text-muted-foreground">
                                Prosleđeno: {task.sentTo === 'supervisor' ? 'Šef' : task.assignedToName || 'Majstor'}
                              </span>
                              <span className="text-base text-muted-foreground">
                                {task.sentAt && new Date(task.sentAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                          {task.status && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                variant={
                                  task.status === 'completed' ? 'default' : 
                                  task.status === 'returned_to_sef' ? 'secondary' : 
                                  task.status === 'cancelled' ? 'destructive' : 
                                  'outline'
                                }
                              >
                                {(task.status === 'with_sef' || task.status === 'assigned_to_radnik') && 'Prosleđeno'}
                                {task.status === 'returned_to_sef' && 'U Toku'}
                                {task.status === 'completed' && 'Završeno'}
                                {task.status === 'cancelled' && 'Otkazano'}
                              </Badge>
                              {task.sentTo === 'technician' && (
                                <Badge 
                                  variant="outline"
                                  className={`${
                                    task.receipt_confirmed_at 
                                      ? 'bg-green-50 border-green-600 text-green-700' 
                                      : 'bg-orange-50 border-orange-600 text-orange-700'
                                  }`}
                                  data-testid={`receipt-status-${task.id}`}
                                >
                                  {task.receipt_confirmed_at ? t('receiptConfirmed') : t('receiptNotConfirmed')}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Sidebar with Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {viewMode !== 'new' && (
                <Button 
                  className="w-full justify-start min-h-11" 
                  variant="default" 
                  onClick={handleBackToNewTasks}
                  data-testid="button-back-to-new-tasks"
                >
                  <ClipboardList className="w-5 h-5 mr-2" />
                  {t('newTasks')}
                </Button>
              )}
              <Button 
                className="w-full justify-start min-h-11" 
                variant={viewMode === 'forwarded' ? 'default' : 'outline'}
                onClick={handleViewForwardedTasks}
                data-testid="button-view-forwarded-tasks"
              >
                <Send className="w-5 h-5 mr-2" />
                {t('forwardedTasks')}
              </Button>
              <Button 
                className="w-full justify-start min-h-11" 
                variant={viewMode === 'in-progress' ? 'default' : 'outline'}
                onClick={handleViewInProgressTasks}
                data-testid="button-view-in-progress-tasks"
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                {t('tasksInProgress')}
              </Button>
              <Button 
                className="w-full justify-start min-h-11" 
                variant={viewMode === 'completed' ? 'default' : 'outline'}
                onClick={handleViewCompletedTasks}
                data-testid="button-view-completed-tasks"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {t('completedTasks')}
              </Button>
              <Button 
                className="w-full justify-start min-h-11" 
                variant={viewMode === 'overdue' ? 'default' : 'outline'}
                onClick={handleViewOverdueTasks}
                data-testid="button-view-overdue-tasks"
              >
                <XCircle className="w-5 h-5 mr-2" />
                {t('overdueHistory')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('status')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 hover-elevate rounded-md">
                  <div className="flex items-center gap-3">
                    <Send className="w-5 h-5 text-blue-500" />
                    <span className="text-base">{t('forwarded')}</span>
                  </div>
                  <Badge variant="secondary">{forwardedCount}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 hover-elevate rounded-md">
                  <div className="flex items-center gap-3">
                    <PlayCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-base">{t('inProgress')}</span>
                  </div>
                  <Badge variant="secondary">{inProgressCount}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 hover-elevate rounded-md">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-base">{t('completed')}</span>
                  </div>
                  <Badge variant="secondary">{completedCount}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 hover-elevate rounded-md">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-base">{t('overdue')}</span>
                  </div>
                  <Badge variant="secondary">{overdueCount}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Details Dialog */}
      <TaskDetailsDialog
        open={taskDetailsOpen}
        onOpenChange={setTaskDetailsOpen}
        task={selectedTask}
      />

      {/* Technician Selection Dialog */}
      <SelectTechnicianDialog
        open={selectTechnicianOpen}
        onOpenChange={setSelectTechnicianOpen}
        onSelectTechnician={handleConfirmTechnicianSelection}
        taskTitle={currentTaskForTechnician?.title || ''}
      />
    </div>
  );
}
