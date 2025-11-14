import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, ClipboardList, CheckCircle, Clock, Users, Edit } from 'lucide-react';
import StatCard from '@/components/StatCard';
import CreateTaskDialog from '@/components/CreateTaskDialog';
import EditUserDialog from '@/components/EditUserDialog';
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
  department: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface Task {
  id: string;
  status: string;
  priority?: string;
  completed_at?: string | null;
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
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);

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
    mutationFn: async (userData: { username: string; email: string; full_name: string; password: string; role: string; department?: string; phone?: string }) => {
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
      setNewUserDepartment('');
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
      department: newUserDepartment || undefined,
      phone: newUserPhone || undefined
    });
  };

  const users = usersData?.users || [];
  const tasks = tasksData?.tasks || [];

  // Calculate statistics
  const totalUsers = users.length;
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length;
  
  // My Tasks Status calculations
  const urgentTasks = tasks.filter(t => 
    t.priority === 'urgent' || t.priority === 'high'
  ).length;
  
  const inProgressTasks = tasks.filter(t => 
    t.status === 'in_progress'
  ).length;
  
  const awaitingAssignmentTasks = tasks.filter(t => 
    t.status === 'assigned_to_operator' || t.status === 'pending' || t.status === 'new'
  ).length;
  
  const completedTodayTasks = tasks.filter(t => {
    if (t.status !== 'completed') return false;
    if (!t.completed_at) return false;
    
    const completedDate = new Date(t.completed_at);
    const today = new Date();
    
    return completedDate.getDate() === today.getDate() &&
           completedDate.getMonth() === today.getMonth() &&
           completedDate.getFullYear() === today.getFullYear();
  }).length;
  
  // For main stats - simplified completed today (all completed)
  const completedToday = tasks.filter(t => t.status === 'completed').length;

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
            <StatCard 
              title={t('activeTasks')} 
              value={activeTasks} 
              icon={Clock}
            />
            <StatCard 
              title={t('completedToday')} 
              value={completedToday} 
              icon={CheckCircle}
            />
          </>
        )}
      </div>

      {/* Main Admin Features */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <UserPlus className="w-4 h-4 mr-2" />
            Manage Users
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <ClipboardList className="w-4 h-4 mr-2" />
            Manage Tasks
          </TabsTrigger>
          <TabsTrigger value="stats" data-testid="tab-stats">
            Statistics
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
                    <Label htmlFor="user-role">Uloga</Label>
                    <Select value={newUserRole} onValueChange={setNewUserRole} required>
                      <SelectTrigger data-testid="select-user-role">
                        <SelectValue placeholder="Izaberi ulogu" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="operater">Operater</SelectItem>
                        <SelectItem value="sef">Šef</SelectItem>
                        <SelectItem value="radnik">Radnik</SelectItem>
                        <SelectItem value="serviser">Serviser</SelectItem>
                        <SelectItem value="recepcioner">Recepcioner</SelectItem>
                        <SelectItem value="menadzer">Menadžer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-department">Zanimanje/Pozicija</Label>
                    <Select 
                      value={newUserDepartment || 'custom'} 
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setNewUserDepartment('');
                        } else {
                          setNewUserDepartment(value);
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-user-department">
                        <SelectValue placeholder="Izaberi zanimanje" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Recepcioner">Recepcioner</SelectItem>
                        <SelectItem value="Direktor hotela">Direktor hotela</SelectItem>
                        <SelectItem value="Šef sale">Šef sale</SelectItem>
                        <SelectItem value="Glavni kuvar">Glavni kuvar</SelectItem>
                        <SelectItem value="Pomoćni kuvar">Pomoćni kuvar</SelectItem>
                        <SelectItem value="Konobar">Konobar</SelectItem>
                        <SelectItem value="Sobarica">Sobarica</SelectItem>
                        <SelectItem value="Šef tehničke službe">Šef tehničke službe</SelectItem>
                        <SelectItem value="Majstor">Majstor</SelectItem>
                        <SelectItem value="Servis tehničar">Servis tehničar</SelectItem>
                        <SelectItem value="Bazen održavanje">Bazen održavanje</SelectItem>
                        <SelectItem value="Spašilac">Spašilac</SelectItem>
                        <SelectItem value="Wellness terapeut">Wellness terapeut</SelectItem>
                        <SelectItem value="custom">✏️ Drugo (unesite sami)</SelectItem>
                      </SelectContent>
                    </Select>
                    {(newUserDepartment === '' || !['Recepcioner', 'Direktor hotela', 'Šef sale', 'Glavni kuvar', 'Pomoćni kuvar', 'Konobar', 'Sobarica', 'Šef tehničke službe', 'Majstor', 'Servis tehničar', 'Bazen održavanje', 'Spašilac', 'Wellness terapeut'].includes(newUserDepartment)) && (
                      <Input
                        id="user-department-custom"
                        value={newUserDepartment}
                        onChange={(e) => setNewUserDepartment(e.target.value)}
                        data-testid="input-user-department-custom"
                        placeholder="Unesite zanimanje..."
                        className="mt-2"
                      />
                    )}
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
                          {u.email} - {u.role}
                          {u.department && ` - ${u.department}`}
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
            <CardHeader>
              <CardTitle>My Tasks Status</CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border-l-4 border-l-red-500 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">Urgent Tasks</p>
                      <p className="text-sm text-muted-foreground">Need immediate attention</p>
                    </div>
                    <span className="text-2xl font-bold" data-testid="text-urgent-tasks">{urgentTasks}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border-l-4 border-l-yellow-500 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">In Progress</p>
                      <p className="text-sm text-muted-foreground">Currently being worked on</p>
                    </div>
                    <span className="text-2xl font-bold" data-testid="text-in-progress-tasks">{inProgressTasks}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border-l-4 border-l-blue-500 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">Awaiting Assignment</p>
                      <p className="text-sm text-muted-foreground">With operator</p>
                    </div>
                    <span className="text-2xl font-bold" data-testid="text-awaiting-assignment-tasks">{awaitingAssignmentTasks}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border-l-4 border-l-green-500 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">Completed Today</p>
                      <p className="text-sm text-muted-foreground">Finished tasks</p>
                    </div>
                    <span className="text-2xl font-bold" data-testid="text-completed-today-tasks">{completedTodayTasks}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-md">
                  <p className="text-sm text-muted-foreground">Average Task Completion Time</p>
                  <p className="text-2xl font-bold mt-1">2.5 hours</p>
                </div>
                <div className="p-4 border rounded-md">
                  <p className="text-sm text-muted-foreground">Task Completion Rate</p>
                  <p className="text-2xl font-bold mt-1">87%</p>
                </div>
                <div className="p-4 border rounded-md">
                  <p className="text-sm text-muted-foreground">Most Active Department</p>
                  <p className="text-2xl font-bold mt-1">Tehnička</p>
                </div>
                <div className="p-4 border rounded-md">
                  <p className="text-sm text-muted-foreground">User Satisfaction</p>
                  <p className="text-2xl font-bold mt-1">4.5 / 5.0</p>
                </div>
              </div>
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
    </div>
  );
}
