import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, User, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
                  {task.fromName} ({task.from})
                </p>
              </div>
            </div>

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
