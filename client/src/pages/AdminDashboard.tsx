import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, ClipboardList, CheckCircle, Clock, Users, Edit, BarChart3, Printer, Download } from 'lucide-react';
import StatCard from '@/components/StatCard';
import CreateTaskDialog from '@/components/CreateTaskDialog';
import EditUserDialog from '@/components/EditUserDialog';
import TaskDetailsDialog from '@/components/TaskDetailsDialog';
import { PeriodPicker } from '@/components/PeriodPicker';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiUrl } from '@/lib/apiUrl';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  job_title: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  created_at: string;
  created_by?: string;
  created_by_name?: string;
  assigned_to_name?: string;
  location?: string;
  completed_at?: string | null;
  images?: string[];
  worker_images?: string[];
  scheduled_for?: string;
  parent_task_id?: string | null;
  is_recurring?: boolean;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserJobTitle, setNewUserJobTitle] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tasksPerPage, setTasksPerPage] = useState<number>(10);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [tasksPeriodFilter, setTasksPeriodFilter] = useState<string>('7d'); // Default 7 days
  
  // Period states with date ranges
  const now = new Date();
  const [statsGranularity, setStatsGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [statsRange, setStatsRange] = useState({
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  });
  
  const [analysisGranularity, setAnalysisGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [analysisRange, setAnalysisRange] = useState({
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  });
  
  const [reportGranularity, setReportGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [reportRange, setReportRange] = useState({
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  });

  // Fetch users (auto-refresh every 10 seconds)
  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: User[] }>({
    queryKey: ['/api/users'],
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchOnWindowFocus: true
  });

  // Fetch tasks (auto-refresh every 10 seconds)
  const { data: tasksData, isLoading: tasksLoading } = useQuery<{ tasks: Task[] }>({
    queryKey: ['/api/tasks'],
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchOnWindowFocus: true
  });

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: { username: string; email: string; full_name: string; password: string; role: string; job_title?: string; department?: string; phone?: string }) => {
      const response = await fetch(getApiUrl('/api/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Uspeh',
        description: 'Novi korisnik je uspešno kreiran.'
      });
      // Reset form
      setNewUserUsername('');
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setNewUserPhone('');
      setNewUserRole('');
      setNewUserJobTitle('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Greška',
        description: error.message || 'Nije moguće kreirati korisnika.',
        variant: 'destructive'
      });
    }
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserUsername || !newUserEmail || !newUserName || !newUserPassword || !newUserRole) {
      toast({
        title: 'Greška',
        description: 'Korisničko ime, email, ime, lozinka i uloga su obavezni.',
        variant: 'destructive'
      });
      return;
    }

    createUserMutation.mutate({
      username: newUserUsername,
      email: newUserEmail,
      full_name: newUserName,
      password: newUserPassword,
      role: newUserRole,
      job_title: newUserJobTitle || undefined,
      phone: newUserPhone || undefined
    });
  };

  const users = usersData?.users || [];
  const tasks = tasksData?.tasks || [];

  // Get report data
  const getReportTasks = () => {
    return tasks.filter(t => {
      const taskDate = new Date(t.created_at);
      return taskDate >= reportRange.start && taskDate < reportRange.end;
    });
  };

  // Format date for display
  const formatReportDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('sr-Latn-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Download CSV
  const downloadCSV = () => {
    const reportTasks = getReportTasks();
    
    const headers = ['Naslov', 'Opis', 'Status', 'Prioritet', 'Lokacija', 'Kreirao', 'Dodijeljeno radniku', 'Datum kreiranja', 'Datum zavrsenja'];
    const rows = reportTasks.map(task => [
      task.title,
      task.description || '',
      task.status,
      task.priority || 'normal',
      task.location || '',
      task.created_by_name || '',
      task.assigned_to_name || '',
      formatReportDate(task.created_at),
      task.completed_at ? formatReportDate(task.completed_at) : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `izvjestaj_${reportRange.start.toISOString().split('T')[0]}_${reportRange.end.toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: 'Uspeh',
      description: 'CSV fajl je preuzet.'
    });
  };

  // Print report
  const printReport = () => {
    const reportTasks = getReportTasks();
    const completedTasks = reportTasks.filter(t => t.status === 'completed');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Greska',
        description: 'Nije moguce otvoriti prozor za stampu.',
        variant: 'destructive'
      });
      return;
    }

    const statusLabels: { [key: string]: string } = {
      'pending': 'Na cekanju',
      'in_progress': 'U toku',
      'assigned_to_radnik': 'Dodijeljeno radniku',
      'completed': 'Zavrseno',
      'cancelled': 'Otkazano'
    };

    const priorityLabels: { [key: string]: string } = {
      'urgent': 'Hitno',
      'normal': 'Normalno',
      'can_wait': 'Moze sacekati'
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Izvjestaj - ${reportRange.start.toLocaleDateString('sr-Latn-RS')} - ${reportRange.end.toLocaleDateString('sr-Latn-RS')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 10px; }
          .period { text-align: center; color: #666; margin-bottom: 20px; }
          .summary { display: flex; gap: 20px; justify-content: center; margin-bottom: 30px; }
          .summary-item { padding: 15px 30px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
          .summary-item .value { font-size: 24px; font-weight: bold; }
          .summary-item .label { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f5f5f5; }
          .status-completed { color: green; }
          .status-pending { color: orange; }
          .priority-urgent { color: red; font-weight: bold; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>Izvjestaj o zadacima</h1>
        <p class="period">Period: ${reportRange.start.toLocaleDateString('sr-Latn-RS')} - ${reportRange.end.toLocaleDateString('sr-Latn-RS')}</p>
        
        <div class="summary">
          <div class="summary-item">
            <div class="value">${reportTasks.length}</div>
            <div class="label">Ukupno zadataka</div>
          </div>
          <div class="summary-item">
            <div class="value" style="color: green;">${completedTasks.length}</div>
            <div class="label">Zavrseno</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Naslov</th>
              <th>Status</th>
              <th>Prioritet</th>
              <th>Lokacija</th>
              <th>Kreirao</th>
              <th>Dodijeljeno</th>
              <th>Datum kreiranja</th>
              <th>Datum zavrsenja</th>
            </tr>
          </thead>
          <tbody>
            ${reportTasks.map(task => `
              <tr>
                <td>${task.title}</td>
                <td class="status-${task.status}">${statusLabels[task.status] || task.status}</td>
                <td class="${task.priority === 'urgent' ? 'priority-urgent' : ''}">${priorityLabels[task.priority || 'normal'] || task.priority}</td>
                <td>${task.location || '-'}</td>
                <td>${task.created_by_name || '-'}</td>
                <td>${task.assigned_to_name || '-'}</td>
                <td>${formatReportDate(task.created_at)}</td>
                <td>${task.completed_at ? formatReportDate(task.completed_at) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Calculate statistics
  const totalUsers = users.length;
  const totalTasks = tasks.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1">
            {user?.fullName} - {user?.role}
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {usersLoading || tasksLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard 
              title="Total Users" 
              value={totalUsers} 
              icon={Users}
            />
            <StatCard 
              title={t('totalTasks')} 
              value={totalTasks} 
              icon={ClipboardList}
            />
          </>
        )}
      </div>

      {/* Main Admin Features */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="h-9 w-full grid grid-cols-3">
          <TabsTrigger value="users" data-testid="tab-users" className="text-sm">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Korisnici
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks" className="text-sm">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            Zadaci
          </TabsTrigger>
          <TabsTrigger value="stats" data-testid="tab-stats" className="text-sm">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Statistike
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dodaj novog korisnika</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Puno ime</Label>
                    <Input
                      id="user-name"
                      placeholder="Petar Petrović"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      data-testid="input-user-name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-username">{t('username')}</Label>
                    <Input
                      id="user-username"
                      type="text"
                      placeholder="petar"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      data-testid="input-user-username"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-email">Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      placeholder="petar@hotel.me"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      data-testid="input-user-email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-password">Lozinka</Label>
                    <Input
                      id="user-password"
                      type="password"
                      placeholder="Unesite lozinku"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      data-testid="input-user-password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-phone">Telefon</Label>
                    <Input
                      id="user-phone"
                      type="tel"
                      placeholder="+382 68 123 456"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      data-testid="input-user-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-role">Sistemska uloga *</Label>
                    <Select 
                      value={newUserRole} 
                      onValueChange={setNewUserRole}
                      required
                    >
                      <SelectTrigger 
                        id="user-role" 
                        data-testid="select-user-role"
                        className="min-h-11"
                      >
                        <SelectValue placeholder="Izaberi ulogu..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recepcioner">Prijavljivanje reklamacija</SelectItem>
                        <SelectItem value="operater">Operater</SelectItem>
                        <SelectItem value="radnik">Otklanjanje reklamacija</SelectItem>
                        <SelectItem value="sef">Šef</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-job-title">Zanimanje / Pozicija</Label>
                    <Input
                      id="user-job-title"
                      placeholder="Npr: Recepcioner, Kuvar, Tehničar..."
                      value={newUserJobTitle}
                      onChange={(e) => setNewUserJobTitle(e.target.value)}
                      data-testid="input-user-job-title"
                      className="min-h-11"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  data-testid="button-add-user"
                  disabled={createUserMutation.isPending}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {createUserMutation.isPending ? 'Kreiranje...' : 'Dodaj korisnika'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* User List */}
          <Card>
            <CardHeader>
              <CardTitle>Trenutni korisnici ({totalUsers})</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nema korisnika</p>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div 
                      key={u.id} 
                      className="flex items-center justify-between p-3 border rounded-md"
                      data-testid={`user-item-${u.id}`}
                    >
                      <div>
                        <p className="font-medium">{u.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {u.job_title || u.role}
                          {u.phone && ` | ${u.phone}`}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingUser(u)}
                        data-testid={`button-edit-user-${u.id}`}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Izmeni
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium">Task Management</h2>
            <CreateTaskDialog />
          </div>

          <Card>
            <CardHeader className="space-y-3 pb-4">
              <div className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Sve reklamacije</CardTitle>
                <Select 
                  value={tasksPerPage === 999999 ? 'all' : String(tasksPerPage)} 
                  onValueChange={(val) => setTasksPerPage(val === 'all' ? 999999 : parseInt(val))}
                >
                  <SelectTrigger className="w-32" data-testid="select-tasks-per-page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="all">Sve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: '1d', label: 'Danas' },
                  { value: '7d', label: '7 dana' },
                  { value: '30d', label: '30 dana' },
                  { value: '3m', label: '3 mjeseca' },
                  { value: '6m', label: '6 mjeseci' },
                  { value: '1y', label: '1 godina' },
                  { value: 'all', label: 'Sve' },
                ].map((period) => (
                  <Button
                    key={period.value}
                    type="button"
                    variant={tasksPeriodFilter === period.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTasksPeriodFilter(period.value)}
                    data-testid={`period-filter-${period.value}`}
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {(() => {
                      // Filter tasks by period
                      const getFilteredTasks = () => {
                        const now = new Date();
                        let startDate: Date | null = null;
                        
                        switch (tasksPeriodFilter) {
                          case '1d':
                            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            break;
                          case '7d':
                            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            break;
                          case '30d':
                            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                            break;
                          case '3m':
                            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                            break;
                          case '6m':
                            startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                            break;
                          case '1y':
                            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                            break;
                          case 'all':
                          default:
                            return tasks;
                        }
                        
                        return tasks.filter(task => {
                          const taskDate = task.scheduled_for 
                            ? new Date(task.scheduled_for) 
                            : new Date(task.created_at);
                          return taskDate >= startDate!;
                        });
                      };
                      
                      const filteredTasks = getFilteredTasks();
                      
                      return filteredTasks
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, tasksPerPage)
                        .map((task) => {
                        const getStatusBadge = (status: string) => {
                          if (status === 'completed') {
                            return <Badge variant="default" className="bg-green-600">Završeno</Badge>;
                          } else if (status === 'assigned_to_radnik' || status === 'with_operator') {
                            return <Badge variant="secondary">U toku</Badge>;
                          } else if (status === 'with_external') {
                            return <Badge variant="outline">Eksterna firma</Badge>;
                          }
                          return <Badge variant="secondary">{status}</Badge>;
                        };

                        const formatDate = (dateStr: string) => {
                          const date = new Date(dateStr);
                          return date.toLocaleDateString('sr-RS', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        };

                        return (
                          <div 
                            key={task.id} 
                            className="p-4 border rounded-md hover-elevate cursor-pointer"
                            data-testid={`task-item-${task.id}`}
                            onClick={() => setSelectedTask(task)}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-sm text-muted-foreground whitespace-nowrap">
                                  {task.scheduled_for ? (
                                    <span>Zakazano: {formatDate(task.scheduled_for)}</span>
                                  ) : (
                                    formatDate(task.created_at)
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                  {getStatusBadge(task.status)}
                                  {(task.parent_task_id || task.is_recurring) ? (
                                    <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                                      Periodičan
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-600">
                                      Jednokratan
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h3 className="font-medium text-base mb-2">{task.title}</h3>
                                {task.description && (
                                  <p className="text-sm mb-2">{task.description}</p>
                                )}
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  {task.created_by_name && (
                                    <p>Prijavio: {task.created_by_name}</p>
                                  )}
                                  {task.assigned_to_name && (
                                    <p>Dodeljeno: {task.assigned_to_name}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    
                    {tasks.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nema zadataka
                      </p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {/* Statistika realizacije zadataka */}
          <Card>
            <CardHeader className="space-y-3 pb-4">
              <CardTitle>Statistika realizacije zadataka</CardTitle>
              <PeriodPicker
                value={statsRange}
                onChange={setStatsRange}
                granularity={statsGranularity}
                onGranularityChange={setStatsGranularity}
                data-testid="period-picker-stats"
              />
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : (
                (() => {
                  const periodTasks = tasks.filter(t => {
                    const taskDate = new Date(t.created_at);
                    return taskDate >= statsRange.start && taskDate < statsRange.end;
                  });
                  const completedTasks = periodTasks.filter(t => t.status === 'completed');
                  const inProgressTasks = periodTasks.filter(t => 
                    t.status === 'assigned_to_radnik' || 
                    t.status === 'with_operator' || 
                    t.status === 'in_progress'
                  );
                  const pendingTasks = periodTasks.filter(t => 
                    t.status === 'new' || 
                    t.status === 'pending' || 
                    t.status === 'assigned_to_operator'
                  );
                  const externalTasks = periodTasks.filter(t => t.status === 'with_external');

                  const completionRate = periodTasks.length > 0 
                    ? Math.round((completedTasks.length / periodTasks.length) * 100) 
                    : 0;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 p-3 border rounded-md bg-muted/30">
                          <p className="text-xs text-muted-foreground">Izabrani period</p>
                          <p className="text-xl font-bold mt-0.5">{periodTasks.length}</p>
                          <p className="text-xs text-muted-foreground">Ukupno</p>
                        </div>
                        <div className="flex-1 p-3 border rounded-md bg-muted/30">
                          <p className="text-xs text-muted-foreground">Stopa realizacije</p>
                          <p className="text-xl font-bold text-green-600 mt-0.5">{completionRate}%</p>
                        </div>
                      </div>

                      <div className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <button 
                            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'completed' ? null : 'completed')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                              selectedStatusFilter === 'completed' 
                                ? 'bg-green-50 border-green-500 shadow-md scale-105' 
                                : 'border-green-300 hover:border-green-500 hover:shadow-md hover:scale-102'
                            }`}
                            data-testid="filter-button-completed"
                          >
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Završeno</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">{completedTasks.length}</p>
                          </button>
                          <button 
                            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'in_progress' ? null : 'in_progress')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                              selectedStatusFilter === 'in_progress' 
                                ? 'bg-blue-50 border-blue-500 shadow-md scale-105' 
                                : 'border-blue-300 hover:border-blue-500 hover:shadow-md hover:scale-102'
                            }`}
                            data-testid="filter-button-in-progress"
                          >
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">U toku</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">{inProgressTasks.length}</p>
                          </button>
                          <button 
                            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'pending' ? null : 'pending')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                              selectedStatusFilter === 'pending' 
                                ? 'bg-yellow-50 border-yellow-500 shadow-md scale-105' 
                                : 'border-yellow-300 hover:border-yellow-500 hover:shadow-md hover:scale-102'
                            }`}
                            data-testid="filter-button-pending"
                          >
                            <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Na čekanju</p>
                            <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingTasks.length}</p>
                          </button>
                          <button 
                            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'external' ? null : 'external')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                              selectedStatusFilter === 'external' 
                                ? 'bg-purple-50 border-purple-500 shadow-md scale-105' 
                                : 'border-purple-300 hover:border-purple-500 hover:shadow-md hover:scale-102'
                            }`}
                            data-testid="filter-button-external"
                          >
                            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Eksterna</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">{externalTasks.length}</p>
                          </button>
                        </div>
                      </div>

                      {selectedStatusFilter && (
                        <div className="mt-6 pt-6 border-t">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">
                              {selectedStatusFilter === 'completed' && 'Završeni zadaci'}
                              {selectedStatusFilter === 'in_progress' && 'Zadaci u toku'}
                              {selectedStatusFilter === 'pending' && 'Zadaci na čekanju'}
                              {selectedStatusFilter === 'external' && 'Zadaci - Eksterna firma'}
                            </h3>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedStatusFilter(null)}
                              data-testid="button-clear-filter"
                            >
                              Obriši filter
                            </Button>
                          </div>
                          <ScrollArea className="h-[400px] border rounded-md pr-4">
                            <div className="space-y-3 p-4">
                              {(() => {
                                let filteredTasks: Task[] = [];
                                
                                if (selectedStatusFilter === 'completed') {
                                  filteredTasks = completedTasks;
                                } else if (selectedStatusFilter === 'in_progress') {
                                  filteredTasks = inProgressTasks;
                                } else if (selectedStatusFilter === 'pending') {
                                  filteredTasks = pendingTasks;
                                } else if (selectedStatusFilter === 'external') {
                                  filteredTasks = externalTasks;
                                }

                                if (filteredTasks.length === 0) {
                                  return (
                                    <p className="text-center text-muted-foreground py-6 text-sm">
                                      Nema zadataka sa ovim statusom za izabrani period
                                    </p>
                                  );
                                }

                                return filteredTasks
                                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                  .map((task) => {
                                    const getStatusBadge = (status: string) => {
                                      if (status === 'completed') {
                                        return <Badge variant="default" className="bg-green-600">Završeno</Badge>;
                                      } else if (status === 'assigned_to_radnik' || status === 'with_operator') {
                                        return <Badge variant="secondary">U toku</Badge>;
                                      } else if (status === 'with_external') {
                                        return <Badge variant="outline">Eksterna firma</Badge>;
                                      }
                                      return <Badge variant="secondary">{status}</Badge>;
                                    };

                                    const formatDate = (dateStr: string) => {
                                      const date = new Date(dateStr);
                                      return date.toLocaleDateString('sr-RS', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    };

                                    return (
                                      <div 
                                        key={task.id} 
                                        className="p-3 border rounded-md hover-elevate cursor-pointer"
                                        data-testid={`filtered-task-item-${task.id}`}
                                        onClick={() => setSelectedTask(task)}
                                      >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                          <span className="text-xs text-muted-foreground">{formatDate(task.created_at)}</span>
                                          <div className="flex flex-col gap-1 items-end">
                                            {getStatusBadge(task.status)}
                                            {(task.parent_task_id || task.is_recurring) ? (
                                              <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                                                Periodičan
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-600">
                                                Jednokratan
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <h4 className="font-medium text-sm">{task.title}</h4>
                                        {task.created_by_name && (
                                          <p className="text-xs text-muted-foreground mt-1">Prijavio: {task.created_by_name}</p>
                                        )}
                                      </div>
                                    );
                                  });
                              })()}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>

          {/* Generisanje izvještaja */}
          <Card>
            <CardHeader className="space-y-3 pb-3">
              <CardTitle>Generisanje izvještaja</CardTitle>
              <PeriodPicker
                value={reportRange}
                onChange={setReportRange}
                granularity={reportGranularity}
                onGranularityChange={setReportGranularity}
                data-testid="period-picker-report"
              />
            </CardHeader>
            <CardContent className="pt-3">
              {tasksLoading ? (
                <Skeleton className="h-20" />
              ) : (
                (() => {
                  const periodTasks = tasks.filter(t => {
                    const taskDate = new Date(t.created_at);
                    return taskDate >= reportRange.start && taskDate < reportRange.end;
                  });

                  const completedReportTasks = periodTasks.filter(t => t.status === 'completed');

                  return (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1 p-2.5 border rounded-md bg-muted/30">
                          <p className="text-xs text-muted-foreground">Ukupno zadataka</p>
                          <p className="text-lg font-bold mt-0.5">{periodTasks.length}</p>
                        </div>
                        <div className="flex-1 p-2.5 border rounded-md bg-muted/30">
                          <p className="text-xs text-muted-foreground">Zavrseno zadataka</p>
                          <p className="text-lg font-bold text-green-600 mt-0.5">{completedReportTasks.length}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1" size="sm" onClick={printReport} data-testid="button-print-report">
                          <Printer className="w-4 h-4 mr-2" />
                          Stampaj
                        </Button>
                        <Button className="flex-1" size="sm" variant="outline" onClick={downloadCSV} data-testid="button-download-csv">
                          <Download className="w-4 h-4 mr-2" />
                          Preuzmi CSV
                        </Button>
                      </div>
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>

          {/* Analiza vremena prijave zadataka */}
          <Card>
            <CardHeader className="space-y-3 pb-4">
              <CardTitle>Analiza vremena prijave zadataka</CardTitle>
              <PeriodPicker
                value={analysisRange}
                onChange={setAnalysisRange}
                granularity={analysisGranularity}
                onGranularityChange={setAnalysisGranularity}
                data-testid="period-picker-analysis"
              />
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <Skeleton className="h-64" />
              ) : (
                (() => {
                  const periodTasks = tasks.filter(t => {
                    const taskDate = new Date(t.created_at);
                    return taskDate >= analysisRange.start && taskDate < analysisRange.end;
                  });

                  // Grupiranje po satima za SVE periode (radno vrijeme 7-23h)
                  const hourIntervals: { [key: string]: number } = {};
                  
                  // Kreiraj intervale za radno vrijeme 7-23h
                  for (let i = 7; i < 23; i++) {
                    const startHour = i.toString().padStart(2, '0');
                    const endHour = (i + 1).toString().padStart(2, '0');
                    hourIntervals[`${startHour}-${endHour}`] = 0;
                  }

                  let outsideHoursCount = 0;
                  periodTasks.forEach(task => {
                    const hour = new Date(task.created_at).getHours();
                    if (hour >= 7 && hour < 23) {
                      const startHour = hour.toString().padStart(2, '0');
                      const endHour = (hour + 1).toString().padStart(2, '0');
                      const interval = `${startHour}-${endHour}`;
                      hourIntervals[interval]++;
                    } else {
                      outsideHoursCount++;
                    }
                  });

                  const maxCount = Math.max(...Object.values(hourIntervals), 1);

                  return (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Distribucija po satu prijema (radno vrijeme 07-23h)
                      </p>
                      <div className="space-y-1.5">
                        {Object.entries(hourIntervals).map(([interval, count]) => (
                          <div key={interval} className="flex items-center gap-2">
                            <span className="text-xs w-14 text-muted-foreground font-medium">{interval}</span>
                            <div className="flex-1 bg-muted rounded-md h-7 relative overflow-hidden">
                              <div 
                                className="bg-primary h-full flex items-center px-2 text-primary-foreground text-xs font-medium"
                                style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? '24px' : '0' }}
                              >
                                {count > 0 && count}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {periodTasks.length === 0 && (
                        <p className="text-center text-muted-foreground py-6 text-xs">
                          Nema zadataka za izabrani period
                        </p>
                      )}
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editingUser}
        open={editingUser !== null}
        onOpenChange={(open) => !open && setEditingUser(null)}
      />

      {/* Task Details Dialog */}
      <TaskDetailsDialog
        open={selectedTask !== null}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask ? {
          id: selectedTask.id,
          title: selectedTask.title,
          description: selectedTask.description,
          location: selectedTask.location || '',
          priority: (selectedTask.priority || 'normal') as 'urgent' | 'normal' | 'can_wait',
          status: selectedTask.status,
          time: selectedTask.created_at,
          fromName: selectedTask.created_by_name || '',
          from: selectedTask.created_by || '',
          images: selectedTask.images,
          worker_images: selectedTask.worker_images,
          parent_task_id: selectedTask.parent_task_id,
          is_recurring: selectedTask.is_recurring,
          scheduled_for: selectedTask.scheduled_for
        } : null}
      />
    </div>
  );
}
