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
import { Send, CheckCircle, XCircle, Clock, TrendingUp, FileText } from 'lucide-react';
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

  // Get tasks sent to supervisor (with_sef status OR with_external)
  const tasksFromOperator = (tasksResponse?.tasks || []).filter(task => 
    task.status === 'with_sef' || task.status === 'with_external'
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
          priority: selectedTaskForDetails.priority,
          time: new Date(selectedTaskForDetails.created_at).toLocaleString('sr-RS', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          fromName: selectedTaskForDetails.created_by_name || 'Unknown',
          from: selectedTaskForDetails.created_by || 'operator',
          images: parseTaskImages(selectedTaskForDetails.images)
        } : null}
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
        <CardHeader>
          <CardTitle>{t('quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CreateRecurringTaskDialog 
              trigger={
                <Button 
                  variant="outline" 
                  className="h-auto py-4 justify-start w-full"
                  data-testid="button-create-recurring"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-md">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{t('assignTask')}</p>
                      <p className="text-xs text-muted-foreground">Kreiraj i dodeli zadatak majstorima</p>
                    </div>
                  </div>
                </Button>
              }
            />
            <Button 
              variant="outline" 
              className="h-auto py-4 justify-start"
              onClick={() => setTeamPerformanceOpen(true)}
              data-testid="button-view-performance"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">View Team Performance</p>
                  <p className="text-xs text-muted-foreground">Statistika o reklamacijama za danas</p>
                </div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 justify-start"
              onClick={() => setDailyReportOpen(true)}
              data-testid="button-generate-report"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Generate Daily Report</p>
                  <p className="text-xs text-muted-foreground">Tabelarni spisak svih reklamacija</p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Tasks from Operator */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('newTasksFromOperator')}</span>
                <Badge variant="secondary">{tasksFromOperator.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px] pr-4">
                <div className="space-y-4">
                  {tasksFromOperator.map((task) => (
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
                          {task.status === 'with_sef' ? (
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
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
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
                    className="p-3 border rounded-md hover-elevate cursor-pointer transition-colors"
                    onClick={() => handleViewWorkerProfile(worker)}
                    data-testid={`worker-card-${worker.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{worker.full_name}</span>
                      <div className="flex gap-1">
                        <Badge variant="default">
                          Aktivan
                        </Badge>
                        {worker.shift && (
                          <Badge variant={worker.shift === currentShift ? "default" : "secondary"}>
                            {worker.shift === 'day' ? '☀️' : '🌙'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {worker.phone && (
                      <p className="text-sm text-muted-foreground mb-1">
                        📱 {worker.phone}
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
