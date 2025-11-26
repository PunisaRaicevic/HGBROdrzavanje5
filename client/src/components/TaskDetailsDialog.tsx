import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, User, AlertCircle, Image as ImageIcon, GitBranch, Trash2, Calendar, FileText, Repeat, CheckCircle, Send, History, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ImagePreviewModal } from './ImagePreviewModal';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

// Helper function to get unique user names from task history
const getTaskAssignmentPath = (history: any[]): string => {
  if (!history || history.length === 0) return '';
  
  // Extract unique user names in chronological order (skip task creator)
  const seenEntries = new Set<string>();
  const names: string[] = [];
  
  // Sort by timestamp (oldest first) to show chronological path
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  for (const entry of sortedHistory) {
    // Skip the task creator (action: 'task_created')
    if (entry.action === 'task_created') continue;
    
    // For task assignments (assigned_to_radnik or with_external), use assigned_to_name
    if ((entry.status_to === 'assigned_to_radnik' || entry.status_to === 'with_external') && entry.assigned_to_name) {
      const key = `assigned:${entry.assigned_to_name}`;
      if (!seenEntries.has(key)) {
        seenEntries.add(key);
        names.push(entry.assigned_to_name);
      }
    } 
    // For other actions, use user_name
    else if (entry.user_name) {
      const key = `user:${entry.user_name}`;
      if (!seenEntries.has(key)) {
        seenEntries.add(key);
        names.push(entry.user_name);
      }
    }
  }
  
  return names.join(' → ');
};

interface TaskDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    description?: string;
    location: string;
    room_number?: string;
    priority: 'urgent' | 'normal' | 'can_wait';
    status: string;
    time: string;
    fromName: string;
    from: string;
    images?: string[];
    worker_images?: string[];
    assigned_to_name?: string;
    is_recurring?: boolean;
    recurrence_pattern?: string | null;
    worker_report?: string;
    created_at?: string;
    parent_task_id?: string | null;
    scheduled_for?: string | null;
  } | null;
  currentUserRole?: string;
  onAssignToWorker?: (taskId: string, taskTitle: string) => void;
}

