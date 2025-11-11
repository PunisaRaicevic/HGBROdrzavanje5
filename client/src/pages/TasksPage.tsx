import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TaskCard from '@/components/TaskCard';
import CreateTaskDialog from '@/components/CreateTaskDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

export default function TasksPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  //todo: remove mock functionality
  const mockTasks = [
    {
      id: 'task-001',
      title: 'Popravka klima uređaja u sobi 305',
      description: 'Gost se žali na neradan klima uređaj. Potrebna je hitna intervencija.',
      location: 'Kat 3',
      roomNumber: '305',
      priority: 'urgent' as const,
      status: 'new',
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
      createdAt: new Date(),
      isOverdue: false
    },
    {
      id: 'task-002',
      title: 'Redovno čišćenje bazena',
      description: 'Dnevno održavanje i kontrola hemikalija u bazenu.',
      location: 'Bazen',
      priority: 'normal' as const,
      status: 'assigned_to_radnik',
      assignedTo: { name: 'Jovan Marković', initials: 'JM' },
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      isOverdue: false
    },
    {
      id: 'task-003',
      title: 'Zamena slavine u restoranu',
      description: 'Slavina u kuhinji curi i treba je zameniti.',
      location: 'Restoran - Kuhinja',
      priority: 'can_wait' as const,
      status: 'with_operator',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isOverdue: false
    },
    {
      id: 'task-004',
      title: 'Održavanje teretane',
      description: 'Provera i podmazivanje opreme za vežbanje.',
      location: 'Teretana',
      priority: 'normal' as const,
      status: 'with_sef',
      assignedTo: { name: 'Milan Đorđević', initials: 'MĐ' },
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      isOverdue: false
    },
    {
      id: 'task-005',
      title: 'Popravka televizora u sobi 210',
      description: 'Televizor ne prima signal.',
      location: 'Kat 2',
      roomNumber: '210',
      priority: 'urgent' as const,
      status: 'with_external',
      deadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isOverdue: false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-medium">{t('tasks')}</h1>
        <CreateTaskDialog />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-tasks"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-status">
            <SelectValue placeholder={t('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('viewAll')}</SelectItem>
            <SelectItem value="new">{t('new')}</SelectItem>
            <SelectItem value="assigned_to_radnik">{t('assigned_to_radnik')}</SelectItem>
            <SelectItem value="completed">{t('completed')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-priority">
            <SelectValue placeholder={t('priority')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('viewAll')}</SelectItem>
            <SelectItem value="urgent">{t('urgent')}</SelectItem>
            <SelectItem value="normal">{t('normal')}</SelectItem>
            <SelectItem value="can_wait">{t('can_wait')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockTasks.map(task => (
          <TaskCard
            key={task.id}
            {...task}
            onClick={() => console.log('View task:', task.id)}
          />
        ))}
      </div>
    </div>
  );
}
