import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { getApiUrl } from '@/lib/apiUrl';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  CheckCircle, XCircle, Camera, Send, ClipboardList, MapPin, Clock, 
  FileText, MessageCircle, CalendarClock, AlertTriangle, Upload,
  Image as ImageIcon, File, X
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import { format } from 'date-fns';

interface PhotoPreview {
  id: string;
  dataUrl: string;
  name?: string;
}

type TaskAction = 'accept' | 'decline' | 'complete' | 'chat' | null;

export default function TechnicianDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<TaskAction>(null);

  const [declineReason, setDeclineReason] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [workerReport, setWorkerReport] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<PhotoPreview[]>([]);
  const [chatMessage, setChatMessage] = useState('');

  const { data: tasksData, isLoading: tasksLoading } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const allTasks = (tasksData?.tasks || []).filter(
    (task: any) => task.assigned_to?.includes(user?.id) || task.external_company_id === user?.id
  );

  const newTasks = allTasks.filter((t: any) => 
    t.status !== 'completed' && t.status !== 'cancelled' && !t.estimated_arrival_time
  );
  const acceptedTasks = allTasks.filter((t: any) => 
    t.status !== 'completed' && t.status !== 'cancelled' && !!t.estimated_arrival_time
  );
  const completedTasks = allTasks.filter((t: any) => t.status === 'completed');

  const selectedTaskFromList = allTasks.find((t: any) => t.id === selectedTaskId);

  const { data: taskDetailData } = useQuery<{ task: any }>({
    queryKey: ['/api/tasks', selectedTaskId, 'detail'],
    enabled: !!selectedTaskId && isDialogOpen,
  });
  const selectedTask = taskDetailData?.task || selectedTaskFromList;

  const { data: messagesData, isLoading: messagesLoading } = useQuery<{ messages: any[] }>({
    queryKey: ['/api/tasks', selectedTaskId || '', 'messages'],
    enabled: !!selectedTaskId && isDialogOpen,
    refetchInterval: isDialogOpen ? 5000 : false,
  });

  const messages = messagesData?.messages || [];

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ taskId, message, document_name }: { taskId: string; message: string; document_name?: string }) => {
      const response = await apiRequest('POST', `/api/tasks/${taskId}/messages`, { message, document_name });
      const data = await response.json();
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', variables.taskId, 'messages'] });
    },
    retry: false,
  });

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDialogOpen(true);
    setCurrentAction(null);
    setDeclineReason('');
    setArrivalDate('');
    setArrivalTime('');
    setWorkerReport('');
    setUploadedPhotos([]);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTaskId(null);
    setCurrentAction(null);
  };

  const handleAcceptTask = async () => {
    if (!selectedTask || !arrivalDate || !arrivalTime) {
      toast({
        title: 'Greska',
        description: 'Morate unijeti datum i vrijeme dolaska.',
        variant: 'destructive',
      });
      return;
    }

    const arrivalDateTime = new Date(`${arrivalDate}T${arrivalTime}`);

    try {
      await updateTaskMutation.mutateAsync({
        taskId: selectedTask.id,
        data: {
          estimated_arrival_time: arrivalDateTime.toISOString(),
          worker_report: `Zadatak prihvacen. Planirani dolazak: ${format(arrivalDateTime, 'dd.MM.yyyy HH:mm')}`,
        },
      });

      await sendMessageMutation.mutateAsync({
        taskId: selectedTask.id,
        message: `Zadatak prihvacen. Planirani dolazak: ${format(arrivalDateTime, 'dd.MM.yyyy HH:mm')}`,
      });

      toast({ title: 'Uspjesno', description: 'Zadatak prihvacen.' });
      handleCloseDialog();
    } catch (error) {
      toast({ title: 'Greska', description: 'Doslo je do greske.', variant: 'destructive' });
    }
  };

  const handleDeclineTask = async () => {
    if (!selectedTask || !declineReason.trim()) {
      toast({
        title: 'Greska',
        description: 'Morate unijeti razlog odbijanja.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateTaskMutation.mutateAsync({
        taskId: selectedTask.id,
        data: {
          status: 'returned_to_sef',
          worker_report: `Zadatak odbijen. Razlog: ${declineReason}`,
        },
      });

      await sendMessageMutation.mutateAsync({
        taskId: selectedTask.id,
        message: `Zadatak odbijen. Razlog: ${declineReason}`,
      });

      toast({ title: 'Uspjesno', description: 'Zadatak odbijen i vracen.' });
      handleCloseDialog();
    } catch (error) {
      toast({ title: 'Greska', description: 'Doslo je do greske.', variant: 'destructive' });
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask || !workerReport.trim()) {
      toast({
        title: 'Greska',
        description: 'Morate unijeti izvjestaj o radu.',
        variant: 'destructive',
      });
      return;
    }

    const photoDataUrls = uploadedPhotos.map(p => p.dataUrl);

    try {
      await updateTaskMutation.mutateAsync({
        taskId: selectedTask.id,
        data: {
          status: 'completed',
          worker_report: workerReport,
          worker_images: photoDataUrls,
          actual_completion_time: new Date().toISOString(),
        },
      });

      toast({ title: 'Uspjesno', description: 'Zadatak zavrsen.' });
      handleCloseDialog();
    } catch (error) {
      toast({ title: 'Greska', description: 'Doslo je do greske.', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTaskId || !chatMessage.trim()) return;

    const messageText = chatMessage.trim();
    setChatMessage('');

    try {
      await sendMessageMutation.mutateAsync({
        taskId: selectedTaskId,
        message: messageText,
      });
    } catch (error: any) {
      console.error('[CHAT] Message send failed:', error);
      setChatMessage(messageText);
      toast({ title: 'Greska', description: 'Poruka nije poslata. Pokusajte ponovo.', variant: 'destructive' });
    }
  };

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedPhotos(prev => [...prev, {
          id: `photo-${Date.now()}-${Math.random()}`,
          dataUrl,
          name: file.name,
        }]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDocUpload = () => {
    docInputRef.current?.click();
  };

  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedTaskId) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        try {
          await sendMessageMutation.mutateAsync({
            taskId: selectedTaskId!,
            message: dataUrl,
            document_name: file.name,
          });
          toast({ title: 'Uspjesno', description: `Dokument "${file.name}" uploadovan.` });
        } catch (error) {
          toast({ title: 'Greska', description: 'Upload nije uspio.', variant: 'destructive' });
        }
      };
      reader.readAsDataURL(file);
    });

    if (docInputRef.current) docInputRef.current.value = '';
  };

  const removePhoto = (photoId: string) => {
    setUploadedPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="text-xs">Hitno</Badge>;
      case 'normal':
        return <Badge variant="default" className="text-xs">Normalno</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Moze sacekati</Badge>;
    }
  };

  const getStatusBadge = (task: any) => {
    if (task.status === 'completed') {
      return <Badge variant="outline" className="text-xs text-green-600 border-green-300">Zavrseno</Badge>;
    }
    if (task.estimated_arrival_time) {
      return <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">Prihvaceno</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Novo</Badge>;
  };

  const getElapsedTime = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    if (diffHours > 0) return `${diffHours}h ${remainingMins}m`;
    return `${diffMins}m`;
  };

  const renderTaskCard = (task: any) => (
    <Card 
      key={task.id} 
      className="cursor-pointer hover-elevate active-elevate-2"
      onClick={() => handleTaskClick(task.id)}
      data-testid={`card-task-${task.id}`}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{task.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {task.created_by_name || 'N/A'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {getPriorityBadge(task.priority)}
              {getStatusBadge(task)}
            </div>
          </div>
          
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
            {task.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{task.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{getElapsedTime(task.created_at)}</span>
            </div>
          </div>

          {task.estimated_arrival_time && task.status !== 'completed' && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <CalendarClock className="w-3 h-3" />
              <span>Dolazak: {format(new Date(task.estimated_arrival_time), 'dd.MM.yyyy HH:mm')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50 animate-pulse" />
          <p className="text-sm">Ucitavanje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-medium">Treca lica</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {user?.fullName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          title="Novi zadaci" 
          value={newTasks.length} 
          icon={AlertTriangle}
          iconColor="text-amber-500"
        />
        <StatCard 
          title="Prihvaceni" 
          value={acceptedTasks.length} 
          icon={CheckCircle}
          iconColor="text-blue-500"
        />
        <StatCard 
          title="Zavrseni" 
          value={completedTasks.length} 
          icon={CheckCircle}
          iconColor="text-green-500"
        />
        <StatCard 
          title="Ukupno" 
          value={allTasks.length} 
          icon={ClipboardList}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Moji zadaci</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="new" className="text-xs" data-testid="tab-new-tasks">
                Novi ({newTasks.length})
              </TabsTrigger>
              <TabsTrigger value="accepted" className="text-xs" data-testid="tab-accepted-tasks">
                Prihvaceni ({acceptedTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs" data-testid="tab-completed-tasks">
                Zavrseni ({completedTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {newTasks.length > 0 ? (
                    newTasks.map(renderTaskCard)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Nema novih zadataka</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="accepted" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {acceptedTasks.length > 0 ? (
                    acceptedTasks.map(renderTaskCard)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Nema prihvacenih zadataka</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {completedTasks.length > 0 ? (
                    completedTasks.map((task: any) => (
                      <Card 
                        key={task.id} 
                        className="cursor-pointer hover-elevate active-elevate-2"
                        onClick={() => handleTaskClick(task.id)}
                        data-testid={`card-task-${task.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{task.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {task.location}
                                {task.completed_at && ` | Zavrseno ${format(new Date(task.completed_at), 'dd.MM.yyyy')}`}
                              </p>
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Nema zavrsenih zadataka</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={docInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        multiple
        className="hidden"
        onChange={handleDocFileChange}
      />

      {/* Task Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-task-details">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">{selectedTask.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {getPriorityBadge(selectedTask.priority)}
                  {getStatusBadge(selectedTask)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Poslao:</span>
                    <p className="font-medium">{selectedTask.sef_name || selectedTask.operator_name || selectedTask.created_by_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Lokacija:</span>
                    <p className="font-medium">{selectedTask.location || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Kreirano:</span>
                    <p className="font-medium">{format(new Date(selectedTask.created_at), 'dd.MM.yyyy HH:mm')}</p>
                  </div>
                  {selectedTask.estimated_arrival_time && (
                    <div>
                      <span className="text-muted-foreground text-xs">Planirani dolazak:</span>
                      <p className="font-medium text-blue-600">
                        {format(new Date(selectedTask.estimated_arrival_time), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Opis:</span>
                  <p className="text-sm mt-1">{selectedTask.description}</p>
                </div>

                {selectedTask.images && selectedTask.images.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Slike reklamacije:</span>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {selectedTask.images.map((img: string, idx: number) => (
                        <img 
                          key={idx} 
                          src={img} 
                          alt={`Slika ${idx + 1}`} 
                          className="w-20 h-20 object-cover rounded-md border cursor-pointer"
                          onClick={() => window.open(img, '_blank')}
                          data-testid={`img-task-${idx}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* NEW TASK: Accept or Decline */}
                {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && !selectedTask.estimated_arrival_time && (
                  <div className="space-y-4 pt-3 border-t">
                    {currentAction === null && (
                      <div className="flex gap-3">
                        <Button 
                          className="flex-1 min-h-12"
                          onClick={() => setCurrentAction('accept')}
                          data-testid="button-accept-task"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Prihvati zadatak
                        </Button>
                        <Button 
                          variant="destructive"
                          className="flex-1 min-h-12"
                          onClick={() => setCurrentAction('decline')}
                          data-testid="button-decline-task"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Odbij zadatak
                        </Button>
                      </div>
                    )}

                    {currentAction === 'accept' && (
                      <div className="space-y-3 p-4 bg-muted/50 rounded-md">
                        <h3 className="font-medium text-sm">Planirani dolazak</h3>
                        <p className="text-xs text-muted-foreground">
                          Unesite datum i vrijeme kada planirate doci da otklonite reklamaciju.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="arrival-date" className="text-xs">Datum</Label>
                            <Input
                              id="arrival-date"
                              type="date"
                              value={arrivalDate}
                              onChange={(e) => setArrivalDate(e.target.value)}
                              data-testid="input-arrival-date"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="arrival-time" className="text-xs">Vrijeme</Label>
                            <Input
                              id="arrival-time"
                              type="time"
                              value={arrivalTime}
                              onChange={(e) => setArrivalTime(e.target.value)}
                              data-testid="input-arrival-time"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1"
                            onClick={handleAcceptTask}
                            disabled={updateTaskMutation.isPending || !arrivalDate || !arrivalTime}
                            data-testid="button-confirm-accept"
                          >
                            {updateTaskMutation.isPending ? 'Slanje...' : 'Potvrdi prihvatanje'}
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => setCurrentAction(null)}
                            data-testid="button-cancel-accept"
                          >
                            Odustani
                          </Button>
                        </div>
                      </div>
                    )}

                    {currentAction === 'decline' && (
                      <div className="space-y-3 p-4 bg-destructive/5 rounded-md">
                        <h3 className="font-medium text-sm">Razlog odbijanja</h3>
                        <Textarea
                          placeholder="Napisite razlog zasto odbijate ovaj zadatak..."
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          rows={3}
                          data-testid="textarea-decline-reason"
                        />
                        <div className="flex gap-2">
                          <Button 
                            variant="destructive"
                            className="flex-1"
                            onClick={handleDeclineTask}
                            disabled={updateTaskMutation.isPending || !declineReason.trim()}
                            data-testid="button-confirm-decline"
                          >
                            {updateTaskMutation.isPending ? 'Slanje...' : 'Potvrdi odbijanje'}
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => setCurrentAction(null)}
                            data-testid="button-cancel-decline"
                          >
                            Odustani
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ACCEPTED TASK: Complete + Receipt Confirmation */}
                {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && !!selectedTask.estimated_arrival_time && (
                  <div className="space-y-4 pt-3 border-t">
                    {/* Receipt / Invoice Paid Confirmation */}
                    <label
                      className={`flex items-center gap-3 p-4 rounded-md border-2 cursor-pointer transition-colors ${
                        selectedTask.receipt_confirmed_at
                          ? 'border-green-500 bg-green-50'
                          : 'border-dashed border-muted-foreground/30 hover:border-muted-foreground/50'
                      }`}
                      data-testid="label-receipt-confirmed"
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedTask.receipt_confirmed_at}
                        onChange={async () => {
                          if (selectedTask.receipt_confirmed_at) return;
                          try {
                            await updateTaskMutation.mutateAsync({
                              taskId: selectedTask.id,
                              data: {
                                receipt_confirmed_at: new Date().toISOString(),
                              },
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/tasks', selectedTaskId, 'detail'] });
                            toast({ title: 'Uspjesno', description: 'Potvrdjeno da je racun placen.' });
                          } catch (error) {
                            toast({ title: 'Greska', description: 'Nije moguce potvrditi.', variant: 'destructive' });
                          }
                        }}
                        disabled={!!selectedTask.receipt_confirmed_at || updateTaskMutation.isPending}
                        className="w-6 h-6 accent-green-600 cursor-pointer flex-shrink-0"
                        data-testid="checkbox-receipt-confirmed"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-sm">
                          {selectedTask.receipt_confirmed_at ? 'Racun placen' : 'Potvrdi da je racun placen'}
                        </span>
                        {selectedTask.receipt_confirmed_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Potvrdio: {selectedTask.receipt_confirmed_by_name || 'N/A'} - {format(new Date(selectedTask.receipt_confirmed_at), 'dd.MM.yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    </label>

                    {currentAction !== 'complete' && (
                      <div className="flex flex-col gap-2">
                        <Button 
                          className="w-full min-h-12"
                          onClick={() => setCurrentAction('complete')}
                          data-testid="button-start-complete"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Zavrsi zadatak
                        </Button>
                      </div>
                    )}

                    {currentAction === 'complete' && (
                      <div className="space-y-3 p-4 bg-muted/50 rounded-md">
                        <h3 className="font-medium text-sm">Izvjestaj o radu</h3>
                        
                        <div className="space-y-1">
                          <Label htmlFor="worker-report" className="text-xs">Opis izvrsenog posla</Label>
                          <Textarea
                            id="worker-report"
                            placeholder="Opisite sta je uradjeno, koji materijali su korisceni..."
                            value={workerReport}
                            onChange={(e) => setWorkerReport(e.target.value)}
                            rows={4}
                            data-testid="textarea-worker-report"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Fotografije</Label>
                          {uploadedPhotos.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {uploadedPhotos.map(photo => (
                                <div key={photo.id} className="relative">
                                  <img 
                                    src={photo.dataUrl} 
                                    alt={photo.name || 'Foto'} 
                                    className="w-16 h-16 object-cover rounded-md border"
                                  />
                                  <button
                                    onClick={() => removePhoto(photo.id)}
                                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                    data-testid={`button-remove-photo-${photo.id}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handlePhotoUpload}
                            data-testid="button-upload-photos"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Dodaj fotografije
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            className="flex-1"
                            onClick={handleCompleteTask}
                            disabled={updateTaskMutation.isPending || !workerReport.trim()}
                            data-testid="button-confirm-complete"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {updateTaskMutation.isPending ? 'Slanje...' : 'Zavrsi i posalji izvjestaj'}
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => setCurrentAction(null)}
                            data-testid="button-cancel-complete"
                          >
                            Odustani
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* COMPLETED TASK: View details */}
                {selectedTask.status === 'completed' && (
                  <div className="pt-3 border-t space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Zadatak zavrsen</span>
                    </div>
                    {selectedTask.worker_report && (
                      <div>
                        <span className="text-xs text-muted-foreground">Izvjestaj:</span>
                        <p className="text-sm mt-1">{selectedTask.worker_report}</p>
                      </div>
                    )}
                    {selectedTask.worker_images && selectedTask.worker_images.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">Fotografije:</span>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {selectedTask.worker_images.map((img: string, idx: number) => (
                            <img 
                              key={idx} 
                              src={img} 
                              alt={`Foto ${idx + 1}`} 
                              className="w-20 h-20 object-cover rounded-md border cursor-pointer"
                              onClick={() => window.open(img, '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* INLINE MESSAGES SECTION */}
                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Poruke</span>
                    {messages.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{messages.length}</Badge>
                    )}
                  </div>

                  <div 
                    ref={chatScrollRef}
                    className="space-y-2 max-h-[250px] overflow-y-auto pr-1"
                  >
                    {messagesLoading ? (
                      <div className="text-center text-muted-foreground text-xs py-4">
                        Ucitavanje poruka...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-muted-foreground text-xs py-4">
                        Nema poruka.
                      </div>
                    ) : (
                      messages.map((msg: any) => {
                        const isOwnMessage = msg.user_id === user?.id;
                        const isDocument = msg.action === 'document_uploaded';

                        return (
                          <div 
                            key={msg.id} 
                            className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                            data-testid={`message-${msg.id}`}
                          >
                            <span className="text-[10px] text-muted-foreground mb-0.5">
                              {msg.user_name} ({msg.user_role}) - {format(new Date(msg.timestamp), 'dd.MM. HH:mm')}
                            </span>
                            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                              isOwnMessage 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}>
                              {isDocument ? (
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-xs">{msg.assigned_to || 'Dokument'}</p>
                                    {msg.message.startsWith('data:') ? (
                                      <a 
                                        href={msg.message} 
                                        download={msg.assigned_to || 'dokument'}
                                        className="text-xs underline"
                                      >
                                        Preuzmi
                                      </a>
                                    ) : (
                                      <p className="text-xs">{msg.message}</p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p>{msg.message}</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Napisite poruku..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        rows={2}
                        className="flex-1 resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        data-testid="textarea-chat-message"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        className="flex-1"
                        onClick={handleSendMessage}
                        disabled={sendMessageMutation.isPending || !chatMessage.trim()}
                        data-testid="button-send-message"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sendMessageMutation.isPending ? 'Slanje...' : 'Posalji'}
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={handleDocUpload}
                        data-testid="button-upload-document"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Dokument
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
