import { useState, useEffect } from 'react';
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
import { UserPlus, ClipboardList, CheckCircle, Clock, Users, Edit, BarChart3, Printer, Download, Calendar, History, RefreshCw, Brain, X, MapPin } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StatCard from '@/components/StatCard';
import CreateTaskDialog from '@/components/CreateTaskDialog';
import EditUserDialog from '@/components/EditUserDialog';
import TaskDetailsDialog from '@/components/TaskDetailsDialog';
import EditTaskDialog from '@/components/EditTaskDialog';
import AdminAIChat from '@/components/AdminAIChat';
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
  last_seen: string | null;
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
  recurrence_pattern?: string | null;
}

function formatLastSeen(lastSeen: string | null): { label: string; online: boolean } {
  if (!lastSeen) return { label: 'Nikad prijavljen', online: false };
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 5) return { label: 'Onlajn', online: true };
  if (diffMin < 60) return { label: `Aktivan/na prije ${diffMin} min`, online: false };
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) {
    const t = new Date(lastSeen);
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    const mo = String(t.getMonth() + 1).padStart(2, '0');
    return { label: `Aktivan/na ${dd}.${mo}. u ${hh}:${mm}`, online: false };
  }
  const diffDays = Math.floor(diffH / 24);
  if (diffDays < 7) return { label: `Aktivan/na prije ${diffDays} dana`, online: false };
  const d = new Date(lastSeen);
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return { label: `Aktivan/na ${dd}.${mo}.`, online: false };
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserJobTitle, setNewUserJobTitle] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tasksPerPage, setTasksPerPage] = useState<number>(999999);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [tasksPeriodFilter, setTasksPeriodFilter] = useState<string>('7d'); // Default 7 days
  const [tasksStatusFilter, setTasksStatusFilter] = useState<string>('all'); // Status filter for tasks list
  const [tasksTypeFilter, setTasksTypeFilter] = useState<string>('all'); // Type filter: all, recurring, one_time
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState<string>('7d'); // History period filter
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all'); // History status filter
  const [historyPerPage, setHistoryPerPage] = useState<number>(999999); // History items per page
  const [taskViewTab, setTaskViewTab] = useState<string>('upcoming'); // Toggle between upcoming and history
  
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
    refetchInterval: 30000, // Refresh every 30s (was 10s)
    refetchOnWindowFocus: true
  });

  // Fetch tasks (auto-refresh every 5 seconds)
  const { data: tasksData, isLoading: tasksLoading, isFetching: tasksFetching, refetch: refetchTasks } = useQuery<{ tasks: Task[] }>({
    queryKey: ['/api/tasks'],
    refetchInterval: 20000, // Refresh every 20s (was 5s)
    refetchOnWindowFocus: true
  });

  // Fetch full task details (including images) when a task is selected
  const { data: selectedTaskDetail } = useQuery<{ task: any }>({
    queryKey: ['/api/tasks', selectedTask?.id, 'detail'],
    enabled: !!selectedTask?.id,
  });

  // Sync selectedTask with latest data from tasks query
  useEffect(() => {
    if (selectedTask && tasksData?.tasks) {
      const updatedTask = tasksData.tasks.find(t => t.id === selectedTask.id);
      if (updatedTask && updatedTask.status !== selectedTask.status) {
        setSelectedTask(updatedTask);
      }
    }
  }, [tasksData?.tasks, selectedTask?.id]);

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: { username: string; email: string; full_name: string; password: string; role: string; job_title?: string; department?: string; phone?: string }) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(getApiUrl('/api/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      department: newUserRole === 'serviser' ? 'eksterni' : undefined,
      job_title: newUserJobTitle || undefined,
      phone: newUserPhone || undefined
    });
  };

  const users = usersData?.users || [];
  const tasks = tasksData?.tasks || [];

  // Get report data — uskladjeno sa dashboard "Statistika realizacije" filterom
  const getReportTasks = () => {
    const rangeStartLocal = new Date(reportRange.start.getFullYear(), reportRange.start.getMonth(), reportRange.start.getDate());
    const rangeEndLocal = new Date(reportRange.end.getFullYear(), reportRange.end.getMonth(), reportRange.end.getDate());
    return tasks.filter(t => {
      if (t.status === 'cancelled') return false;
      // Za instance periodicnih zadataka koristi scheduled_for, za sve ostale created_at
      if (t.scheduled_for && t.parent_task_id) {
        const scheduledDate = new Date(t.scheduled_for);
        const scheduledLocal = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
        return scheduledLocal >= rangeStartLocal && scheduledLocal < rangeEndLocal;
      }
      const taskDate = new Date(t.created_at);
      const taskLocal = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
      return taskLocal >= rangeStartLocal && taskLocal < rangeEndLocal;
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
    
    const headers = ['Lokacija', 'Opis', 'Status', 'Prioritet', 'Kreirao', 'Dodijeljeno radniku', 'Datum kreiranja', 'Datum zavrsenja'];
    const rows = reportTasks.map(task => [
      task.location || '',
      task.description || '',
      task.status,
      task.priority || 'normal',
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
      'new': 'Novo',
      'pending': 'Na cekanju',
      'in_progress': 'U toku',
      'assigned_to_operator': 'Dodijeljeno operateru',
      'with_operator': 'Kod operatera',
      'with_sef': 'Kod sefa',
      'assigned_to_radnik': 'Dodijeljeno radniku',
      'with_external': 'Eksterna sluzba',
      'returned_to_operator': 'Vraceno operateru',
      'returned_to_sef': 'Vraceno sefu',
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
              <th>Lokacija</th>
              <th>Opis</th>
              <th>Status</th>
              <th>Prioritet</th>
              <th>Kreirao</th>
              <th>Dodijeljeno</th>
              <th>Datum kreiranja</th>
              <th>Datum zavrsenja</th>
            </tr>
          </thead>
          <tbody>
            ${reportTasks.map(task => `
              <tr>
                <td>${task.location || '-'}</td>
                <td>${task.description || '-'}</td>
                <td class="status-${task.status}">${statusLabels[task.status] || task.status}</td>
                <td class="${task.priority === 'urgent' ? 'priority-urgent' : ''}">${priorityLabels[task.priority || 'normal'] || task.priority}</td>
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {user?.fullName} - {user?.role}
          </p>
        </div>
        <Button 
          onClick={() => setAiChatOpen(true)}
          className="gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white text-sm sm:text-base w-full sm:w-auto"
          data-testid="button-ai-chat"
        >
          <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
          AI Analiza
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {usersLoading || tasksLoading ? (
          <>
            <Skeleton className="h-24 sm:h-32" />
            <Skeleton className="h-24 sm:h-32" />
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
        <TabsList className="h-9 w-full grid grid-cols-4">
          <TabsTrigger value="users" data-testid="tab-users" className="text-xs sm:text-sm px-1 sm:px-3">
            <Users className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Korisnici</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks" className="text-xs sm:text-sm px-1 sm:px-3">
            <ClipboardList className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Zadaci</span>
          </TabsTrigger>
          <TabsTrigger value="stats" data-testid="tab-stats" className="text-xs sm:text-sm px-1 sm:px-3">
            <BarChart3 className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Statistike</span>
          </TabsTrigger>
          <TabsTrigger value="locations" data-testid="tab-locations" className="text-xs sm:text-sm px-1 sm:px-3" onClick={() => navigate('/staff-locations')}>
            <MapPin className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Lokacije</span>
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
                        <SelectItem value="serviser">Treća lica</SelectItem>
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
                  {users.map((u) => {
                    const { label: lastSeenLabel, online } = formatLastSeen(u.last_seen ?? null);
                    return (
                    <div 
                      key={u.id} 
                      className="flex items-center justify-between p-3 border rounded-md"
                      data-testid={`user-item-${u.id}`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="relative mt-1 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-slate-300'}`}
                            data-testid={`status-dot-${u.id}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium leading-tight">{u.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {u.job_title || u.role}
                            {u.phone && ` | ${u.phone}`}
                          </p>
                          <p
                            className={`text-xs mt-0.5 ${online ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}
                            data-testid={`last-seen-${u.id}`}
                          >
                            {lastSeenLabel}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingUser(u)}
                        data-testid={`button-edit-user-${u.id}`}
                        className="flex-shrink-0 ml-2"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Izmeni
                      </Button>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-lg sm:text-xl font-medium">Upravljanje zadacima</h2>
            <CreateTaskDialog />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <Tabs value={taskViewTab} onValueChange={setTaskViewTab} className="w-full">
                <div className="flex flex-row items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <TabsList className="grid w-auto grid-cols-2 gap-1 bg-blue-100 p-1">
                      <TabsTrigger 
                        value="upcoming" 
                        data-testid="tab-upcoming-tasks"
                        className="flex items-center gap-2 px-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                      >
                        <Calendar className="h-4 w-4" />
                        Predstojeći
                      </TabsTrigger>
                      <TabsTrigger 
                        value="history" 
                        data-testid="tab-history-tasks"
                        className="flex items-center gap-2 px-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                      >
                        <History className="h-4 w-4" />
                        Istorija
                      </TabsTrigger>
                    </TabsList>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => refetchTasks()}
                      disabled={tasksFetching}
                      title="Osvježi listu"
                      data-testid="button-refresh-tasks"
                    >
                      <RefreshCw className={`h-4 w-4 ${tasksFetching ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>

                <TabsContent value="upcoming" className="mt-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { value: '1d', label: 'Danas' },
                      { value: '7d', label: '7 dana' },
                      { value: '30d', label: '30 dana' },
                      { value: '3m', label: '3 mjeseca' },
                      { value: '6m', label: '6 mjeseci' },
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
                    <div className="sm:ml-2 sm:border-l sm:pl-2">
                      <Select 
                        value={tasksTypeFilter} 
                        onValueChange={setTasksTypeFilter}
                      >
                        <SelectTrigger className="w-32 sm:w-36 h-8 sm:h-9 text-xs sm:text-sm" data-testid="select-type-filter">
                          <SelectValue placeholder="Tip" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Svi tipovi</SelectItem>
                          <SelectItem value="recurring">Periodicni</SelectItem>
                          <SelectItem value="one_time">Jednokratni</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:ml-2 sm:border-l sm:pl-2">
                      <Select 
                        value={tasksStatusFilter} 
                        onValueChange={setTasksStatusFilter}
                      >
                        <SelectTrigger className="w-32 sm:w-36 h-8 sm:h-9 text-xs sm:text-sm" data-testid="select-status-filter">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Svi statusi</SelectItem>
                          <SelectItem value="completed">Završeno</SelectItem>
                          <SelectItem value="in_progress">U toku</SelectItem>
                          <SelectItem value="pending">Na čekanju</SelectItem>
                          <SelectItem value="external">Eksterna</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { value: '1d', label: 'Danas' },
                      { value: '7d', label: '7 dana' },
                      { value: '30d', label: '30 dana' },
                      { value: '3m', label: '3 mjeseca' },
                      { value: '6m', label: '6 mjeseci' },
                    ].map((period) => (
                      <Button
                        key={period.value}
                        type="button"
                        variant={historyPeriodFilter === period.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setHistoryPeriodFilter(period.value)}
                        data-testid={`history-period-filter-${period.value}`}
                      >
                        {period.label}
                      </Button>
                    ))}
                    <div className="sm:ml-2 sm:border-l sm:pl-2">
                      <Select 
                        value={historyStatusFilter} 
                        onValueChange={setHistoryStatusFilter}
                      >
                        <SelectTrigger className="w-32 sm:w-36 h-8 sm:h-9 text-xs sm:text-sm" data-testid="select-history-status-filter">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Svi statusi</SelectItem>
                          <SelectItem value="completed">Završeno</SelectItem>
                          <SelectItem value="in_progress">U toku</SelectItem>
                          <SelectItem value="pending">Na čekanju</SelectItem>
                          <SelectItem value="external">Eksterna</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
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
                    {taskViewTab === 'upcoming' ? (
                      // Predstojeći zadaci - FUTURE periods + zadaci kreirani danas
                      (() => {
                        const getFilteredTasks = () => {
                          const now = new Date();
                          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                          let endDate: Date | null = null;
                          
                          // Isključi recurring templates - prikazujemo samo child taskove i jednokratne zadatke
                          const activeTasks = tasks.filter(task => {
                            // Recurring templates imaju is_recurring=true i nemaju parent_task_id
                            // Njih ne prikazujemo direktno, samo njihove child taskove
                            if (task.is_recurring && !task.parent_task_id) {
                              return false;
                            }
                            return true;
                          });
                          
                          let periodFiltered = activeTasks;
                          
                          if (tasksPeriodFilter === '1d') {
                            // "Danas" - prikaži zadatke koji su RELEVANTNI za danas:
                            // - Periodični (imaju scheduled_for): prikaži ako su zakazani za danas
                            // - Jednokratni (nemaju scheduled_for): prikaži ako su KREIRANI danas
                            // - Vraćeni zadaci: uvijek vidljivi bez obzira na datum
                            periodFiltered = activeTasks.filter(task => {
                              if (task.status === 'returned_to_operator' || task.status === 'returned_to_sef') {
                                return true;
                              }
                              if (task.scheduled_for) {
                                // Periodični/zakazani zadaci - prikaži SAMO ako su zakazani za danas
                                const scheduledDate = new Date(task.scheduled_for);
                                const isScheduledToday = scheduledDate >= todayStart && scheduledDate < todayEnd;
                                return isScheduledToday;
                              }
                              // Jednokratni zadaci bez zakazanog datuma - prikaži samo ako su kreirani danas
                              const createdDate = new Date(task.created_at);
                              return createdDate >= todayStart && createdDate < todayEnd;
                            });
                          } else {
                            switch (tasksPeriodFilter) {
                              case '7d':
                                endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                                break;
                              case '30d':
                                endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                                break;
                              case '3m':
                                endDate = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
                                break;
                              case '6m':
                                endDate = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
                                break;
                            }
                            
                            if (endDate) {
                              periodFiltered = activeTasks.filter(task => {
                                // Vraćeni zadaci su uvijek vidljivi bez obzira na datum kreiranja
                                if (task.status === 'returned_to_operator' || task.status === 'returned_to_sef') {
                                  return true;
                                }
                                if (task.scheduled_for) {
                                  // Periodični/zakazani zadaci - prikaži ako su zakazani u periodu
                                  const scheduledDate = new Date(task.scheduled_for);
                                  return scheduledDate >= todayStart && scheduledDate <= endDate!;
                                }
                                
                                // Jednokratni zadaci - prikaži ako su kreirani u periodu
                                const createdDate = new Date(task.created_at);
                                return createdDate >= todayStart && createdDate <= endDate!;
                              });
                            }
                          }
                          
                          // Filter po tipu zadatka
                          let typeFiltered = periodFiltered;
                          if (tasksTypeFilter === 'recurring') {
                            typeFiltered = periodFiltered.filter(task => task.parent_task_id || task.is_recurring);
                          } else if (tasksTypeFilter === 'one_time') {
                            typeFiltered = periodFiltered.filter(task => !task.parent_task_id && !task.is_recurring);
                          }
                          
                          if (tasksStatusFilter === 'all') {
                            return typeFiltered;
                          }
                          
                          return typeFiltered.filter(task => {
                            switch (tasksStatusFilter) {
                              case 'completed':
                                return task.status === 'completed';
                              case 'in_progress':
                                // Nezavrseni zadaci koje je majstor PRIHVATIO (potvrdio prijem)
                                return !!(task as any).receipt_confirmed_at &&
                                       task.status !== 'completed' &&
                                       task.status !== 'cancelled';
                              case 'pending':
                                // Nezavrseni zadaci koje majstor JOS NIJE prihvatio
                                return !(task as any).receipt_confirmed_at &&
                                       task.status !== 'completed' &&
                                       task.status !== 'cancelled' &&
                                       task.status !== 'with_external';
                              case 'external':
                                return task.status === 'with_external';
                              default:
                                return true;
                            }
                          });
                        };
                        
                        const filteredTasks = getFilteredTasks();
                        
                        if (filteredTasks.length === 0) {
                          return (
                            <p className="text-center text-muted-foreground py-8">
                              Nema predstojećih zadataka
                            </p>
                          );
                        }
                        
                        return filteredTasks
                          .sort((a, b) => {
                            const dateA = a.scheduled_for ? new Date(a.scheduled_for) : new Date(a.created_at);
                            const dateB = b.scheduled_for ? new Date(b.scheduled_for) : new Date(b.created_at);
                            return dateA.getTime() - dateB.getTime();
                          })
                          .slice(0, tasksPerPage)
                          .map((task) => {
                          const getStatusBadge = (status: string) => {
                            if (status === 'completed') {
                              return <Badge variant="default" className="bg-green-600">Završeno</Badge>;
                            } else if (status === 'assigned_to_radnik' || status === 'with_operator' || status === 'in_progress') {
                              return <Badge variant="secondary">U toku</Badge>;
                            } else if (status === 'returned_to_operator' || status === 'returned_to_sef') {
                              return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">Vraćeno</Badge>;
                            } else if (status === 'with_external') {
                              return <Badge variant="outline">Eksterna firma</Badge>;
                            } else if (status === 'new') {
                              return <Badge variant="outline">Novo</Badge>;
                            } else if (status === 'with_sef') {
                              return <Badge variant="secondary">Sa šefom</Badge>;
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
                              className="p-3 sm:p-4 border rounded-md hover-elevate cursor-pointer"
                              data-testid={`task-item-${task.id}`}
                              onClick={() => setSelectedTask(task)}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-xs sm:text-sm text-muted-foreground">
                                    {task.scheduled_for ? (
                                      <span>Zakazano: {formatDate(task.scheduled_for)}</span>
                                    ) : (
                                      formatDate(task.created_at)
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1 items-end">
                                    {getStatusBadge(task.status)}
                                    {(task.parent_task_id || task.is_recurring) ? (
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${task.recurrence_pattern === 'cancelled' 
                                          ? 'bg-red-50 border-red-200 text-red-700' 
                                          : 'bg-purple-50 border-purple-200 text-purple-700'}`}
                                      >
                                        Periodicni{task.recurrence_pattern === 'cancelled' && ' (Ukinut)'}
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
                                      <div className="flex items-start gap-1.5 flex-wrap">
                                        <span>Dodeljeno:</span>
                                        {(() => {
                                          const names = task.assigned_to_name.split(',').map((n: string) => n.trim()).filter(Boolean);
                                          const confirmedSet = new Set(((task as any).receipt_confirmed_by_name || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean));
                                          const showPending = task.status !== 'cancelled';
                                          return names.map((name: string, idx: number) => {
                                            const isConfirmed = confirmedSet.has(name.toLowerCase());
                                            const tooltipText = task.status === 'completed' ? 'Obavio zadatak' : 'Potvrdio prijem';
                                            return (
                                              <span key={idx} className="inline-flex items-center gap-1">
                                                <span>{name}</span>
                                                {isConfirmed ? (
                                                  <CheckCircle className="w-4 h-4 text-green-600" data-testid={`status-receipt-confirmed-${task.id}-${idx}`}>
                                                    <title>{tooltipText}</title>
                                                  </CheckCircle>
                                                ) : showPending ? (
                                                  <Clock className="w-4 h-4 text-orange-500" data-testid={`status-receipt-pending-${task.id}-${idx}`}>
                                                    <title>Nije potvrdio prijem</title>
                                                  </Clock>
                                                ) : null}
                                                {idx < names.length - 1 && <span>,</span>}
                                              </span>
                                            );
                                          });
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      // Istorija - PAST periods (ISKLJUČUJE današnje zadatke - oni idu u Predstojeći)
                      (() => {
                        const getHistoryTasks = () => {
                          const now = new Date();
                          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                          let startDate: Date | null = null;
                          
                          // Isključi recurring templates - prikazujemo samo child taskove i jednokratne zadatke
                          const activeTasks = tasks.filter(task => {
                            if (task.is_recurring && !task.parent_task_id) {
                              return false;
                            }
                            return true;
                          });
                          
                          // Odredi relevantni datum za svaki zadatak
                          const getTaskDate = (task: any): Date => {
                            // Za završene zadatke - koristi completed_at
                            if (task.status === 'completed' && task.completed_at) {
                              return new Date(task.completed_at);
                            }
                            // Za child taskove periodičnih zadataka - koristi scheduled_for (datum perioda)
                            if (task.scheduled_for && task.parent_task_id) {
                              return new Date(task.scheduled_for);
                            }
                            // Za sve ostale (jednokratne) - koristi created_at
                            return new Date(task.created_at);
                          };
                          
                          // Odredi početni datum na osnovu izabranog perioda
                          switch (historyPeriodFilter) {
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
                            default:
                              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                          }
                          
                          // Filtriraj zadatke koji su u izabranom periodu
                          // Završeni zadaci se prikazuju u istoriji (uključujući danas završene)
                          // Nezavršeni zadaci se prikazuju samo ako su kreirani/zakazani pre danas
                          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                          let periodFiltered = activeTasks.filter(task => {
                            const taskDate = getTaskDate(task);
                            // Koristi LOKALNE datume (ne UTC) - izbjegava timezone pomak za UTC+ zone
                            const taskLocalDate = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
                            const startLocalDate = new Date(startDate!.getFullYear(), startDate!.getMonth(), startDate!.getDate());
                            const todayStartLocal = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate());
                            const todayEndLocal = new Date(todayEnd.getFullYear(), todayEnd.getMonth(), todayEnd.getDate());
                            // Završeni zadaci - prikaži ako su završeni u izabranom periodu (uključujući danas)
                            if (task.status === 'completed') {
                              return taskLocalDate >= startLocalDate && taskLocalDate < todayEndLocal;
                            }
                            // Nezavršeni zadaci - prikaži samo ako su kreirani/zakazani pre danas
                            return taskLocalDate >= startLocalDate && taskLocalDate < todayStartLocal;
                          });
                          
                          if (historyStatusFilter === 'all') {
                            return periodFiltered;
                          }
                          
                          return periodFiltered.filter(task => {
                            switch (historyStatusFilter) {
                              case 'completed':
                                return task.status === 'completed';
                              case 'in_progress':
                                // Nezavrseni zadaci koje je majstor PRIHVATIO (potvrdio prijem)
                                return !!(task as any).receipt_confirmed_at &&
                                       task.status !== 'completed' &&
                                       task.status !== 'cancelled';
                              case 'pending':
                                // Nezavrseni zadaci koje majstor JOS NIJE prihvatio
                                return !(task as any).receipt_confirmed_at &&
                                       task.status !== 'completed' &&
                                       task.status !== 'cancelled' &&
                                       task.status !== 'with_external';
                              case 'external':
                                return task.status === 'with_external';
                              default:
                                return true;
                            }
                          });
                        };
                        
                        const historyTasks = getHistoryTasks();
                        
                        if (historyTasks.length === 0) {
                          return (
                            <p className="text-center text-muted-foreground py-8">
                              Nema zadataka u istoriji
                            </p>
                          );
                        }
                        
                        return historyTasks
                          .sort((a, b) => {
                            const dateA = a.completed_at ? new Date(a.completed_at) : new Date(a.created_at);
                            const dateB = b.completed_at ? new Date(b.completed_at) : new Date(b.created_at);
                            return dateB.getTime() - dateA.getTime();
                          })
                          .slice(0, historyPerPage)
                          .map((task) => {
                          const getStatusBadge = (status: string) => {
                            if (status === 'completed') {
                              return <Badge variant="default" className="bg-green-600">Završeno</Badge>;
                            } else if (status === 'assigned_to_radnik' || status === 'with_operator' || status === 'in_progress') {
                              return <Badge variant="secondary">U toku</Badge>;
                            } else if (status === 'returned_to_operator' || status === 'returned_to_sef') {
                              return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">Vraćeno</Badge>;
                            } else if (status === 'with_external') {
                              return <Badge variant="outline">Eksterna firma</Badge>;
                            } else if (status === 'new') {
                              return <Badge variant="outline">Novo</Badge>;
                            } else if (status === 'with_sef') {
                              return <Badge variant="secondary">Sa šefom</Badge>;
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
                              data-testid={`history-task-item-${task.id}`}
                              onClick={() => setSelectedTask(task)}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                                    {task.completed_at ? (
                                      <span>Završeno: {formatDate(task.completed_at)}</span>
                                    ) : task.scheduled_for ? (
                                      <span>Zakazano: {formatDate(task.scheduled_for)}</span>
                                    ) : (
                                      formatDate(task.created_at)
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1 items-end">
                                    {getStatusBadge(task.status)}
                                    {(task.parent_task_id || task.is_recurring) ? (
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${task.recurrence_pattern === 'cancelled' 
                                          ? 'bg-red-50 border-red-200 text-red-700' 
                                          : 'bg-purple-50 border-purple-200 text-purple-700'}`}
                                      >
                                        Periodicni{task.recurrence_pattern === 'cancelled' && ' (Ukinut)'}
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
                                      <div className="flex items-start gap-1.5 flex-wrap">
                                        <span>Dodeljeno:</span>
                                        {(() => {
                                          const names = task.assigned_to_name.split(',').map((n: string) => n.trim()).filter(Boolean);
                                          const confirmedSet = new Set(((task as any).receipt_confirmed_by_name || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean));
                                          const showPending = task.status !== 'cancelled';
                                          return names.map((name: string, idx: number) => {
                                            const isConfirmed = confirmedSet.has(name.toLowerCase());
                                            const tooltipText = task.status === 'completed' ? 'Obavio zadatak' : 'Potvrdio prijem';
                                            return (
                                              <span key={idx} className="inline-flex items-center gap-1">
                                                <span>{name}</span>
                                                {isConfirmed ? (
                                                  <CheckCircle className="w-4 h-4 text-green-600" data-testid={`status-receipt-confirmed-${task.id}-${idx}`}>
                                                    <title>{tooltipText}</title>
                                                  </CheckCircle>
                                                ) : showPending ? (
                                                  <Clock className="w-4 h-4 text-orange-500" data-testid={`status-receipt-pending-${task.id}-${idx}`}>
                                                    <title>Nije potvrdio prijem</title>
                                                  </Clock>
                                                ) : null}
                                                {idx < names.length - 1 && <span>,</span>}
                                              </span>
                                            );
                                          });
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()
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
                  // Filter tasks - za zakazane zadatke koristi scheduled_for, za ostale created_at
                  // Koristi LOKALNE datume (ne UTC) da izbjegnemo timezone pomak za UTC+ zone
                  // Iskljuci otkazane zadatke iz ukupne brojke (ne kvare stopu realizacije)
                  const periodTasks = tasks.filter(t => {
                    if (t.status === 'cancelled') return false;
                    const rangeStartLocal = new Date(statsRange.start.getFullYear(), statsRange.start.getMonth(), statsRange.start.getDate());
                    const rangeEndLocal = new Date(statsRange.end.getFullYear(), statsRange.end.getMonth(), statsRange.end.getDate());
                    // Za zakazane zadatke (child tasks od recurring) koristi scheduled_for
                    if (t.scheduled_for && t.parent_task_id) {
                      const scheduledDate = new Date(t.scheduled_for);
                      const scheduledLocal = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
                      return scheduledLocal >= rangeStartLocal && scheduledLocal < rangeEndLocal;
                    }
                    // Za obicne zadatke koristi created_at (u lokalnom vremenu)
                    const taskDate = new Date(t.created_at);
                    const taskLocal = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
                    return taskLocal >= rangeStartLocal && taskLocal < rangeEndLocal;
                  });
                  const completedTasks = periodTasks.filter(t => t.status === 'completed');
                  const inProgressTasks = periodTasks.filter(t => 
                    t.status === 'assigned_to_radnik' || 
                    t.status === 'with_operator' || 
                    t.status === 'in_progress' ||
                    t.status === 'returned_to_operator' ||
                    t.status === 'returned_to_sef'
                  );
                  const pendingTasks = periodTasks.filter(t => 
                    t.status === 'new' || 
                    t.status === 'pending' || 
                    t.status === 'assigned_to_operator' ||
                    t.status === 'with_sef'
                  );
                  const externalTasks = periodTasks.filter(t => t.status === 'with_external');
                  const receiptConfirmedTasks = periodTasks.filter(t => (t as any).receipt_confirmed_at);
                  const receiptUnconfirmedTasks = periodTasks.filter(t => 
                    !(t as any).receipt_confirmed_at && 
                    t.status !== 'completed' && 
                    t.status !== 'cancelled'
                  );

                  const completionRate = periodTasks.length > 0 
                    ? Math.round((completedTasks.length / periodTasks.length) * 100) 
                    : 0;

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 border rounded-md bg-muted/30">
                          <p className="text-xs text-muted-foreground">Izabrani period</p>
                          <p className="text-xl font-bold mt-0.5">{periodTasks.length}</p>
                          <p className="text-xs text-muted-foreground">Ukupno</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'receipt_confirmed' ? null : 'receipt_confirmed')}
                          className={`p-3 border rounded-md bg-muted/30 text-left cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedStatusFilter === 'receipt_confirmed' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                          }`}
                          data-testid="stat-receipt-confirmed"
                        >
                          <p className="text-xs text-muted-foreground">Potvrđen prijem</p>
                          <p className="text-xl font-bold text-blue-600 mt-0.5">{receiptConfirmedTasks.length}</p>
                          <p className="text-xs text-muted-foreground">Majstor primio</p>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'receipt_unconfirmed' ? null : 'receipt_unconfirmed')}
                          className={`p-3 border rounded-md bg-muted/30 text-left cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedStatusFilter === 'receipt_unconfirmed' ? 'ring-2 ring-red-500 bg-red-50' : ''
                          }`}
                          data-testid="stat-receipt-unconfirmed"
                        >
                          <p className="text-xs text-muted-foreground">Nepotvrđen prijem</p>
                          <p className="text-xl font-bold text-red-600 mt-0.5">{receiptUnconfirmedTasks.length}</p>
                          <p className="text-xs text-muted-foreground">Majstor nije primio</p>
                        </button>
                        <div className="p-3 border rounded-md bg-muted/30">
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
                              {selectedStatusFilter === 'receipt_confirmed' && 'Zadaci - Majstor potvrdio prijem'}
                              {selectedStatusFilter === 'receipt_unconfirmed' && 'Zadaci - Majstor nije potvrdio prijem'}
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
                                } else if (selectedStatusFilter === 'receipt_confirmed') {
                                  filteredTasks = receiptConfirmedTasks;
                                } else if (selectedStatusFilter === 'receipt_unconfirmed') {
                                  filteredTasks = receiptUnconfirmedTasks;
                                } else {
                                  // Bez filtera - prikaži sve zadatke iz perioda
                                  filteredTasks = periodTasks;
                                }

                                if (filteredTasks.length === 0) {
                                  return (
                                    <p className="text-center text-muted-foreground py-6 text-sm">
                                      Nema zadataka za izabrani period
                                    </p>
                                  );
                                }

                                return filteredTasks
                                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                  .map((task) => {
                                    const getStatusBadge = (status: string) => {
                                      if (status === 'completed') {
                                        return <Badge variant="default" className="bg-green-600">Završeno</Badge>;
                                      } else if (status === 'assigned_to_radnik' || status === 'with_operator' || status === 'in_progress') {
                                        return <Badge variant="secondary">U toku</Badge>;
                                      } else if (status === 'returned_to_operator' || status === 'returned_to_sef') {
                                        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">Vraćeno</Badge>;
                                      } else if (status === 'with_external') {
                                        return <Badge variant="outline">Eksterna firma</Badge>;
                                      } else if (status === 'new') {
                                        return <Badge variant="outline">Novo</Badge>;
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
                                              <Badge 
                                                variant="outline" 
                                                className={`text-xs ${task.recurrence_pattern === 'cancelled' 
                                                  ? 'bg-red-50 border-red-200 text-red-700' 
                                                  : 'bg-purple-50 border-purple-200 text-purple-700'}`}
                                              >
                                                Periodicni{task.recurrence_pattern === 'cancelled' && ' (Ukinut)'}
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-600">
                                                Jednokratan
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <h4 className="font-medium text-sm">{task.title}</h4>
                                        {task.description && (
                                          <p className="text-xs text-foreground mt-1 whitespace-pre-wrap break-words">{task.description}</p>
                                        )}
                                        {task.created_by_name && (
                                          <p className="text-xs text-muted-foreground mt-1">Prijavio: {task.created_by_name}</p>
                                        )}
                                        {task.assigned_to_name && (
                                          <div className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5 flex-wrap">
                                            <span>{task.status === 'completed' ? 'Izvršio' : 'Dodijeljeno'}:</span>
                                            {(() => {
                                              const names = task.assigned_to_name.split(',').map((n: string) => n.trim()).filter(Boolean);
                                              const confirmedSet = new Set(((task as any).receipt_confirmed_by_name || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean));
                                              const showPending = task.status !== 'cancelled';
                                              return names.map((name: string, idx: number) => {
                                                const isConfirmed = confirmedSet.has(name.toLowerCase());
                                                const tooltipText = task.status === 'completed' ? 'Obavio zadatak' : 'Potvrdio prijem';
                                                return (
                                                  <span key={idx} className="inline-flex items-center gap-1">
                                                    <span>{name}</span>
                                                    {isConfirmed ? (
                                                      <CheckCircle className="w-3.5 h-3.5 text-green-600" data-testid={`status-receipt-confirmed-${task.id}-${idx}`}>
                                                        <title>{tooltipText}</title>
                                                      </CheckCircle>
                                                    ) : showPending ? (
                                                      <Clock className="w-3.5 h-3.5 text-orange-500" data-testid={`status-receipt-pending-${task.id}-${idx}`}>
                                                        <title>Nije potvrdio prijem</title>
                                                      </Clock>
                                                    ) : null}
                                                    {idx < names.length - 1 && <span>,</span>}
                                                  </span>
                                                );
                                              });
                                            })()}
                                          </div>
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
                  // Koristimo istu logiku kao getReportTasks i dashboard "Statistika realizacije"
                  const periodTasks = getReportTasks();
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
              <CardTitle>Analiza vremena prijave zadataka <span className="text-sm font-normal text-muted-foreground">(bez periodicnih zadataka)</span></CardTitle>
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
                  // Filtriraj samo jednokratne zadatke (bez periodicnih/autogenerisanih)
                  // Koristimo lokalni datum za poredjenje jer PeriodPicker generise lokalne datume
                  const periodTasks = tasks.filter(t => {
                    if (t.is_recurring || t.parent_task_id) {
                      return false;
                    }
                    const taskDate = new Date(t.created_at);
                    // Koristimo lokalni datum zadatka (ne UTC) jer range datumi su lokalni
                    const taskLocalMidnight = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
                    const rangeStart = new Date(analysisRange.start.getFullYear(), analysisRange.start.getMonth(), analysisRange.start.getDate());
                    const rangeEnd = new Date(analysisRange.end.getFullYear(), analysisRange.end.getMonth(), analysisRange.end.getDate());
                    return taskLocalMidnight >= rangeStart && taskLocalMidnight < rangeEnd;
                  });

                  // Grupiranje po satima - prikazi sve sate 00-24h
                  const hourIntervals: { [key: string]: number } = {};
                  
                  for (let i = 0; i < 24; i++) {
                    const startHour = i.toString().padStart(2, '0');
                    const endHour = (i + 1 === 24 ? 0 : i + 1).toString().padStart(2, '0');
                    hourIntervals[`${startHour}-${i + 1 === 24 ? '24' : endHour}`] = 0;
                  }

                  periodTasks.forEach(task => {
                    const hour = new Date(task.created_at).getHours();
                    const startHour = hour.toString().padStart(2, '0');
                    const endHour = (hour + 1 === 24 ? '24' : (hour + 1).toString().padStart(2, '0'));
                    const interval = `${startHour}-${endHour}`;
                    if (hourIntervals[interval] !== undefined) {
                      hourIntervals[interval]++;
                    }
                  });

                  const maxCount = Math.max(...Object.values(hourIntervals), 1);

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Distribucija po satu prijema (24h)
                        </p>
                        <p className="text-xs font-medium text-foreground">
                          Ukupno: {periodTasks.length} zadataka
                        </p>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(hourIntervals).map(([interval, count]) => (
                          <div key={interval} className="flex items-center gap-2">
                            <span className="text-xs w-12 text-muted-foreground font-mono">{interval}</span>
                            <div className="flex-1 bg-muted rounded h-5 relative overflow-hidden">
                              <div 
                                className="bg-primary h-full flex items-center px-1.5 text-primary-foreground text-xs font-medium transition-all"
                                style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? '20px' : '0' }}
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
          {/* Analiza po majstorima */}
          <Card>
            <CardHeader className="space-y-3 pb-4">
              <CardTitle>Analiza po majstorima <span className="text-sm font-normal text-muted-foreground">(za izabrani period)</span></CardTitle>
              <PeriodPicker
                value={analysisRange}
                onChange={setAnalysisRange}
                granularity={analysisGranularity}
                onGranularityChange={setAnalysisGranularity}
                data-testid="period-picker-workers"
              />
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <Skeleton className="h-64" />
              ) : (
                (() => {
                  const rangeStart = new Date(analysisRange.start.getFullYear(), analysisRange.start.getMonth(), analysisRange.start.getDate());
                  const rangeEnd = new Date(analysisRange.end.getFullYear(), analysisRange.end.getMonth(), analysisRange.end.getDate());

                  const periodTasks = tasks.filter(t => {
                    if (t.status === 'cancelled') return false;
                    if (!t.assigned_to_name) return false;
                    const ref = (t.scheduled_for && t.parent_task_id) ? new Date(t.scheduled_for) : new Date(t.created_at);
                    const refLocal = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
                    return refLocal >= rangeStart && refLocal < rangeEnd;
                  });

                  type WorkerStats = { completed: number; returned: number; pending: number; total: number };
                  const byWorker: Record<string, WorkerStats> = {};

                  periodTasks.forEach(task => {
                    const names = (task.assigned_to_name || '').split(',').map(n => n.trim()).filter(Boolean);
                    const isReturned = task.status === 'returned_to_sef' || task.status === 'returned_to_operator';
                    const isCompleted = task.status === 'completed';
                    const confirmedSet = new Set(((task as any).receipt_confirmed_by_name || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean));

                    names.forEach(name => {
                      if (!byWorker[name]) byWorker[name] = { completed: 0, returned: 0, pending: 0, total: 0 };
                      // Za zavrsene zadatke - upisi samo onome ko je potvrdio prijem (obavio posao)
                      if (isCompleted) {
                        if (confirmedSet.has(name.toLowerCase())) {
                          byWorker[name].completed++;
                          byWorker[name].total++;
                        }
                      } else if (isReturned) {
                        byWorker[name].returned++;
                        byWorker[name].total++;
                      } else {
                        byWorker[name].pending++;
                        byWorker[name].total++;
                      }
                    });
                  });

                  const workers = Object.entries(byWorker)
                    .filter(([, s]) => s.total > 0)
                    .sort((a, b) => b[1].total - a[1].total);

                  const maxTotal = Math.max(...workers.map(([, s]) => s.total), 1);
                  const totalAll = workers.reduce((acc, [, s]) => ({
                    completed: acc.completed + s.completed,
                    returned: acc.returned + s.returned,
                    pending: acc.pending + s.pending,
                  }), { completed: 0, returned: 0, pending: 0 });

                  return (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded bg-green-500" />
                          <span>Zavrseno: <strong>{totalAll.completed}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded bg-orange-500" />
                          <span>Vraceno: <strong>{totalAll.returned}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded bg-red-500" />
                          <span>Nezavrseno: <strong>{totalAll.pending}</strong></span>
                        </div>
                      </div>

                      {workers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6 text-xs">
                          Nema dodijeljenih zadataka za izabrani period
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {workers.map(([name, s]) => {
                            const widthPct = (s.total / maxTotal) * 100;
                            const completedPct = s.total > 0 ? (s.completed / s.total) * 100 : 0;
                            const returnedPct = s.total > 0 ? (s.returned / s.total) * 100 : 0;
                            const pendingPct = s.total > 0 ? (s.pending / s.total) * 100 : 0;
                            return (
                              <div key={name} className="space-y-1" data-testid={`worker-stats-${name}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-medium truncate">{name}</span>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {s.completed} / {s.returned} / {s.pending} <span className="text-foreground font-medium">({s.total})</span>
                                  </span>
                                </div>
                                <div className="bg-muted rounded h-5 overflow-hidden" style={{ width: `${widthPct}%`, minWidth: '60px' }}>
                                  <div className="flex h-full">
                                    {s.completed > 0 && (
                                      <div className="bg-green-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${completedPct}%` }} title={`Zavrseno: ${s.completed}`}>
                                        {completedPct >= 12 ? s.completed : ''}
                                      </div>
                                    )}
                                    {s.returned > 0 && (
                                      <div className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${returnedPct}%` }} title={`Vraceno: ${s.returned}`}>
                                        {returnedPct >= 12 ? s.returned : ''}
                                      </div>
                                    )}
                                    {s.pending > 0 && (
                                      <div className="bg-red-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${pendingPct}%` }} title={`Nezavrseno: ${s.pending}`}>
                                        {pendingPct >= 12 ? s.pending : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
          time: selectedTask.created_at || new Date().toISOString(),
          fromName: selectedTask.created_by_name || '',
          from: selectedTask.created_by || '',
          images: selectedTaskDetail?.task?.images ?? selectedTask.images,
          worker_images: selectedTaskDetail?.task?.worker_images ?? selectedTask.worker_images,
          assigned_to_name: selectedTask.assigned_to_name,
          parent_task_id: selectedTask.parent_task_id,
          is_recurring: selectedTask.is_recurring,
          recurrence_pattern: selectedTask.recurrence_pattern,
          scheduled_for: selectedTask.scheduled_for
        } : null}
        currentUserRole={user?.role}
        onEdit={(taskId) => {
          setEditTaskId(taskId);
          setEditTaskOpen(true);
        }}
      />
      <EditTaskDialog
        open={editTaskOpen}
        onOpenChange={setEditTaskOpen}
        taskId={editTaskId}
      />

      {/* AI Chat Dialog */}
      <Dialog open={aiChatOpen} onOpenChange={setAiChatOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Analiza Podataka
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Pitajte AI o trendovima, statistikama i preporukama za unapredenje rada
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <AdminAIChat />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
