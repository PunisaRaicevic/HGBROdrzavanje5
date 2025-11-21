import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CheckCircle, XCircle, UserPlus, MessageSquare, Image as ImageIcon, Clock } from 'lucide-react';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  userName: string;
  userRole: string;
  actionType: string;
  actionDescription: string;
  hasPhoto?: boolean;
}

interface TaskTimelineProps {
  events: TimelineEvent[];
}

export default function TaskTimeline({ events }: TaskTimelineProps) {
  const { t } = useTranslation();

  const getIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return Clock;
      case 'assigned':
        return UserPlus;
      case 'completed':
        return CheckCircle;
      case 'cancelled':
        return XCircle;
      case 'message':
        return MessageSquare;
      case 'photo':
        return ImageIcon;
      default:
        return Clock;
    }
  };

  const getIconColor = (actionType: string) => {
    switch (actionType) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'cancelled':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'assigned':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
      case 'message':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'photo':
        return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  return (
    <div className="space-y-4" data-testid="timeline-task">
      {events.map((event, index) => {
        const Icon = getIcon(event.actionType);
        const iconColor = getIconColor(event.actionType);

        return (
          <div key={event.id} className="flex gap-4" data-testid={`timeline-event-${event.id}`}>
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-md ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              {index < events.length - 1 && (
                <div className="w-0.5 h-full bg-border mt-2" />
              )}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{event.actionDescription}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.userName} • {t(event.userRole)}
                  </p>
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(event.timestamp, 'HH:mm')}
                </time>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
