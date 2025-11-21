import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Camera, Send, ClipboardList, MapPin, Clock } from 'lucide-react';
import StatCard from '@/components/StatCard';

interface Task {
  id: string;
  title: string;
  assignedBy: string;
  priority: 'urgent' | 'normal' | 'low';
  location: string;
  status: 'new' | 'accepted' | 'completed';
  description: string;
  specialNotes?: string;
  receivedAt: Date;
}

export default function TechnicianDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskReport, setTaskReport] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const allTasks: Task[] = [];

  const activeTasks = allTasks.filter(t => t.status === 'new');
  const inProgressTasks = allTasks.filter(t => t.status === 'accepted');
  const completedTasks = allTasks.filter(t => t.status === 'completed');

  const selectedTask = allTasks.find(t => t.id === selectedTaskId);

  const getElapsedTime = (receivedAt: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - receivedAt.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m`;
    }
    return `${diffMins}m`;
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDialogOpen(true);
    setTaskReport('');
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTaskId(null);
    setTaskReport('');
  };

  const renderTaskCard = (task: Task) => (
    <Card 
      key={task.id} 
      className="p-4 cursor-pointer hover-elevate active-elevate-2"
      onClick={() => handleTaskClick(task.id)}
      data-testid={`card-task-${task.id}`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-medium text-sm">{task.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              From: {task.assignedBy}
            </p>
          </div>
          <Badge 
            variant={
              task.priority === 'urgent' ? 'destructive' : 
              task.priority === 'normal' ? 'default' : 
              'secondary'
            }
            className="text-xs"
          >
            {task.priority === 'urgent' ? 'Hitno' : 
             task.priority === 'normal' ? 'Normalno' : 
             'Može Sačekati'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{task.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{getElapsedTime(task.receivedAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium">Technician Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {user?.fullName} - {user?.role}
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Active Tasks" 
          value={activeTasks.length} 
          icon={ClipboardList}
        />
        <StatCard 
          title="In Progress" 
          value={inProgressTasks.length} 
          icon={CheckCircle}
        />
        <StatCard 
          title="Completed Today" 
          value={completedTasks.length} 
          icon={CheckCircle}
        />
        <StatCard 
          title="Avg. Time per Task" 
          value="45 min" 
          icon={ClipboardList}
        />
      </div>

      {/* My Tasks with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="active" className="text-xs" data-testid="tab-active-tasks">
                Active Tasks
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="text-xs" data-testid="tab-in-progress">
                In Progress
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs" data-testid="tab-completed">
                Completed Today
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {activeTasks.length > 0 ? (
                    activeTasks.map(renderTaskCard)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No active tasks</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="in-progress" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {inProgressTasks.length > 0 ? (
                    inProgressTasks.map(renderTaskCard)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No tasks in progress</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {completedTasks.length > 0 ? (
                    completedTasks.map((task) => (
                      <Card 
                        key={task.id} 
                        className="p-4 cursor-pointer hover-elevate active-elevate-2"
                        onClick={() => handleTaskClick(task.id)}
                        data-testid={`card-task-${task.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {task.location} • Completed {getElapsedTime(task.receivedAt)} ago
                            </p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No completed tasks today</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-task-details">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Task Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={
                        selectedTask.priority === 'urgent' ? 'destructive' : 
                        selectedTask.priority === 'normal' ? 'default' : 
                        'secondary'
                      }
                    >
                      {selectedTask.priority === 'urgent' ? 'Hitno' : 
                       selectedTask.priority === 'normal' ? 'Normalno' : 
                       'Može Sačekati'}
                    </Badge>
                    <Badge variant="outline">
                      {selectedTask.status === 'new' ? 'New' :
                       selectedTask.status === 'accepted' ? 'In Progress' :
                       'Completed'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Assigned by:</span>
                      <p className="font-medium">{selectedTask.assignedBy}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{selectedTask.location}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time elapsed:</span>
                      <p className="font-medium">{getElapsedTime(selectedTask.receivedAt)}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Description:</span>
                    <p className="text-sm mt-1">{selectedTask.description}</p>
                  </div>

                  {selectedTask.specialNotes && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
                      <span className="text-sm font-medium">Special Note: </span>
                      <span className="text-sm">{selectedTask.specialNotes}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons for New Tasks */}
                {selectedTask.status === 'new' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      className="flex-1"
                      onClick={handleCloseDialog}
                      data-testid={`button-accept-task-${selectedTask.id}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept Task
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={handleCloseDialog}
                      data-testid={`button-decline-task-${selectedTask.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                )}

                {/* Task Report Section for Accepted Tasks */}
                {selectedTask.status === 'accepted' && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium">Task Report</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tech-report">Work Report</Label>
                      <Textarea
                        id="tech-report"
                        placeholder="Describe the work performed, parts used, time taken, etc."
                        value={taskReport}
                        onChange={(e) => setTaskReport(e.target.value)}
                        rows={6}
                        data-testid="textarea-tech-report"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Photos</Label>
                      <div className="border-2 border-dashed rounded-md p-6 text-center">
                        <Camera className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-3">
                          Upload before/after photos
                        </p>
                        <Button variant="outline" size="sm" data-testid="button-upload-photo">
                          <Camera className="w-4 h-4 mr-2" />
                          Upload Photo
                        </Button>
                      </div>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={handleCloseDialog}
                      data-testid={`button-submit-complete-${selectedTask.id}`}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit & Complete Task
                    </Button>
                  </div>
                )}

                {/* View Details for Completed Tasks */}
                {selectedTask.status === 'completed' && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-500 mb-4">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Task Completed</span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleCloseDialog}
                      data-testid="button-close-dialog"
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
