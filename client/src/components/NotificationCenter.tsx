import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'task_created' | 'task_assigned' | 'task_returned' | 'task_completed' | 'info' | 'warning';
  isRead: boolean;
  createdAt: Date;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
}

export default function NotificationCenter({ notifications, onMarkAsRead, onMarkAllAsRead }: NotificationCenterProps) {
  const { t } = useTranslation();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const typeColors = {
    task_created: 'bg-blue-100 dark:bg-blue-900/30',
    task_assigned: 'bg-purple-100 dark:bg-purple-900/30',
    task_returned: 'bg-orange-100 dark:bg-orange-900/30',
    task_completed: 'bg-green-100 dark:bg-green-900/30',
    info: 'bg-blue-100 dark:bg-blue-900/30',
    warning: 'bg-amber-100 dark:bg-amber-900/30',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground border-0"
              data-testid="badge-notification-count"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <h3 className="font-semibold">{t('notifications')}</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto text-xs"
              onClick={onMarkAllAsRead}
              data-testid="button-mark-all-read"
            >
              {t('markAsRead')}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('noData')}
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer ${!notification.isRead ? 'bg-accent/50' : ''}`}
                onClick={() => onMarkAsRead?.(notification.id)}
                data-testid={`notification-${notification.id}`}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeColors[notification.type]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center" data-testid="button-view-all-notifications">
          {t('viewAll')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
