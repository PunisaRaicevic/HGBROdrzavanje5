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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Mail, Phone, Briefcase, Calendar, User, Clock, AlertCircle } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

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
  // Period filters for each tab
  const [newTasksPeriod, setNewTasksPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [inProgressPeriod, setInProgressPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [completedPeriod, setCompletedPeriod] = useState<'day' | 'week' | 'month'>('day');

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

  // Helper to filter tasks by period (FORWARD-LOOKING from today, matching SupervisorDashboard logic)
  const filterByPeriod = (tasks: any[], filter: 'day' | 'week' | 'month') => {
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

  // Total counts for badges (NOT filtered by period, but exclude recurring templates)
  const allActiveTasks = workerTasks.filter(t => {
    const isTemplate = t.is_recurring && !t.parent_task_id;
    return t.status === 'assigned_to_radnik' && !isTemplate;
  });
  const allInProgressTasks = workerTasks.filter(t => {
    const isTemplate = t.is_recurring && !t.parent_task_id;
    return t.status === 'with_operator' && !isTemplate;
  });
  const allCompletedTasks = workerTasks.filter(t => {
    const isTemplate = t.is_recurring && !t.parent_task_id;
    return t.status === 'completed' && !isTemplate;
  });

  // Filtered lists for display (filtered by period)
  const activeTasks = filterByPeriod(allActiveTasks, newTasksPeriod);
  const inProgressTasks = filterByPeriod(allInProgressTasks, inProgressPeriod);
  const completedTasks = filterByPeriod(allCompletedTasks, completedPeriod);

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

  // Format task date (matching SupervisorDashboard) - ALL tasks show day of week
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

  // Get status badge (matching SupervisorDashboard)
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

  const getRecurrenceLabel = (pattern: string | null) => {
    if (!pattern || pattern === 'once') return null;
    
    const legacyLabels: Record<string, string> = {
      'daily': 'Svakog dana',
      'weekly': 'Nedjeljno',
      'monthly': 'Mjesečno'
    };
    if (legacyLabels[pattern]) return legacyLabels[pattern];
    
    const match = pattern.match(/^(\d+)_(days|weeks|months|years)$/);
    if (match) {
      const count = parseInt(match[1]);
      const unit = match[2];
      
      if (unit === 'days') {
        return count === 1 ? 'Svakog dana' : `Svaka ${count} dana`;
      } else if (unit === 'weeks') {
        return count === 1 ? 'Jednom nedjeljno' : `${count} puta nedjeljno`;
      } else if (unit === 'months') {
        return count === 1 ? 'Jednom mjesečno' : `${count} puta mjesečno`;
      } else if (unit === 'years') {
        return count === 1 ? 'Jednom godišnje' : `${count} puta godišnje`;
      }
    }
    
    return pattern;
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
              Zadaci
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
                {worker.phone && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {worker.phone}
                  </p>
                )}
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

            {/* Task Statistics - Always show total counts */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Novi</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="stat-active">{allActiveTasks.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">U Toku</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="stat-inprogress">{allInProgressTasks.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Završeno</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="stat-completed">{allCompletedTasks.length}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Tabs defaultValue="new" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="new" data-testid="subtab-new">
                  Novi
                </TabsTrigger>
                <TabsTrigger value="inprogress" data-testid="subtab-inprogress">
                  U Toku
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="subtab-completed">
                  Završeno
                </TabsTrigger>
              </TabsList>

              {/* Novi Zadaci */}
              <TabsContent value="new" className="mt-4">
                <div className="mb-4">
                  <ToggleGroup 
                    type="single" 
                    value={newTasksPeriod} 
                    onValueChange={(value) => value && setNewTasksPeriod(value as 'day' | 'week' | 'month')}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="day" aria-label="Dan" data-testid="filter-day-new">
                      Dan
                    </ToggleGroupItem>
                    <ToggleGroupItem value="week" aria-label="Nedelja" data-testid="filter-week-new">
                      Nedelja
                    </ToggleGroupItem>
                    <ToggleGroupItem value="month" aria-label="Mesec" data-testid="filter-month-new">
                      Mesec
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <ScrollArea className="h-[300px] pr-4">
                  {activeTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nema novih zadataka</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeTasks
                        .sort((a, b) => {
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
                        .map((task) => {
                          const isRecurring = task.is_recurring || !!task.parent_task_id;
                          const isTemplate = task.is_recurring && !task.parent_task_id;
                          
                          return (
                            <Card key={task.id} className="p-4" data-testid={`task-card-${task.id}`}>
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                                    {formatTaskDate(task)}
                                  </div>
                                  {getStatusBadge(task.status)}
                                </div>
                                <div>
                                  <h3 className="font-medium text-base mb-2">{task.title}</h3>
                                  {task.description && task.description !== task.title && (
                                    <p className="text-sm mb-2">{task.description}</p>
                                  )}
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    {isRecurring ? (
                                      <>
                                        <Badge 
                                          variant="outline" 
                                          className={`text-xs ${task.recurrence_pattern === 'cancelled' 
                                            ? 'bg-red-50 border-red-200 text-red-700' 
                                            : ''}`}
                                        >
                                          Periodicni zadatak {isTemplate ? '(šablon)' : ''}{task.recurrence_pattern === 'cancelled' && ' (Ukinut)'}
                                        </Badge>
                                        {task.recurrence_pattern && task.recurrence_pattern !== 'cancelled' && getRecurrenceLabel(task.recurrence_pattern) && (
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
                        })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* U Toku Zadaci */}
              <TabsContent value="inprogress" className="mt-4">
                <div className="mb-4">
                  <ToggleGroup 
                    type="single" 
                    value={inProgressPeriod} 
                    onValueChange={(value) => value && setInProgressPeriod(value as 'day' | 'week' | 'month')}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="day" aria-label="Dan" data-testid="filter-day-inprogress">
                      Dan
                    </ToggleGroupItem>
                    <ToggleGroupItem value="week" aria-label="Nedelja" data-testid="filter-week-inprogress">
                      Nedelja
                    </ToggleGroupItem>
                    <ToggleGroupItem value="month" aria-label="Mesec" data-testid="filter-month-inprogress">
                      Mesec
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <ScrollArea className="h-[300px] pr-4">
                  {inProgressTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nema zadataka u toku</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {inProgressTasks
                        .sort((a, b) => {
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
                        .map((task) => {
                          const isRecurring = task.is_recurring || !!task.parent_task_id;
                          const isTemplate = task.is_recurring && !task.parent_task_id;
                          
                          return (
                            <Card key={task.id} className="p-4" data-testid={`task-card-${task.id}`}>
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                                    {formatTaskDate(task)}
                                  </div>
                                  {getStatusBadge(task.status)}
                                </div>
                                <div>
                                  <h3 className="font-medium text-base mb-2">{task.title}</h3>
                                  {task.description && task.description !== task.title && (
                                    <p className="text-sm mb-2">{task.description}</p>
                                  )}
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    {isRecurring ? (
                                      <>
                                        <Badge 
                                          variant="outline" 
                                          className={`text-xs ${task.recurrence_pattern === 'cancelled' 
                                            ? 'bg-red-50 border-red-200 text-red-700' 
                                            : ''}`}
                                        >
                                          Periodicni zadatak {isTemplate ? '(šablon)' : ''}{task.recurrence_pattern === 'cancelled' && ' (Ukinut)'}
                                        </Badge>
                                        {task.recurrence_pattern && task.recurrence_pattern !== 'cancelled' && getRecurrenceLabel(task.recurrence_pattern) && (
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
                        })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Završeni Zadaci */}
              <TabsContent value="completed" className="mt-4">
                <div className="mb-4">
                  <ToggleGroup 
                    type="single" 
                    value={completedPeriod} 
                    onValueChange={(value) => value && setCompletedPeriod(value as 'day' | 'week' | 'month')}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="day" aria-label="Dan" data-testid="filter-day-completed">
                      Dan
                    </ToggleGroupItem>
                    <ToggleGroupItem value="week" aria-label="Nedelja" data-testid="filter-week-completed">
                      Nedelja
                    </ToggleGroupItem>
                    <ToggleGroupItem value="month" aria-label="Mesec" data-testid="filter-month-completed">
                      Mesec
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <ScrollArea className="h-[300px] pr-4">
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nema završenih zadataka</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedTasks
                        .sort((a, b) => {
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
                        .map((task) => {
                          const isRecurring = task.is_recurring || !!task.parent_task_id;
                          const isTemplate = task.is_recurring && !task.parent_task_id;
                          
                          return (
                            <Card key={task.id} className="p-4" data-testid={`task-card-${task.id}`}>
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                                    {formatTaskDate(task)}
                                  </div>
                                  {getStatusBadge(task.status)}
                                </div>
                                <div>
                                  <h3 className="font-medium text-base mb-2">{task.title}</h3>
                                  {task.description && task.description !== task.title && (
                                    <p className="text-sm mb-2">{task.description}</p>
                                  )}
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    {isRecurring ? (
                                      <>
                                        <Badge 
                                          variant="outline" 
                                          className={`text-xs ${task.recurrence_pattern === 'cancelled' 
                                            ? 'bg-red-50 border-red-200 text-red-700' 
                                            : ''}`}
                                        >
                                          Periodicni zadatak {isTemplate ? '(šablon)' : ''}{task.recurrence_pattern === 'cancelled' && ' (Ukinut)'}
                                        </Badge>
                                        {task.recurrence_pattern && task.recurrence_pattern !== 'cancelled' && getRecurrenceLabel(task.recurrence_pattern) && (
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
                        })}
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
