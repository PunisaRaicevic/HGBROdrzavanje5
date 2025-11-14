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
  title: string;
  status: string;
  priority?: string;
  created_at: string;
  created_by_name?: string;
  assigned_to_name?: string;
  location?: string;
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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tasksPerPage, setTasksPerPage] = useState<number>(10);

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
      phone: newUserPhone || undefined
    });
  };

  const users = usersData?.users || [];
  const tasks = tasksData?.tasks || [];

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
                    <Input
                      id="user-role"
                      placeholder="Npr: Admin, Operater, Šef, Radnik..."
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      required
                      data-testid="input-user-role"
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
                          {u.email} - {u.role}
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
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
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
                    {tasks
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
                            className="p-4 border rounded-md hover-elevate"
                            data-testid={`task-item-${task.id}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-base mb-2">{task.title}</h3>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  {task.created_by_name && (
                                    <p>Prijavio: {task.created_by_name}</p>
                                  )}
                                  {task.assigned_to_name && (
                                    <p>Dodeljeno: {task.assigned_to_name}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                {getStatusBadge(task.status)}
                                <div className="text-sm text-muted-foreground whitespace-nowrap">
                                  {formatDate(task.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    
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
