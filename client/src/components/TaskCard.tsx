import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, MapPin, Calendar, User } from 'lucide-react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  location?: string;
  roomNumber?: string;
  priority: 'urgent' | 'normal' | 'can_wait';
  status: string;
  assignedTo?: { name: string; initials: string };
  deadline?: Date;
  createdAt: Date;
  isOverdue?: boolean;
  onClick?: () => void;
}

export default function TaskCard({
  id,
  title,
  description,
  location,
  roomNumber,
  priority,
  status,
  assignedTo,
  deadline,
  createdAt,
  isOverdue,
  onClick
}: TaskCardProps) {
  const { t } = useTranslation();

  const priorityBorderColors = {
    urgent: 'border-l-red-500',
    normal: 'border-l-blue-500',
    can_wait: 'border-l-gray-400'
  };

  return (
    <Card 
      className={`border-l-4 ${priorityBorderColors[priority]} hover-elevate cursor-pointer transition-all`}
      onClick={onClick}
      data-testid={`card-task-${id}`}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-base line-clamp-1" data-testid={`text-task-title-${id}`}>{title}</h3>
            <span className="text-xs text-muted-foreground font-mono">#{id.slice(0, 8)}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-task-menu-${id}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem data-testid={`button-edit-task-${id}`}>{t('edit')}</DropdownMenuItem>
            <DropdownMenuItem data-testid={`button-assign-task-${id}`}>{t('assign')}</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" data-testid={`button-cancel-task-${id}`}>{t('cancel')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2">
        {(location || roomNumber) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{location}{roomNumber ? ` - ${t('roomNumber')}: ${roomNumber}` : ''}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={status as any} />
          <PriorityBadge priority={priority} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          {assignedTo && (
            <>
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">{assignedTo.initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{assignedTo.name}</span>
            </>
          )}
          {!assignedTo && (
            <span className="text-sm text-muted-foreground italic">{t('assignedTo')}: -</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {deadline && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(deadline, { addSuffix: true })}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
