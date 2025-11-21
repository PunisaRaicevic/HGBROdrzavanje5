import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, CheckCircle, XCircle, Clock, TrendingUp, FileText, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StatCard from '@/components/StatCard';
import SelectTechnicianDialog from '@/components/SelectTechnicianDialog';
import WorkerProfileDialog from '@/components/WorkerProfileDialog';
import TeamPerformanceDialog from '@/components/TeamPerformanceDialog';
import DailyReportDialog from '@/components/DailyReportDialog';
import CreateRecurringTaskDialog from '@/components/CreateRecurringTaskDialog';
import TaskDetailsDialog from '@/components/TaskDetailsDialog';

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
  
  // Filter state for "Zadaci" tab
  const [allTasksFilter, setAllTasksFilter] = useState<'day' | 'week' | 'month'>('day');

  // Fetch all tasks from API
  const { data: tasksResponse, isLoading } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

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

  // Mutation for completing external task
  const completeExternalTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest('PATCH', `/api/tasks/${taskId}`, { 
        status: 'completed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Uspešno!",
        description: "Zadatak je označen kao završen.",
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
  
  // Get technicians
  const myWorkers = techniciansResponse?.technicians || [];
  
  // Filter all tasks by selected period
  const filterTasksByPeriod = (tasks: any[], filter: 'day' | 'week' | 'month') => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Day range: today only
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(startOfToday.getDate() + 1);
    
    // Week range: next 7 days from today
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(startOfToday.getDate() + 7);
    
    // Month range: next 30 days from today
    const endOfMonth = new Date(startOfToday);
    endOfMonth.setDate(startOfToday.getDate() + 30);

    return tasks.filter(task => {
      // For recurring child tasks, use scheduled_for (planned execution date)
      // For regular tasks, use created_at
      const taskDate = task.parent_task_id && task.scheduled_for 
        ? new Date(task.scheduled_for)
        : new Date(task.created_at);
      
      if (filter === 'day') {
        return taskDate >= startOfToday && taskDate < endOfToday;
      } else if (filter === 'week') {
        return taskDate >= startOfToday && taskDate < endOfWeek;
      } else if (filter === 'month') {
        return taskDate >= startOfToday && taskDate < endOfMonth;
      }
      return true;
    });
  };
  
  // Filter tasks by period and exclude recurring templates (show only real tasks)
  // Also exclude tasks that are shown in "Moji zadaci" to avoid duplication
  const filteredAllTasks = filterTasksByPeriod(tasksResponse?.tasks || [], allTasksFilter)
    .filter(task => {
      // Hide recurring templates (parent tasks) - show only actual tasks to do
      const isTemplate = task.is_recurring && !task.parent_task_id;
      // Hide tasks that are already shown in "Moji zadaci" tab
      const isInMyTasks = task.status === 'with_sef' || task.status === 'with_external' || task.status === 'returned_to_sef';
      return !isTemplate && !isInMyTasks;
    });

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
    setTaskDetailsOpen(true);
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
          time: new Date(selectedTaskForDetails.created_at).toLocaleString('sr-RS', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          fromName: selectedTaskForDetails.created_by_name || 'Unknown',
          from: selectedTaskForDetails.created_by || 'operator',
          images: parseTaskImages(selectedTaskForDetails.images),
          worker_images: parseTaskImages(selectedTaskForDetails.worker_images),
          assigned_to_name: selectedTaskForDetails.assigned_to_name,
          is_recurring: selectedTaskForDetails.is_recurring,
          recurrence_pattern: selectedTaskForDetails.recurrence_pattern,
          worker_report: selectedTaskForDetails.worker_report,
          created_at: selectedTaskForDetails.created_at
        } : null}
        currentUserRole={user?.role}
        onAssignToWorker={handleAssignToWorker}
      />
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
              <span className="font-medium">Izveštaj</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="my-tasks" className="space-y-4">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="my-tasks" data-testid="tab-my-tasks">
                Moji zadaci
              </TabsTrigger>
              <TabsTrigger value="all-tasks" data-testid="tab-all-tasks">
                Zadaci
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
                  <ScrollArea 
                    className="pr-4"
                    style={{
                      maxHeight: tasksFromOperator.length === 0 
                        ? '200px' 
                        : `${Math.min(tasksFromOperator.length, 3) * 200}px`
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
                                  completeExternalTaskMutation.mutate(task.id);
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
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Tasks Tab with Period Filter */}
            <TabsContent value="all-tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col space-y-3">
                    <CardTitle>Svi zadaci</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={allTasksFilter === 'day' ? 'default' : 'outline'}
                        onClick={() => setAllTasksFilter('day')}
                        data-testid="filter-day"
                      >
                        Dan
                      </Button>
                      <Button
                        size="sm"
                        variant={allTasksFilter === 'week' ? 'default' : 'outline'}
                        onClick={() => setAllTasksFilter('week')}
                        data-testid="filter-week"
                      >
                        Nedelja
                      </Button>
                      <Button
                        size="sm"
                        variant={allTasksFilter === 'month' ? 'default' : 'outline'}
                        onClick={() => setAllTasksFilter('month')}
                        data-testid="filter-month"
                      >
                        Mesec
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                      {filteredAllTasks.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nema zadataka za izabrani period
                        </p>
                      ) : (
                        filteredAllTasks
                          .sort((a, b) => {
                            // Get execution date for each task
                            const getExecutionDate = (task: any) => {
                              // For recurring templates, use next_occurrence
                              if (task.is_recurring && !task.parent_task_id && task.next_occurrence) {
                                return new Date(task.next_occurrence);
                              }
                              // For recurring child tasks, use scheduled_for
                              if (task.parent_task_id && task.scheduled_for) {
                                return new Date(task.scheduled_for);
                              }
                              // For regular tasks, use created_at
                              return new Date(task.created_at);
                            };
                            
                            const dateA = getExecutionDate(a).getTime();
                            const dateB = getExecutionDate(b).getTime();
                            
                            // Sort ascending (earliest date first)
                            return dateA - dateB;
                          })
                          .map((task) => {
                            const getStatusBadge = (status: string) => {
                              if (status === 'completed') {
                                return <Badge variant="default" className="bg-green-600">Završeno</Badge>;
                              } else if (status === 'assigned_to_radnik' || status === 'with_operator') {
                                return <Badge variant="secondary">U toku</Badge>;
                              } else if (status === 'with_external') {
                                return <Badge variant="outline">Eksterna firma</Badge>;
                              } else if (status === 'with_sef' || status === 'returned_to_sef') {
                                return <Badge variant="destructive">Kod šefa</Badge>;
                              }
                              return <Badge variant="secondary">{status}</Badge>;
                            };

                            // Format task date - ALL tasks show day of week for consistency
                            const formatTaskDate = (task: any) => {
                              let date: Date;
                              
                              // Determine which date to use
                              if (task.is_recurring && !task.parent_task_id && task.next_occurrence) {
                                // For recurring template tasks, use next occurrence
                                date = new Date(task.next_occurrence);
                              } else if (task.parent_task_id && task.scheduled_for) {
                                // For recurring child tasks, use scheduled execution date
                                date = new Date(task.scheduled_for);
                              } else {
                                // For regular tasks, use creation date
                                date = new Date(task.created_at);
                              }
                              
                              // Format with day of week for ALL tasks (consistent format)
                              const dayName = date.toLocaleDateString('sr-RS', { weekday: 'long' });
                              const dateStr = date.toLocaleDateString('sr-RS', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric'
                              });
                              return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dateStr}`;
                            };

                            const getRecurrenceLabel = (pattern: string | null) => {
                              if (!pattern || pattern === 'once') return null;
                              const labels: Record<string, string> = {
                                '1_days': 'Dnevno',
                                '3_days': 'Svaka 3 dana',
                                '7_days': 'Nedeljno',
                                '14_days': 'Dvonedeljno',
                                '1_months': 'Mesečno',
                                '3_months': 'Tromesečno',
                                '6_months': 'Polugodišnje',
                                '12_months': 'Godišnje',
                                'daily': 'Dnevno',
                                'weekly': 'Nedeljno',
                                'monthly': 'Mesečno'
                              };
                              return labels[pattern] || pattern;
                            };

                            const isRecurring = task.is_recurring || !!task.parent_task_id;
                            const isTemplate = task.is_recurring && !task.parent_task_id;

                            return (
                              <Card 
                                key={task.id} 
                                className="p-4 cursor-pointer hover-elevate"
                                onClick={() => handleViewTaskDetails(task)}
                                data-testid={`all-task-${task.id}`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                                      {formatTaskDate(task)}
                                    </div>
                                    {getStatusBadge(task.status)}
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-base mb-2">{task.title}</h3>
                                    {task.description && (
                                      <p className="text-sm mb-2">{task.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      {isRecurring ? (
                                        <>
                                          <Badge variant="outline" className="text-xs">
                                            Periodičan zadatak {isTemplate ? '(šablon)' : ''}
                                          </Badge>
                                          {task.recurrence_pattern && getRecurrenceLabel(task.recurrence_pattern) && (
                                            <Badge variant="secondary" className="text-xs">
                                              {getRecurrenceLabel(task.recurrence_pattern)}
                                            </Badge>
                                          )}
                                        </>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs">
                                          Pojedinačan
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                      {task.created_by_name && (
                                        <p>Prijavio: {task.created_by_name}</p>
                                      )}
                                      {task.assigned_to_name && (
                                        <p>Dodeljeno: {task.assigned_to_name}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })
                      )}
                    </div>
                  </ScrollArea>
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
