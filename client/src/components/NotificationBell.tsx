import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NewTask {
  id: string;
  title: string;
  from: string;
  fromName: string;
  priority: 'urgent' | 'normal' | 'can_wait';
  location: string;
  time: string;
}

interface NotificationBellProps {
  newTasks: NewTask[];
  onViewTask?: (taskId: string) => void;
}

export default function NotificationBell({ newTasks, onViewTask }: NotificationBellProps) {
  const hasNotifications = newTasks.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative" 
          data-testid="button-notification-bell"
        >
          <Bell className="h-5 w-5" />
          {hasNotifications && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-notification-count"
            >
              {newTasks.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" data-testid="popover-notifications">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Nove Reklamacije</h3>
          </div>
          {hasNotifications ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {newTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="p-3 rounded-md bg-muted/50 space-y-1 cursor-pointer hover-elevate"
                    data-testid={`notification-task-${task.id}`}
                    onClick={() => onViewTask?.(task.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium flex-1">{task.title}</p>
                      <Badge 
                        variant={
                          task.priority === 'urgent' ? 'destructive' : 
                          task.priority === 'normal' ? 'default' : 
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {task.priority === 'urgent' ? 'Hitno' : 
                         task.priority === 'normal' ? 'Normalno' : 
                         'Može Sačekati'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lokacija: {task.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Od: {task.fromName} ({task.from})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.time}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-notifications">
              Nema novih reklamacija
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