export default function TaskDetailsDialog({ open, onOpenChange, task, currentUserRole, onAssignToWorker }: TaskDetailsDialogProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRecurringHistory, setShowRecurringHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const { toast } = useToast();

  // Mutation to send task to external company
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
      onOpenChange(false);
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

  // Fetch task history only when dialog is open and task exists
  const { data: historyResponse, isLoading: historyLoading, isError: historyError } = useQuery<{ 
    history: any[], 
    return_reasons?: Array<{user_name: string, reason: string, timestamp: string}>
  }>({
    queryKey: [`/api/tasks/${task?.id}/history`],
    enabled: open && !!task?.id, // Only fetch when dialog is open
  });

  // Fetch all tasks to find next occurrences for recurring tasks
  const { data: allTasksResponse } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    enabled: open && (!!task?.parent_task_id || !!task?.is_recurring), // Fetch for recurring tasks (parent or child)
  });

  // Calculate next 3 upcoming dates for recurring tasks
  const nextOccurrences = useMemo(() => {
    if (!task?.parent_task_id || !task?.scheduled_for || !allTasksResponse?.tasks) return [];
    
    const currentScheduledDate = new Date(task.scheduled_for);
    
    // Find all sibling tasks (same parent_task_id) with future scheduled_for dates
    const futureTasks = allTasksResponse.tasks
      .filter(t => 
        t.parent_task_id === task.parent_task_id && 
        t.id !== task.id && 
        t.scheduled_for &&
        new Date(t.scheduled_for) > currentScheduledDate
      )
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
      .slice(0, 3); // Take first 3

    return futureTasks.map(t => t.scheduled_for);
  }, [task, allTasksResponse]);

  // Calculate past occurrences (history) for recurring tasks - only completed ones
  const pastOccurrences = useMemo(() => {
    if (!allTasksResponse?.tasks) return [];
    
    // Determine the parent_task_id to search for siblings
    const parentId = task?.parent_task_id || (task?.is_recurring ? task?.id : null);
    if (!parentId) return [];

    const currentDate = task?.scheduled_for ? new Date(task.scheduled_for) : new Date();
    
    // Find all sibling tasks (same parent_task_id) that are COMPLETED
    const pastTasks = allTasksResponse.tasks
      .filter(t => {
        // Must be completed
        if (t.status !== 'completed') return false;
        
        // For child tasks, find siblings with same parent
        if (task?.parent_task_id) {
          return t.parent_task_id === task.parent_task_id && 
                 t.id !== task.id && 
                 t.scheduled_for &&
                 new Date(t.scheduled_for) < currentDate;
        }
        // For parent task, find all children
        if (task?.is_recurring) {
          return t.parent_task_id === task.id && t.scheduled_for;
        }
        return false;
      })
      .sort((a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime()); // Newest first

    return pastTasks;
  }, [task, allTasksResponse]);
  
  // Memoize assignment path calculation to avoid recomputation on re-renders
  const assignmentPath = useMemo(() => {
    if (!task || !historyResponse?.history) return '';
    return getTaskAssignmentPath(historyResponse.history);
  }, [task, historyResponse?.history]);

  // Extract all worker reports from task history
  const workerReports = useMemo(() => {
    if (!historyResponse?.history) return [];
    
    // Filter history entries that have notes (worker reports)
    const reports = historyResponse.history
      .filter(entry => entry.notes && entry.notes.trim().length > 0 && entry.action !== 'task_created' && entry.action !== 'task_deleted')
      .map(entry => ({
        user_name: entry.user_name,
        notes: entry.notes,
        timestamp: entry.timestamp,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Newest first
    
    return reports;
  }, [historyResponse?.history]);

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest('DELETE', `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      toast({
        title: "Zadatak obrisan",
        description: "Zadatak je uspešno obrisan.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Nije moguće obrisati zadatak.",
      });
    },
  });

  const handleDelete = () => {
    if (task?.id) {
      deleteMutation.mutate(task.id);
    }
    setShowDeleteDialog(false);
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

  // Admin and sef can delete any task
  const canDelete = currentUserRole === 'sef' || currentUserRole === 'admin';
  
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-task-details">
        <DialogHeader>
          <DialogTitle className="text-xl" data-testid="text-task-details-title">
            {task.title}
          </DialogTitle>
          <DialogDescription>
            Detalji reklamacije
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4">
            {/* Status and Priority Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(task.status)}
              <Badge 
                variant={
                  task.priority === 'urgent' ? 'destructive' : 
                  task.priority === 'normal' ? 'default' : 
                  'secondary'
                }
                data-testid="badge-task-details-priority"
              >
                {task.priority === 'urgent' ? 'Hitno' : 
                 task.priority === 'normal' ? 'Normalno' : 
                 'Može Sačekati'}
              </Badge>
              {task.is_recurring && (
                <Badge variant="outline" className="text-xs">
                  <Repeat className="w-3 h-3 mr-1" />
                  Periodičan zadatak
                </Badge>
              )}
              {task.recurrence_pattern && getRecurrenceLabel(task.recurrence_pattern) && (
                <Badge variant="secondary" className="text-xs">
                  {getRecurrenceLabel(task.recurrence_pattern)}
                </Badge>
              )}
            </div>

            {/* Location */}
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Lokacija</p>
                <p className="text-sm text-muted-foreground" data-testid="text-task-details-location">
                  {task.location}
                </p>
              </div>
            </div>

            {/* Room Number */}
            {task.room_number && (
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Soba</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-task-details-room">
                    {task.room_number}
                  </p>
                </div>
              </div>
            )}

            {/* Reported By */}
            <div className="flex items-start gap-2">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Prijavio</p>
                <p className="text-sm text-muted-foreground" data-testid="text-task-details-reporter">
                  {task.fromName}
                </p>
              </div>
            </div>

            {/* Assigned To */}
            {task.assigned_to_name && (
              <div className="flex items-start gap-2">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Dodeljeno</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-task-details-assigned">
                    {task.assigned_to_name}
                  </p>
                </div>
              </div>
            )}

            {/* Return Reasons */}
            {historyResponse?.return_reasons && historyResponse.return_reasons.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Razlozi vraćanja</p>
                  <div className="space-y-2 mt-2">
                    {historyResponse.return_reasons.map((returnReason, index) => (
                      <div key={index} className="border-l-2 border-muted pl-3 py-1" data-testid={`return-reason-${index}`}>
                        <p className="text-xs font-medium text-muted-foreground">{returnReason.user_name}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{returnReason.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Time */}
            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Vrijeme prijave</p>
                <p className="text-sm text-muted-foreground" data-testid="text-task-details-time">
                  {task.time}
                </p>
                
                {/* Next 3 upcoming dates for recurring tasks */}
                {task.parent_task_id && nextOccurrences.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Sledeća 3 nadolazeća datuma:</p>
                    <div className="flex flex-col gap-0.5">
                      {nextOccurrences.map((date, index) => (
                        <p key={index} className="text-xs text-muted-foreground" data-testid={`text-next-occurrence-${index}`}>
                          {new Date(date).toLocaleDateString('sr-RS', {
                            weekday: 'long',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Opis problema</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-task-details-description">
                    {task.description}
                  </p>
                </div>
              </div>
            )}

            {/* Images */}
            {task.images && task.images.length > 0 && (
              <div className="flex items-start gap-2">
                <ImageIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">Slike prijave</p>
                  <div className="grid grid-cols-2 gap-2">
                    {task.images.map((image, index) => (
                      <img 
                        key={index}
                        src={image}
                        alt={`Task image ${index + 1}`}
                        className="rounded-md border w-full h-auto object-cover cursor-pointer hover-elevate"
                        onClick={() => setPreviewImage(image)}
                        data-testid={`img-task-details-${index}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Worker Images */}
            {task.worker_images && task.worker_images.length > 0 && (
              <div className="flex items-start gap-2">
                <ImageIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">Slike majstora</p>
                  <div className="grid grid-cols-2 gap-2">
                    {task.worker_images.map((image, index) => (
                      <img 
                        key={index}
                        src={image}
                        alt={`Worker image ${index + 1}`}
                        className="rounded-md border w-full h-auto object-cover cursor-pointer hover-elevate"
                        onClick={() => setPreviewImage(image)}
                        data-testid={`img-worker-details-${index}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Worker Reports History */}
            {workerReports.length > 0 && (
              <div className="flex items-start gap-2">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">
                    Istorija izveštaja {workerReports.length > 1 && `(${workerReports.length})`}
                  </p>
                  <div className="space-y-3">
                    {workerReports.map((report, index) => (
                      <div 
                        key={index} 
                        className="border-l-2 border-primary pl-3 py-2"
                        data-testid={`worker-report-${index}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-medium text-primary">{report.user_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.timestamp).toLocaleString('sr-RS', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {report.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recurring Task History - Past Occurrences */}
            {(task.parent_task_id || task.is_recurring) && pastOccurrences.length > 0 && (
              <div className="flex items-start gap-2">
                <History className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    onClick={() => setShowRecurringHistory(!showRecurringHistory)}
                    data-testid="button-toggle-recurring-history"
                  >
                    <span className="text-sm font-medium">
                      Istorija prethodnih izvršenja ({pastOccurrences.length})
                    </span>
                    {showRecurringHistory ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  
                  {showRecurringHistory && (
                    <div className="space-y-2 mt-2">
                      {pastOccurrences.map((occurrence, index) => {
                        const isExpanded = expandedHistoryId === occurrence.id;
                        
                        return (
                          <div 
                            key={occurrence.id} 
                            className="border rounded-md overflow-hidden"
                            data-testid={`recurring-history-${index}`}
                          >
                            <button
                              className="w-full p-3 bg-green-50 hover:bg-green-100 transition-colors text-left flex items-center justify-between gap-2"
                              onClick={() => setExpandedHistoryId(isExpanded ? null : occurrence.id)}
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-green-600 text-xs">Završeno</Badge>
                                <span className="text-sm font-medium">
                                  {new Date(occurrence.scheduled_for).toLocaleDateString('sr-RS', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                            
                            {isExpanded && (
                              <div className="p-3 bg-muted/30 border-t space-y-2">
                                {occurrence.assigned_to_name && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">Izvršio: <strong>{occurrence.assigned_to_name}</strong></span>
                                  </div>
                                )}
                                {occurrence.completed_at && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      Završeno: {new Date(occurrence.completed_at).toLocaleString('sr-RS', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                )}
                                {occurrence.worker_report && (
                                  <div className="mt-2 p-2 bg-background rounded border">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Izvještaj:</p>
                                    <p className="text-sm whitespace-pre-wrap">{occurrence.worker_report}</p>
                                  </div>
                                )}
                                {occurrence.worker_images && occurrence.worker_images.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Slike:</p>
                                    <div className="grid grid-cols-3 gap-2">
                                      {occurrence.worker_images.map((img: string, imgIdx: number) => (
                                        <img 
                                          key={imgIdx}
                                          src={img}
                                          alt={`History ${index} image ${imgIdx + 1}`}
                                          className="w-full h-20 rounded object-cover cursor-pointer border hover:opacity-80"
                                          onClick={() => setPreviewImage(img)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {!occurrence.worker_report && (!occurrence.worker_images || occurrence.worker_images.length === 0) && (
                                  <p className="text-sm text-muted-foreground italic">Nema dodatnih informacija za ovaj izvještaj.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        {(canDelete || (task.status === 'with_sef' || task.status === 'returned_to_sef')) && (
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {/* Left side: Assignment actions */}
            {(task.status === 'with_sef' || task.status === 'returned_to_sef') && (
              <div className="flex gap-2 flex-1">
                {onAssignToWorker && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      onAssignToWorker(task.id, task.title);
                      onOpenChange(false);
                    }}
                    data-testid="button-assign-worker"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Dodijeli radniku
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => sendToExternalMutation.mutate(task.id)}
                  disabled={sendToExternalMutation.isPending}
                  data-testid="button-notify-external"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Obavijesti eksternu firmu
                </Button>
              </div>
            )}
            
            {/* Right side: Delete action */}
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                data-testid="button-delete-task"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Obriši
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>

      <ImagePreviewModal 
        imageUrl={previewImage} 
        onClose={() => setPreviewImage(null)} 
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Brisanje zadatka</AlertDialogTitle>
            <AlertDialogDescription>
              Da li ste sigurni da želite da obrišete ovaj zadatak? Ova akcija se ne može poništiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
