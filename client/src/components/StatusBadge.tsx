import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

type TaskStatus = 'new' | 'with_operator' | 'assigned_to_radnik' | 'with_sef' | 'with_external' | 'returned_to_operator' | 'returned_to_sef' | 'completed' | 'cancelled';

interface StatusBadgeProps {
  status: TaskStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();

  const statusColors: Record<TaskStatus, string> = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    with_operator: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    assigned_to_radnik: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    with_sef: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    with_external: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    returned_to_operator: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    returned_to_sef: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return (
    <Badge className={`${statusColors[status]} border-0 no-default-hover-elevate no-default-active-elevate`} data-testid={`badge-status-${status}`}>
      {t(status)}
    </Badge>
  );
}
