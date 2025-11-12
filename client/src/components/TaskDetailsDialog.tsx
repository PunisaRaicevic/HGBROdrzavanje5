import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, User, AlertCircle, Image as ImageIcon, GitBranch } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

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
    priority: 'urgent' | 'normal' | 'can_wait';
    time: string;
    fromName: string;
    from: string;
    images?: string[];
  } | null;
}

export default function TaskDetailsDialog({ open, onOpenChange, task }: TaskDetailsDialogProps) {
  // Fetch task history only when dialog is open and task exists
  const { data: historyResponse, isLoading: historyLoading, isError: historyError } = useQuery<{ 
    history: any[], 
    return_reasons?: Array<{user_name: string, reason: string, timestamp: string}>
  }>({
    queryKey: [`/api/tasks/${task?.id}/history`],
    enabled: open && !!task?.id, // Only fetch when dialog is open
  });
  
  // Memoize assignment path calculation to avoid recomputation on re-renders
  const assignmentPath = useMemo(() => {
    if (!task || !historyResponse?.history) return '';
    return getTaskAssignmentPath(historyResponse.history);
  }, [task, historyResponse?.history]);
  
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
            {/* Priority Badge */}
            <div>
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
              <div>
                <p className="text-sm font-medium">Vrijeme prijave</p>
                <p className="text-sm text-muted-foreground" data-testid="text-task-details-time">
                  {task.time}
                </p>
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
                  <p className="text-sm font-medium mb-2">Slike</p>
                  <div className="grid grid-cols-2 gap-2">
                    {task.images.map((image, index) => (
                      <img 
                        key={index}
                        src={image}
                        alt={`Task image ${index + 1}`}
                        className="rounded-md border w-full h-auto object-cover"
                        data-testid={`img-task-details-${index}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!task.description && (!task.images || task.images.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nema dodatnih informacija
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
