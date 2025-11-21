import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Clock, Minus } from 'lucide-react';

type Priority = 'urgent' | 'normal' | 'can_wait';

interface PriorityBadgeProps {
  priority: Priority;
  showIcon?: boolean;
}

export default function PriorityBadge({ priority, showIcon = true }: PriorityBadgeProps) {
  const { t } = useTranslation();

  const config = {
    urgent: {
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      icon: AlertCircle
    },
    normal: {
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      icon: Minus
    },
    can_wait: {
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      icon: Clock
    }
  };

  const Icon = config[priority].icon;

  return (
    <Badge className={`${config[priority].color} border-0 no-default-hover-elevate no-default-active-elevate gap-1`} data-testid={`badge-priority-${priority}`}>
      {showIcon && <Icon className="w-3 h-3" />}
      {t(priority)}
    </Badge>
  );
}
