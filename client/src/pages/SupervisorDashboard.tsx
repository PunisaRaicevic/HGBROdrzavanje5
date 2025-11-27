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
import { Send, CheckCircle, XCircle, Clock, TrendingUp, FileText, Trash2, Calendar, History, RefreshCw } from 'lucide-react';
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
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  
  // Filter state for "Zadaci" tab - same as AdminDashboard
  const [taskViewTab, setTaskViewTab] = useState('upcoming');
  const [tasksPeriodFilter, setTasksPeriodFilter] = useState('7d');
  const [tasksStatusFilter, setTasksStatusFilter] = useState('all');
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState('7d');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [tasksPerPage, setTasksPerPage] = useState(20);
  const [historyPerPage, setHistoryPerPage] = useState(20);

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
          time: selectedTaskForDetails.created_at || new Date().toISOString(),
          fromName: selectedTaskForDetails.created_by_name || 'Unknown',
          from: selectedTaskForDetails.created_by || 'operator',
          images: parseTaskImages(selectedTaskForDetails.images),
          worker_images: parseTaskImages(selectedTaskForDetails.worker_images),
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
                          { value: '1d', label: 'Danas' },
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
                              .slice(0, tasksPerPage)
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
                                          <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                                            Periodičan
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
                                          <p>Dodeljeno: {task.assigned_to_name}</p>
                                        )}
                                      </div>
                                    </div>
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
                              
                              const tasksBeforeToday = activeTasks.filter(task => {
                                const createdDate = new Date(task.created_at);
                                return createdDate < todayStart;
                              });
                              
                              let periodFiltered = tasksBeforeToday;
                              
                              if (historyPeriodFilter === '1d') {
                                const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
                                periodFiltered = tasksBeforeToday.filter(task => {
                                  const taskDate = task.completed_at 
                                    ? new Date(task.completed_at)
                                    : task.scheduled_for 
                                      ? new Date(task.scheduled_for) 
                                      : new Date(task.created_at);
                                  return taskDate >= yesterdayStart && taskDate < todayStart;
                                });
                              } else {
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
                                }
                                
                                if (startDate) {
                                  periodFiltered = tasksBeforeToday.filter(task => {
                                    const taskDate = task.completed_at 
                                      ? new Date(task.completed_at)
                                      : task.scheduled_for 
                                        ? new Date(task.scheduled_for) 
                                        : new Date(task.created_at);
                                    return taskDate >= startDate! && taskDate < todayStart;
                                  });
                                }
                              }
                              
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
                              .slice(0, historyPerPage)
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
                                          <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                                            Periodičan
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
                                          <p>Dodeljeno: {task.assigned_to_name}</p>
                                        )}
                                      </div>
                                    </div>
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
