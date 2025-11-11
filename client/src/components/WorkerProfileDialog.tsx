import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Phone, Briefcase, Calendar, User, Clock, MapPin, AlertCircle } from "lucide-react";
import { useQuery } from '@tanstack/react-query';

interface Worker {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  shift?: 'day' | 'night';
}

interface WorkerProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: Worker | null;
}

export default function WorkerProfileDialog({
  open,
  onOpenChange,
  worker
}: WorkerProfileDialogProps) {
  // Fetch all tasks from API
  const { data: tasksResponse } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    enabled: !!worker,
    refetchInterval: 10000,
  });

  if (!worker) return null;

  // Filter tasks assigned to this worker
  const workerTasks = (tasksResponse?.tasks || [])
    .filter(task => {
      if (!task.assigned_to || !worker?.id) return false;
      const assignedIds = task.assigned_to.split(',').map((id: string) => id.trim());
      return assignedIds.includes(worker.id);
    });

  const activeTasks = workerTasks.filter(t => t.status === 'assigned_to_radnik');
  const inProgressTasks = workerTasks.filter(t => t.status === 'with_operator');
  const completedTasks = workerTasks.filter(t => t.status === 'completed');

  // Get initials from full name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format role name
  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      'radnik': 'Majstor',
      'serviser': 'Serviser',
      'sef': 'Šef',
      'operater': 'Operater',
      'recepcioner': 'Recepcioner',
      'menadzer': 'Menadžer'
    };
    return roleMap[role] || role;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get elapsed time
  const getElapsedTime = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m`;
    }
    return `${diffMins}m`;
  };

  // Get priority badge variant
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'normal': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Hitno';
      case 'normal': return 'Normalno';
      case 'low': return 'Nisko';
      default: return priority;
    }
  };

  // Format shift
  const formatShift = (shift?: string) => {
    if (!shift) return 'Nije definisano';
    return shift === 'day' ? 'Dnevna (07:00 - 15:00)' : 'Noćna (15:00 - 23:00)';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]" data-testid="dialog-worker-profile">
        <DialogHeader>
          <DialogTitle>Profil Radnika</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info" data-testid="tab-info">Informacije</TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">
              Zadaci ({workerTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <Avatar className="h-16 w-16" data-testid="avatar-worker">
                <AvatarFallback className="text-lg">
                  {getInitials(worker.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold" data-testid="text-worker-name">
                  {worker.full_name}
                </h3>
                <div className="flex gap-2 mt-1">
                  <Badge 
                    variant={worker.is_active ? "default" : "secondary"}
                    data-testid="badge-worker-status"
                  >
                    {worker.is_active ? 'Aktivan' : 'Neaktivan'}
                  </Badge>
                  {worker.shift && (
                    <Badge variant="outline" data-testid="badge-worker-shift">
                      {worker.shift === 'day' ? '☀️ Dnevna' : '🌙 Noćna'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Kontakt Informacije</h4>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3" data-testid="info-email">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{worker.email}</p>
                  </div>
                </div>

                {worker.phone && (
                  <div className="flex items-center gap-3" data-testid="info-phone">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Telefon</p>
                      <p className="text-sm font-medium">{worker.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Work Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Informacije o Radu</h4>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3" data-testid="info-role">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pozicija</p>
                    <p className="text-sm font-medium">{formatRole(worker.role)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3" data-testid="info-department">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Odeljenje</p>
                    <p className="text-sm font-medium capitalize">{worker.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3" data-testid="info-shift">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Smena</p>
                    <p className="text-sm font-medium">{formatShift(worker.shift)}</p>
                  </div>
                </div>

                {worker.created_at && (
                  <div className="flex items-center gap-3" data-testid="info-joined">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Datum Zaposlenja</p>
                      <p className="text-sm font-medium">{formatDate(worker.created_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Task Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Novi</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="stat-active">{activeTasks.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">U Toku</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="stat-inprogress">{inProgressTasks.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Završeno</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="stat-completed">{completedTasks.length}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Tabs defaultValue="new" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="new" data-testid="subtab-new">
                  Novi ({activeTasks.length})
                </TabsTrigger>
                <TabsTrigger value="inprogress" data-testid="subtab-inprogress">
                  U Toku ({inProgressTasks.length})
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="subtab-completed">
                  Završeno ({completedTasks.length})
                </TabsTrigger>
              </TabsList>

              {/* Novi Zadaci */}
              <TabsContent value="new" className="mt-4">
                <ScrollArea className="h-[350px] pr-4">
                  {activeTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nema novih zadataka</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeTasks.map((task) => (
                        <Card key={task.id} data-testid={`task-card-${task.id}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <CardTitle className="text-base">{task.title}</CardTitle>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  <span>{task.location}</span>
                                </div>
                              </div>
                              <Badge variant={getPriorityVariant(task.priority)}>
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{getElapsedTime(task.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{task.created_by_name || 'N/A'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* U Toku Zadaci */}
              <TabsContent value="inprogress" className="mt-4">
                <ScrollArea className="h-[350px] pr-4">
                  {inProgressTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nema zadataka u toku</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {inProgressTasks.map((task) => (
                        <Card key={task.id} data-testid={`task-card-${task.id}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <CardTitle className="text-base">{task.title}</CardTitle>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  <span>{task.location}</span>
                                </div>
                              </div>
                              <Badge variant={getPriorityVariant(task.priority)}>
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{getElapsedTime(task.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{task.created_by_name || 'N/A'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Završeni Zadaci */}
              <TabsContent value="completed" className="mt-4">
                <ScrollArea className="h-[350px] pr-4">
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nema završenih zadataka</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedTasks.map((task) => (
                        <Card key={task.id} data-testid={`task-card-${task.id}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <CardTitle className="text-base">{task.title}</CardTitle>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  <span>{task.location}</span>
                                </div>
                              </div>
                              <Badge variant={getPriorityVariant(task.priority)}>
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{getElapsedTime(task.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{task.created_by_name || 'N/A'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
