import { useState, useMemo, useRef, useEffect } from 'react';
import { fileToCompressedDataUrl } from '@/lib/imageCompressor';
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
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Clock, User, AlertCircle, Image as ImageIcon, GitBranch, Trash2, Calendar, FileText, Repeat, CheckCircle, Send, History, ChevronDown, ChevronUp, Pencil, Download, MessageCircle, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ImagePreviewModal } from './ImagePreviewModal';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { getApiUrl } from '@/lib/apiUrl';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
    external_company_name?: string | null;
    operator_name?: string | null;
    sef_name?: string | null;
    completed_by_name?: string | null;
    completed_at?: string | null;
    receipt_confirmed_by_name?: string | null;
    is_recurring?: boolean;
    recurrence_pattern?: string | null;
    worker_report?: string;
    created_at?: string;
    parent_task_id?: string | null;
    scheduled_for?: string | null;
  } | null;
  currentUserRole?: string;
  onAssignToWorker?: (taskId: string, taskTitle: string) => void;
  onAssignToExternal?: (taskId: string, taskTitle: string) => void;
  onEdit?: (taskId: string) => void;
}

export default function TaskDetailsDialog({ open, onOpenChange, task, currentUserRole, onAssignToWorker, onAssignToExternal, onEdit }: TaskDetailsDialogProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRecurringHistory, setShowRecurringHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'this' | 'all'>('this');
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!open) {
      setShowRejectDialog(false);
      setShowDeleteDialog(false);
      setRejectReason('');
    }
  }, [open]);

  const canGenerateReport = currentUserRole === 'sef' || currentUserRole === 'admin';
  const canChat = currentUserRole === 'sef' || currentUserRole === 'admin';

  const handleDownloadReport = async () => {
    if (!task) return;
    setIsDownloadingReport(true);
    try {
      toast({ title: 'Priprema...', description: 'Generisanje izvještaja u toku.' });
      const apiUrl = getApiUrl(`/api/tasks/${task.id}/report`);
      const response = await fetch(apiUrl, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to generate report');
      
      const pdfBlob = await response.blob();
      const fileName = `izvjestaj_${task.id}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const result = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Documents,
              recursive: true
            });
            await Share.share({
              title: 'Izvještaj o zadatku',
              url: result.uri,
              dialogTitle: 'Sacuvaj ili podijeli PDF'
            });
            toast({ title: 'Uspješno', description: 'Izvještaj je generisan.' });
          } catch (err) {
            console.error('Filesystem/Share error:', err);
            toast({ title: 'Greška', description: 'Nije moguće sacuvati PDF.', variant: 'destructive' });
          }
        };
        reader.readAsDataURL(pdfBlob);
      } else {
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        const disposition = response.headers.get('Content-Disposition');
        const filenameMatch = disposition?.match(/filename="(.+)"/);
        a.download = filenameMatch ? filenameMatch[1] : fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Uspješno', description: 'Izvještaj je preuzet.' });
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({ title: 'Greska', description: 'Nije moguce generisati izvjestaj.', variant: 'destructive' });
    } finally {
      setIsDownloadingReport(false);
    }
  };

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

  const rejectMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      return apiRequest('PATCH', `/api/tasks/${taskId}`, {
        status: 'rejected',
        worker_report: `Zadatak odbijen i vraćen pošiljaocu. Razlog: ${reason}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: 'Zadatak odbijen', description: 'Zadatak je vraćen pošiljaocu sa objašnjenjem.' });
      setShowRejectDialog(false);
      setRejectReason('');
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Greška', description: 'Nije moguće odbiti zadatak.', variant: 'destructive' });
    },
  });

  // Fetch task history only when dialog is open and task exists
  const { data: historyResponse, isLoading: historyLoading, isError: historyError } = useQuery<{ 
    history: any[], 
    return_reasons?: Array<{user_name: string, reason: string, timestamp: string}>
  }>({
    queryKey: [`/api/tasks/${task?.id}/history`],
    enabled: open && !!task?.id, // Only fetch when dialog is open
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery<{ messages: any[] }>({
    queryKey: ['/api/tasks', task?.id || '', 'messages'],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${task?.id}/messages`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: open && !!task?.id && canChat,
    refetchInterval: open && canChat ? 5000 : false,
  });

  const chatMessages = messagesData?.messages || [];

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (variables: { taskId: string; message: string; document_name?: string }) => {
      const response = await apiRequest('POST', `/api/tasks/${variables.taskId}/messages`, {
        message: variables.message,
        document_name: variables.document_name,
      });
      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', variables.taskId, 'messages'] });
      setChatMessage('');
    },
    onError: () => {
      toast({ title: 'Greska', description: 'Poruka nije poslata.', variant: 'destructive' });
    },
  });

  const handleSendMessage = async () => {
    if (!task || !chatMessage.trim()) return;
    await sendMessageMutation.mutateAsync({
      taskId: task.id,
      message: chatMessage.trim(),
    });
  };

  const handleDocUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !task) return;
      let dataUrl: string;
      if (file.type.startsWith('image/')) {
        dataUrl = await fileToCompressedDataUrl(file);
      } else {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      await sendMessageMutation.mutateAsync({
        taskId: task.id,
        message: dataUrl,
        document_name: file.name,
      });
    };
    input.click();
  };

  // Fetch all tasks to find next occurrences for recurring tasks
  const { data: allTasksResponse } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    enabled: open && (!!task?.parent_task_id || !!task?.is_recurring), // Fetch for recurring tasks (parent or child)
  });

  // Calculate next 3 upcoming dates for recurring tasks (works for both parent and child tasks)
  const nextOccurrences = useMemo(() => {
    if (!allTasksResponse?.tasks) return [];
    
    const now = new Date();
    const currentScheduledDate = task?.scheduled_for ? new Date(task.scheduled_for) : now;
    
    // Determine what to search for
    if (task?.parent_task_id) {
      // Child task: find sibling tasks with future scheduled_for dates
      const futureTasks = allTasksResponse.tasks
        .filter(t => 
          t.parent_task_id === task.parent_task_id && 
          t.id !== task.id && 
          t.scheduled_for &&
          new Date(t.scheduled_for) > currentScheduledDate &&
          t.status !== 'completed'
        )
        .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
        .slice(0, 3);
      return futureTasks.map(t => t.scheduled_for);
    } else if (task?.is_recurring) {
      // Parent task: find child tasks with future scheduled_for dates
      const futureTasks = allTasksResponse.tasks
        .filter(t => 
          t.parent_task_id === task.id && 
          t.scheduled_for &&
          new Date(t.scheduled_for) > now &&
          t.status !== 'completed'
        )
        .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
        .slice(0, 3);
      return futureTasks.map(t => t.scheduled_for);
    }
    
    return [];
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
      // Ako je izabrano 'all' i task ima parent, briši parent (što briše sve child-ove)
      const taskToDelete = (deleteType === 'all' && task.parent_task_id) 
        ? task.parent_task_id 
        : task.id;
      deleteMutation.mutate(taskToDelete);
    }
    setShowDeleteDialog(false);
    setDeleteType('this'); // Reset za sledeći put
  };

  const getRecurrenceLabel = (pattern: string | null) => {
    if (!pattern || pattern === 'once') return null;
    
    // Handle legacy patterns
    const legacyLabels: Record<string, string> = {
      'daily': 'Svakog dana',
      'weekly': 'Nedjeljno',
      'monthly': 'Mjesečno'
    };
    if (legacyLabels[pattern]) return legacyLabels[pattern];
    
    // Parse dynamic patterns like "3_years", "5_months", "2_weeks", "1_days"
    const match = pattern.match(/^(\d+)_(days|weeks|months|years)$/);
    if (match) {
      const count = parseInt(match[1]);
      const unit = match[2];
      
      if (unit === 'days') {
        return count === 1 ? 'Svakog dana' : `Svaka ${count} dana`;
      } else if (unit === 'weeks') {
        if (count === 1) return 'Jednom nedjeljno';
        return `${count} puta nedjeljno`;
      } else if (unit === 'months') {
        if (count === 1) return 'Jednom mjesečno';
        return `${count} puta mjesečno`;
      } else if (unit === 'years') {
        if (count === 1) return 'Jednom godišnje';
        return `${count} puta godišnje`;
      }
    }
    
    return pattern;
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
    } else if (status === 'rejected') {
      return <Badge variant="destructive">Odbijen</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  // Admin and sef can delete and edit any task
  const canDelete = currentUserRole === 'sef' || currentUserRole === 'admin';
  const canEdit = currentUserRole === 'sef' || currentUserRole === 'admin';
  // Admin i šef mogu promijeniti radnika kome je zadatak dodijeljen (npr. kad
  // operater dodijeli zadatak radniku koji nije u smjeni, pa ga treba prebaciti drugom).
  const isAdminOrSef = currentUserRole === 'sef' || currentUserRole === 'admin';
  const canReassignWorker = isAdminOrSef && (task?.status === 'assigned_to_radnik' || task?.status === 'with_worker');
  // Admin i šef mogu odbiti pogrešno prijavljen zadatak i vratiti ga pošiljaocu sa objašnjenjem.
  const canReject = isAdminOrSef && !!task && !['completed', 'cancelled', 'rejected'].includes(task.status);
  
  if (!task) return null;

  return (
    <>
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
                <Badge 
                  variant="outline" 
                  className={`text-xs ${task.recurrence_pattern === 'cancelled' 
                    ? 'bg-red-50 border-red-200 text-red-700' 
                    : ''}`}
                >
                  <Repeat className="w-3 h-3 mr-1" />
                  Periodicni zadatak{task.recurrence_pattern === 'cancelled' && ' (Ukinut)'}
                </Badge>
              )}
              {task.recurrence_pattern && task.recurrence_pattern !== 'cancelled' && getRecurrenceLabel(task.recurrence_pattern) && (
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
            {(task.assigned_to_name || (task.status === 'with_external' && task.external_company_name)) && (
              <div className="flex items-start gap-2">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Dodeljeno</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-task-details-assigned">
                    {task.status === 'with_external' && task.external_company_name
                      ? task.external_company_name
                      : task.assigned_to_name}
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
                  {new Date(task.time).toLocaleString('sr-Latn-RS', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                
                {/* Next 3 upcoming dates for recurring tasks (both parent and child) */}
                {(task.parent_task_id || task.is_recurring) && nextOccurrences.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Sledeća 3 nadolazeća datuma:</p>
                    <div className="flex flex-col gap-0.5">
                      {nextOccurrences.map((date, index) => (
                        <p key={index} className="text-xs text-muted-foreground" data-testid={`text-next-occurrence-${index}`}>
                          {new Date(date).toLocaleDateString('sr-Latn-RS', {
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

            {/* Status zadatka — kome je dodijeljen, status, povraćaji, završetak */}
            <div className="flex items-start gap-2">
              <GitBranch className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">Status zadatka</p>

                {/* Trenutni status badge */}
                {task.status && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Trenutni status:</span>
                    <Badge
                      variant={
                        task.status === 'completed' ? 'default' :
                        task.status === 'returned_to_sef' ? 'destructive' :
                        task.status === 'rejected' ? 'destructive' :
                        task.status === 'with_external' ? 'secondary' :
                        'outline'
                      }
                      className={
                        task.status === 'completed' ? 'bg-green-600' :
                        task.status === 'returned_to_sef' ? '' :
                        ''
                      }
                      data-testid="badge-task-status"
                    >
                      {task.status === 'with_sef' ? 'Kod šefa' :
                       task.status === 'with_operator' ? 'Kod operatera' :
                       task.status === 'with_external' ? 'Kod eksterne firme' :
                       task.status === 'with_worker' || task.status === 'assigned_to_radnik' ? 'Kod radnika' :
                       task.status === 'returned_to_sef' ? 'Vraćen šefu' :
                       task.status === 'rejected' ? 'Odbijen' :
                       task.status === 'completed' ? 'Završen' :
                       task.status === 'cancelled' ? 'Otkazan' :
                       task.status === 'created' ? 'Kreiran' :
                       task.status}
                    </Badge>
                  </div>
                )}

                {/* Razlog odbijanja — vidljiv pošiljaocu i svima */}
                {task.status === 'rejected' && task.worker_report && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2" data-testid="text-reject-reason">
                    <p className="text-xs font-medium text-red-700 mb-1">Razlog odbijanja</p>
                    <p className="text-sm text-red-900 whitespace-pre-wrap">{task.worker_report}</p>
                  </div>
                )}

                {/* Trenutno zaduzen */}
                {(task.assigned_to_name || task.external_company_name || task.operator_name || task.sef_name) && (
                  <div className="text-sm text-muted-foreground" data-testid="text-task-current-holder">
                    <span className="text-xs">Trenutno zadužen: </span>
                    <span className="font-medium text-foreground">
                      {task.status === 'with_external' && task.external_company_name
                        ? task.external_company_name
                        : task.assigned_to_name || task.operator_name || task.sef_name || '—'}
                    </span>
                  </div>
                )}

                {/* Šef / Operator chain */}
                {task.sef_name && (
                  <div className="text-xs text-muted-foreground">
                    Šef: <span className="text-foreground">{task.sef_name}</span>
                  </div>
                )}
                {task.operator_name && task.operator_name !== task.sef_name && (
                  <div className="text-xs text-muted-foreground">
                    Operater: <span className="text-foreground">{task.operator_name}</span>
                  </div>
                )}

                {/* Razlozi vraćanja (ako postoje) */}
                {historyResponse?.return_reasons && historyResponse.return_reasons.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs font-medium text-destructive mb-1">
                      Vraćen ({historyResponse.return_reasons.length}×)
                    </p>
                    <div className="space-y-1">
                      {historyResponse.return_reasons.map((rr, idx) => (
                        <div key={idx} className="text-xs" data-testid={`status-return-reason-${idx}`}>
                          <span className="text-muted-foreground">{rr.user_name}: </span>
                          <span className="text-foreground">{rr.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Završeno */}
                {task.status === 'completed' && (task.completed_by_name || task.completed_at) && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1 text-xs">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-muted-foreground">Završio: </span>
                      <span className="font-medium text-foreground">{task.completed_by_name || '—'}</span>
                      {task.completed_at && (
                        <span className="text-muted-foreground">
                          {' • '}
                          {new Date(task.completed_at).toLocaleString('sr-Latn-RS', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    {task.receipt_confirmed_by_name && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Potvrdio prijem: <span className="text-foreground">{task.receipt_confirmed_by_name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

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

            {/* Chat / Messages Section for Admin and Sef */}
            {canChat && (
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  <p className="text-sm font-medium">Poruke</p>
                  {chatMessages.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{chatMessages.length}</Badge>
                  )}
                </div>

                <div
                  ref={chatScrollRef}
                  className="space-y-2 max-h-[250px] overflow-y-auto pr-1 mb-3"
                >
                  {messagesLoading ? (
                    <div className="text-center text-muted-foreground text-xs py-4">
                      Ucitavanje poruka...
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-xs py-4">
                      Nema poruka. Napisite prvu poruku.
                    </div>
                  ) : (
                    chatMessages.map((msg: any) => {
                      const isOwnMessage = msg.user_id === user?.id;
                      const isDocument = msg.action === 'document_uploaded';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <span className="text-[10px] text-muted-foreground mb-0.5">
                            {msg.user_name} ({msg.user_role}) - {format(new Date(msg.timestamp), 'dd.MM. HH:mm')}
                          </span>
                          <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}>
                            {isDocument ? (
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-xs">{msg.assigned_to || 'Dokument'}</p>
                                  {msg.message.startsWith('data:') ? (
                                    <a
                                      href={msg.message}
                                      download={msg.assigned_to || 'dokument'}
                                      className="text-xs underline"
                                    >
                                      Preuzmi
                                    </a>
                                  ) : (
                                    <p className="text-xs">{msg.message}</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p>{msg.message}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Napisite poruku..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      rows={2}
                      className="flex-1 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      data-testid="textarea-admin-chat-message"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending || !chatMessage.trim()}
                      data-testid="button-admin-send-message"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sendMessageMutation.isPending ? 'Slanje...' : 'Posalji'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDocUpload}
                      data-testid="button-admin-upload-document"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Dokument
                    </Button>
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
            {(task.parent_task_id || task.is_recurring) && (
              <div className="flex items-start gap-2">
                <History className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    onClick={(e) => {
                      e.preventDefault();
                      const next = !showRecurringHistory;
                      setShowRecurringHistory(next);
                      if (next) {
                        const btn = e.currentTarget;
                        setTimeout(() => {
                          btn.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                      }
                    }}
                    type="button"
                    data-testid="button-toggle-recurring-history"
                  >
                    <span className="text-sm font-medium">
                      Istorija izvršenja {pastOccurrences.length > 0 ? `(${pastOccurrences.length})` : ''}
                    </span>
                    {showRecurringHistory ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  
                  {showRecurringHistory && (
                    <div className="space-y-2 mt-2">
                      {pastOccurrences.length === 0 && (
                        <div className="p-4 border rounded-md bg-muted/30 text-center">
                          <p className="text-sm text-muted-foreground">Zadatak još nije izvršen</p>
                        </div>
                      )}
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
        {(canDelete || canEdit || (task.status === 'with_sef' || task.status === 'returned_to_sef') || canReassignWorker) && (
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {/* Left side: Assignment actions */}
            {((task.status === 'with_sef' || task.status === 'returned_to_sef') || canReassignWorker) && (
              <div className="flex gap-2 flex-1 flex-wrap">
                {onAssignToWorker && (
                  <Button
                    variant="default"
                    size="sm"
                    className={canReassignWorker ? 'bg-red-600 hover:bg-red-700 text-white' : undefined}
                    onClick={() => {
                      onAssignToWorker(task.id, task.title);
                      onOpenChange(false);
                    }}
                    data-testid="button-assign-worker"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {canReassignWorker ? 'Promijeni radnika' : 'Dodijeli radniku'}
                  </Button>
                )}
                {(task.status === 'with_sef' || task.status === 'returned_to_sef') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (onAssignToExternal) {
                        onAssignToExternal(task.id, task.title);
                        onOpenChange(false);
                      } else {
                        sendToExternalMutation.mutate(task.id);
                      }
                    }}
                    disabled={!onAssignToExternal && sendToExternalMutation.isPending}
                    data-testid="button-notify-external"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Dodijeli eksternoj firmi
                  </Button>
                )}
              </div>
            )}
            
            {/* Right side: Report, Edit and Delete actions */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
              {canReject && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={() => setShowRejectDialog(true)}
                  data-testid="button-reject-task"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Vrati pošiljaocu
                </Button>
              )}
              {canGenerateReport && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={handleDownloadReport}
                  disabled={isDownloadingReport}
                  data-testid="button-generate-report"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isDownloadingReport ? 'Generisanje...' : 'Izvjestaj PDF'}
                </Button>
              )}
              {canEdit && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    onEdit(task.id);
                    onOpenChange(false);
                  }}
                  data-testid="button-edit-task"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Uredi
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setShowDeleteDialog(true)}
                  data-testid="button-delete-task"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Obriši
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
      </Dialog>

      <ImagePreviewModal 
        imageUrl={previewImage} 
        onClose={() => setPreviewImage(null)} 
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) setDeleteType('this');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Brisanje zadatka</AlertDialogTitle>
            <AlertDialogDescription>
              {task?.parent_task_id ? (
                <span>Ovaj zadatak je dio periodicnog ponavljanja. Izaberite opciju brisanja:</span>
              ) : task?.is_recurring ? (
                <span>Ovo je periodican zadatak. Brisanjem ce se obrisati i svi budući zakazani zadaci.</span>
              ) : (
                <span>Da li ste sigurni da zelite da obrisete ovaj zadatak? Ova akcija se ne moze ponistiti.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {task?.parent_task_id && (
            <div className="space-y-3 py-2">
              <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  name="deleteType"
                  value="this"
                  checked={deleteType === 'this'}
                  onChange={() => setDeleteType('this')}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-medium text-sm">Obrisi samo ovaj zadatak</p>
                  <p className="text-xs text-muted-foreground">Ostali zakazani zadaci ostaju aktivni</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50 border-destructive/50">
                <input
                  type="radio"
                  name="deleteType"
                  value="all"
                  checked={deleteType === 'all'}
                  onChange={() => setDeleteType('all')}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-medium text-sm text-destructive">Obrisi SVE buduće zadatke</p>
                  <p className="text-xs text-muted-foreground">Zaustavlja ponavljanje i brise sve nezavrsene zadatke</p>
                </div>
              </label>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Otkazi</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteType === 'all' ? 'Obrisi sve' : 'Obrisi'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRejectDialog} onOpenChange={(open) => {
        setShowRejectDialog(open);
        if (!open) setRejectReason('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vrati zadatak pošiljaocu</AlertDialogTitle>
            <AlertDialogDescription>
              Zadatak je pogrešno prijavljen. Napišite objašnjenje zašto ga vraćate. Pošiljalac će dobiti obavještenje, a status zadatka postaje ODBIJEN.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Npr. Ovaj zadatak je za domaćinstvo, a ne za tehničku službu..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              data-testid="input-reject-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reject">Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!task || !rejectReason.trim()) {
                  toast({ title: 'Greška', description: 'Morate unijeti razlog vraćanja.', variant: 'destructive' });
                  return;
                }
                rejectMutation.mutate({ taskId: task.id, reason: rejectReason.trim() });
              }}
              disabled={rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? 'Slanje...' : 'Vrati i odbij'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
